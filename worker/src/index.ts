import { corsHeaders } from './middleware/cors'
import { checkRateLimit } from './middleware/rateLimit'
import { handleClaims } from './handlers/claims'
import { handleFactCheck } from './handlers/factcheck'
import { handleReasoning } from './handlers/reasoning'

export interface Env {
  ANTHROPIC_API_KEY: string
  ALLOWED_ORIGIN: string
}

const MAX_BODY_SIZE = 10_000

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const url = new URL(request.url)

    if (request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers })
    }

    // Rate limiting
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retryAfter || 60),
          },
        },
      )
    }

    // Parse body
    let body: Record<string, unknown>
    try {
      const text = await request.text()
      if (text.length > MAX_BODY_SIZE) {
        return new Response(
          JSON.stringify({ error: 'Request body too large' }),
          { status: 413, headers: { ...headers, 'Content-Type': 'application/json' } },
        )
      }
      body = JSON.parse(text) as Record<string, unknown>
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } },
      )
    }

    // Route to handler
    let response: Response
    try {
      switch (url.pathname) {
        case '/api/analyze/claims':
          response = await handleClaims(body, env)
          break
        case '/api/analyze/factcheck':
          response = await handleFactCheck(body, env)
          break
        case '/api/analyze/reasoning':
          response = await handleReasoning(body, env)
          break
        case '/api/unfurl':
          response = new Response(
            JSON.stringify({ error: 'URL unfurling not implemented' }),
            { status: 501 },
          )
          break
        default:
          response = new Response('Not found', { status: 404 })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Internal error'
      response = new Response(
        JSON.stringify({ error: message }),
        { status: 500 },
      )
    }

    // Apply CORS headers
    const newHeaders = new Headers(response.headers)
    for (const [key, value] of Object.entries(headers)) {
      newHeaders.set(key, value)
    }
    if (!newHeaders.has('Content-Type')) {
      newHeaders.set('Content-Type', 'application/json')
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    })
  },
} satisfies ExportedHandler<Env>
