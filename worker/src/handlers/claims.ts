import type { Env } from '../index'

export async function handleClaims(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { text, sentences } = body as {
    text: string
    sentences: Array<{ id: string; text: string }>
  }

  if (!text || !sentences) {
    return new Response(JSON.stringify({ error: 'Missing text or sentences' }), { status: 400 })
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
      max_tokens: 4096,
      temperature: 0.2,
      system: `You are a claim extraction engine for social media text analysis. Extract every distinct claim, opinion, prediction, and assumption. Detect hedging language. Return JSON with a "claims" array. Each claim has: id, text, sentenceId, type (factual|opinion|prediction|assumption), hedging (null or {detected, hedgePhrase, effect}).`,
      messages: [
        {
          role: 'user',
          content: `Text: "${text}"\nSentences: ${JSON.stringify(sentences)}`,
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
