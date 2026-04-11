import type { Claim, FactCheckResult, Fallacy } from '../types/analysis'

/**
 * Mock Claude API responses for development and testing.
 * These simulate realistic analysis results for the 3 example posts.
 */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract mock claims from text based on heuristics.
 * Returns reasonable mock claims for any input text.
 */
export async function mockExtractClaims(
  text: string,
  sentences: Array<{ id: string; text: string }>,
): Promise<Claim[]> {
  await delay(800 + Math.random() * 400)

  const claims: Claim[] = []
  let claimIndex = 0

  for (const sentence of sentences) {
    const lower = sentence.text.toLowerCase()

    // Detect factual-sounding claims (contains numbers, statistics, proper nouns)
    if (/\d+%|\$\d|million|billion|trillion|\d+ (people|cases|deaths|jobs)/.test(lower)) {
      claims.push({
        id: `c${claimIndex++}`,
        text: sentence.text.replace(/^(BREAKING:|ALERT:)\s*/i, ''),
        sentenceId: sentence.id,
        type: 'factual',
        hedging: /studies show|research shows|experts say|some say|reportedly|allegedly/.test(lower)
          ? {
              detected: true,
              hedgePhrase: lower.match(/(studies show|research shows|experts say|some say|reportedly|allegedly)/)?.[0] || '',
              effect: 'Appeals to unnamed sources without specific citations',
            }
          : undefined,
      })
    }
    // Detect opinions
    else if (/worst|best|should|must|need to|disgrac|unacceptable|outrageous|amazing|terrible/.test(lower)) {
      claims.push({
        id: `c${claimIndex++}`,
        text: sentence.text,
        sentenceId: sentence.id,
        type: 'opinion',
      })
    }
    // Detect predictions
    else if (/will (cause|lead|result|destroy|collapse|change)|going to|inevitable|soon/.test(lower)) {
      claims.push({
        id: `c${claimIndex++}`,
        text: sentence.text,
        sentenceId: sentence.id,
        type: 'prediction',
      })
    }
    // Detect hedged claims
    else if (/studies show|research shows|experts|some say|it's believed|many people/.test(lower)) {
      claims.push({
        id: `c${claimIndex++}`,
        text: sentence.text,
        sentenceId: sentence.id,
        type: 'factual',
        hedging: {
          detected: true,
          hedgePhrase: lower.match(/(studies show|research shows|experts say|some say|it's believed|many people)/)?.[0] || 'hedged language',
          effect: 'Uses vague attribution to present unverified claims as established fact',
        },
      })
    }
  }

  // Ensure at least one claim for non-trivial text
  if (claims.length === 0 && sentences.length > 0 && text.length > 30) {
    claims.push({
      id: 'c0',
      text: sentences[0].text,
      sentenceId: sentences[0].id,
      type: 'opinion',
    })
  }

  return claims
}

/**
 * Mock fact-check results for claims.
 */
export async function mockFactCheck(
  claims: Claim[],
  _originalText: string,
): Promise<FactCheckResult[]> {
  await delay(1500 + Math.random() * 500)

  return claims.map((claim) => {
    const lower = claim.text.toLowerCase()

    // Opinions and predictions are unverifiable
    if (claim.type === 'opinion' || claim.type === 'prediction') {
      return {
        verdict: 'unverifiable' as const,
        confidence: 0.9,
        explanation: `This is a ${claim.type}, not a verifiable factual claim.`,
        sources: [],
      }
    }

    // Claims with extreme numbers are likely misleading
    if (/\d{3,}%|200%|300%|500%/.test(lower)) {
      return {
        verdict: 'misleading' as const,
        confidence: 0.75,
        explanation: 'While this statistic may be technically accurate for a narrow time period or category, it lacks crucial context about the baseline, methodology, and broader trend.',
        sources: [
          {
            title: 'Statistical Context Analysis',
            url: 'https://example.com/stats',
            relevantQuote: 'Statistics without baseline comparisons can be misleading',
            supportType: 'partial' as const,
          },
        ],
        missingContext: 'The statistic cherry-picks a specific time period and category without comparing to historical averages or broader trends.',
      }
    }

    // Health claims with hedging are often misleading
    if (claim.hedging?.detected && /health|cure|treat|cancer|disease|immune|natural/.test(lower)) {
      return {
        verdict: 'contradicted' as const,
        confidence: 0.8,
        explanation: 'This health claim is not supported by peer-reviewed medical research and contradicts established scientific consensus.',
        sources: [
          {
            title: 'Medical Research Review',
            url: 'https://example.com/medical',
            relevantQuote: 'No credible evidence supports this claim',
            supportType: 'contradicts' as const,
          },
        ],
      }
    }

    // Claims with hedging are suspicious
    if (claim.hedging?.detected) {
      return {
        verdict: 'misleading' as const,
        confidence: 0.65,
        explanation: 'The vague attribution makes this claim difficult to verify. The specific sources referenced could not be identified.',
        sources: [],
        missingContext: 'No specific studies or experts are cited, making verification impossible.',
      }
    }

    // Default: partially supported
    return {
      verdict: 'supported' as const,
      confidence: 0.6,
      explanation: 'This claim appears to be broadly consistent with available information, though specific details could not be fully verified.',
      sources: [
        {
          title: 'General Reference',
          url: 'https://example.com/ref',
          relevantQuote: 'Consistent with publicly available data',
          supportType: 'supports' as const,
        },
      ],
    }
  })
}

/**
 * Mock reasoning/fallacy analysis.
 */
export async function mockAnalyzeReasoning(
  text: string,
  sentences: Array<{ id: string; text: string }>,
  claims: Array<{ id: string; text: string; sentenceId: string }>,
): Promise<{ fallacies: Fallacy[]; summary: string }> {
  await delay(1200 + Math.random() * 500)

  const fallacies: Fallacy[] = []
  let fallacyIndex = 0
  const lower = text.toLowerCase()

  // Detect false dichotomy
  if (/either.+or|you're either|it's either|there are only two|only option/.test(lower)) {
    const sentenceId = sentences.find((s) => /either|only option/.test(s.text.toLowerCase()))?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'false_dichotomy',
      name: 'False Dichotomy',
      sentenceIds: [sentenceId],
      claimIds: claims.filter((c) => c.sentenceId === sentenceId).map((c) => c.id),
      explanation: 'This presents a binary choice while ignoring viable alternatives. Most complex issues have more than two possible outcomes or approaches.',
      severity: 'major',
    })
  }

  // Detect appeal to authority / manufactured authority
  if (/experts (say|agree|believe)|studies show|science (says|shows)|research (shows|proves)/.test(lower)) {
    const sentenceId = sentences.find((s) => /experts|studies show|science|research/.test(s.text.toLowerCase()))?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'appeal_to_authority',
      name: 'Appeal to Authority',
      sentenceIds: [sentenceId],
      claimIds: claims.filter((c) => c.sentenceId === sentenceId).map((c) => c.id),
      explanation: 'Appeals to unnamed "experts" or "studies" without citing specific sources. Legitimate authority claims reference specific researchers, institutions, or publications.',
      severity: 'moderate',
    })
  }

  // Detect anecdotal evidence
  if (/i personally|my experience|i know someone|happened to me|i've seen|my friend/.test(lower)) {
    const sentenceId = sentences.find((s) => /personally|my experience|i know|happened to me/.test(s.text.toLowerCase()))?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'anecdotal_evidence',
      name: 'Anecdotal Evidence',
      sentenceIds: [sentenceId],
      claimIds: claims.filter((c) => c.sentenceId === sentenceId).map((c) => c.id),
      explanation: 'Personal experience is presented as evidence for a general claim. Individual anecdotes cannot establish trends or prove general assertions.',
      severity: 'minor',
    })
  }

  // Detect fear-based slippery slope
  if (/will (destroy|collapse|ruin|end)|lead to (chaos|disaster|destruction)|if we don't act/.test(lower)) {
    const sentenceId = sentences.find((s) =>
      /destroy|collapse|ruin|chaos|disaster/.test(s.text.toLowerCase()),
    )?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'slippery_slope',
      name: 'Slippery Slope',
      sentenceIds: [sentenceId],
      claimIds: claims.filter((c) => c.sentenceId === sentenceId).map((c) => c.id),
      explanation: 'Claims extreme consequences will follow without establishing the causal chain between the current situation and the predicted outcome.',
      severity: 'moderate',
    })
  }

  // Detect ad hominem
  if (/these (people|idiots|clowns|fools)|they're (stupid|corrupt|evil)|wake up/.test(lower)) {
    const sentenceId = sentences.find((s) =>
      /people|idiots|clowns|fools|stupid|corrupt|wake up/.test(s.text.toLowerCase()),
    )?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'ad_hominem',
      name: 'Ad Hominem',
      sentenceIds: [sentenceId],
      claimIds: [],
      explanation: 'Attacks the character of unnamed opponents rather than addressing their arguments or positions.',
      severity: 'minor',
    })
  }

  // Detect hasty generalization
  if (/everyone knows|all (people|of them)|nobody (can|will|wants)|always|never/.test(lower)) {
    const sentenceId = sentences.find((s) =>
      /everyone|nobody|always|never/.test(s.text.toLowerCase()),
    )?.id || 's0'
    fallacies.push({
      id: `f${fallacyIndex++}`,
      type: 'hasty_generalization',
      name: 'Hasty Generalization',
      sentenceIds: [sentenceId],
      claimIds: [],
      explanation: 'Makes a broad generalization without sufficient evidence to support such a sweeping claim.',
      severity: 'minor',
    })
  }

  const summary = fallacies.length === 0
    ? 'No significant logical fallacies detected. The reasoning appears sound.'
    : `Found ${fallacies.length} reasoning issue${fallacies.length === 1 ? '' : 's'}: ${fallacies.map((f) => f.name).join(', ')}.`

  return { fallacies, summary }
}
