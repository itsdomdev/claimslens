import type { Env } from '../index'

export async function handleUnfurl(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { url } = body as { url: string }

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL format' }), { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.1,
      system: 'You are a social media post extractor. Given a URL, fetch and extract the main post text content. Return JSON: { "text": "the post text", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. If you cannot access the URL or extract text, return { "error": "description" }.',
      messages: [
        { role: 'user', content: `Extract the social media post text from this URL: ${url}` },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: `Claude API error: ${response.status}`, details: err }), { status: 502 })
  }

  const data = (await response.json()) as { content: Array<{ text: string }> }
  const content = data.content?.[0]?.text || '{}'

  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
