import type { Claim, FactCheckResult, Fallacy, FallacyType } from '../types/analysis'

/**
 * Strip markdown code fences from Claude responses.
 * Claude often wraps JSON in ```json ... ``` blocks.
 */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/m)
  if (match) return match[1].trim()
  return trimmed
}

/**
 * Parse claims from Claude's JSON response.
 */
export function parseClaims(raw: string): Claim[] {
  try {
    const data = JSON.parse(stripCodeFences(raw))
    const claims = data.claims || data
    if (!Array.isArray(claims)) {
      console.warn('[parseClaims] Expected array, got:', typeof claims)
      return []
    }
    return claims.map((c: Record<string, unknown>, i: number) => ({
      id: (c.id as string) || `c${i}`,
      text: (c.text as string) || '',
      sentenceId: (c.sentenceId as string) || 's0',
      type: (['factual', 'opinion', 'prediction', 'assumption'].includes(c.type as string)
        ? c.type
        : 'factual') as Claim['type'],
      hedging: c.hedging
        ? {
            detected: true,
            hedgePhrase: (c.hedging as Record<string, string>).hedgePhrase || '',
            effect: (c.hedging as Record<string, string>).effect || '',
          }
        : undefined,
    }))
  } catch (e) {
    console.warn('[parseClaims] Failed to parse JSON:', e)
    return []
  }
}

/**
 * Parse fact check results from Claude's JSON response.
 */
export function parseFactCheck(raw: string): FactCheckResult[] {
  try {
    const data = JSON.parse(stripCodeFences(raw))
    const results = data.results || data
    if (!Array.isArray(results)) {
      console.warn('[parseFactCheck] Expected array, got:', typeof results)
      return []
    }
    return results.map((r: Record<string, unknown>) => ({
      verdict: (['supported', 'contradicted', 'unverifiable', 'misleading', 'outdated'].includes(r.verdict as string)
        ? r.verdict
        : 'unverifiable') as FactCheckResult['verdict'],
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
      explanation: (r.explanation as string) || 'No explanation provided.',
      sources: Array.isArray(r.sources)
        ? (r.sources as Array<Record<string, string>>).map((s) => ({
            title: s.title || 'Unknown source',
            url: s.url || '',
            relevantQuote: s.relevantQuote || s.relevant_quote || '',
            supportType: (['supports', 'contradicts', 'partial'].includes(s.supportType || s.support_type || '')
              ? (s.supportType || s.support_type)
              : 'partial') as 'supports' | 'contradicts' | 'partial',
          }))
        : [],
      missingContext: (r.missingContext as string) || (r.missing_context as string) || undefined,
    }))
  } catch (e) {
    console.warn('[parseFactCheck] Failed to parse JSON:', e)
    return []
  }
}

/**
 * Parse fallacies from Claude's JSON response.
 */
export function parseFallacies(raw: string): { fallacies: Fallacy[]; summary: string } {
  try {
    const data = JSON.parse(stripCodeFences(raw))
    const fallacies = data.fallacies || []
    const summary = data.summary || ''

    if (!Array.isArray(fallacies)) {
      return { fallacies: [], summary }
    }

    return {
      fallacies: fallacies.map((f: Record<string, unknown>, i: number) => ({
        id: (f.id as string) || `f${i}`,
        type: ((f.type as string) || 'missing_context') as FallacyType,
        name: (f.name as string) || String(f.type || 'Unknown'),
        sentenceIds: Array.isArray(f.sentenceIds || f.sentence_ids)
          ? (f.sentenceIds || f.sentence_ids) as string[]
          : [],
        claimIds: Array.isArray(f.claimIds || f.claim_ids)
          ? (f.claimIds || f.claim_ids) as string[]
          : [],
        explanation: (f.explanation as string) || '',
        severity: (['minor', 'moderate', 'major'].includes(f.severity as string)
          ? f.severity
          : 'moderate') as Fallacy['severity'],
      })),
      summary,
    }
  } catch (e) {
    console.warn('[parseFallacies] Failed to parse JSON:', e)
    return { fallacies: [], summary: '' }
  }
}
