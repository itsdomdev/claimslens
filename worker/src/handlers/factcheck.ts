import type { Env } from '../index'

export async function handleFactCheck(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { claims, originalText } = body as {
    claims: Array<{ id: string; text: string; type: string }>
    originalText: string
  }

  if (!claims || !originalText) {
    return new Response(JSON.stringify({ error: 'Missing claims or originalText' }), { status: 400 })
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
      temperature: 0.1,
      system: `You are a fact-checking engine. For each claim, determine accuracy: supported, contradicted, misleading (technically true but missing context), unverifiable, or outdated. Use web search for factual claims. Return JSON with "results" array. Each result has: verdict, confidence (0-1), explanation, sources [{title, url, relevantQuote, supportType}], missingContext (for misleading only).`,
      messages: [
        {
          role: 'user',
          content: `Original text: "${originalText}"\n\nClaims to fact-check:\n${JSON.stringify(claims, null, 2)}`,
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
