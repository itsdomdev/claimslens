export interface Env {
  ANTHROPIC_API_KEY: string
  ALLOWED_ORIGIN: string
}

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allowed = allowedOrigin.split(',').map((s) => s.trim())
  const isAllowed = allowed.includes(origin) || allowed.includes('*')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    const url = new URL(request.url)

    if (request.method === 'POST') {
      switch (url.pathname) {
        case '/api/analyze/claims':
        case '/api/analyze/factcheck':
        case '/api/analyze/reasoning':
          return new Response(
            JSON.stringify({ message: 'Worker stub — Claude API not configured' }),
            { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } },
          )
        case '/api/unfurl':
          return new Response(
            JSON.stringify({ message: 'URL unfurling not implemented' }),
            { status: 501, headers: { ...headers, 'Content-Type': 'application/json' } },
          )
      }
    }

    return new Response('Not found', { status: 404, headers })
  },
} satisfies ExportedHandler<Env>
