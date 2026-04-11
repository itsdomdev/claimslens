import type { Env } from '../index'

export async function handleReasoning(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { text, sentences, claims } = body as {
    text: string
    sentences: Array<{ id: string; text: string }>
    claims: Array<{ id: string; text: string; sentenceId: string }>
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
      system: `You are a logical fallacy and reasoning analysis engine. Detect fallacies from this taxonomy: ad_hominem, straw_man, false_dichotomy, slippery_slope, appeal_to_authority, whataboutism, circular_reasoning, moving_goalposts, cherry_picking, false_equivalence, anecdotal_evidence, burden_of_proof_reversal, red_herring, tu_quoque, hasty_generalization, loaded_question, texas_sharpshooter, unsupported_causal, missing_context, motte_and_bailey. Only flag what you can explain with specific text. If confidence <70%, don't flag. Return JSON with "fallacies" array [{id, type, name, sentenceIds, claimIds, explanation, severity (minor|moderate|major)}] and "summary" string.`,
      messages: [
        {
          role: 'user',
          content: `Text: "${text}"\n\nSentences: ${JSON.stringify(sentences)}\n\nExtracted claims: ${JSON.stringify(claims || [])}`,
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
