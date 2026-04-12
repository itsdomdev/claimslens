import type { Env } from '../index'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

export async function handleOcr(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { image, mimeType } = body as { image: string; mimeType: string }

  if (!image || !mimeType) {
    return new Response(JSON.stringify({ error: 'Missing image or mimeType' }), { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return new Response(JSON.stringify({ error: `Unsupported image type: ${mimeType}. Use PNG, JPEG, or WebP.` }), { status: 400 })
  }

  const estimatedBytes = Math.ceil(image.length * 0.75)
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ error: 'Image exceeds 5MB limit' }), { status: 413 })
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
      system: 'You are a social media screenshot text extractor. Extract all visible text from this screenshot of a social media post. Return JSON: { "text": "the post text content only, not UI chrome", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. Extract only the post content — ignore navigation, buttons, like counts, and other UI elements.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Extract the social media post text from this screenshot.',
            },
          ],
        },
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
