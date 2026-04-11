import type { SentenceAnalysis, Claim, Fallacy, SentimentResult, IntentResult, Sentence } from '../types/analysis'

/**
 * Merge analysis results from all 5 layers into unified SentenceAnalysis objects.
 */
export function mergeLayers(
  sentences: Sentence[],
  sentimentResults: SentimentResult[],
  intentResults: IntentResult[],
  claims: Claim[],
  fallacies: Fallacy[],
): SentenceAnalysis[] {
  return sentences.map((sentence, i) => {
    const sentenceClaims = claims.filter((c) => c.sentenceId === sentence.id)
    const sentenceFallacies = fallacies.filter((f) => f.sentenceIds.includes(sentence.id))

    return {
      id: sentence.id,
      text: sentence.text,
      startIndex: sentence.startIndex,
      endIndex: sentence.endIndex,
      sentiment: sentimentResults[i] || defaultSentiment(),
      intent: intentResults[i] || defaultIntent(),
      claims: sentenceClaims,
      fallacies: sentenceFallacies,
    }
  })
}

function defaultSentiment(): SentimentResult {
  return {
    valence: 0,
    arousal: 0,
    dominantTone: 'neutral',
    toneScores: {
      neutral: 1, fear_appeal: 0, urgency: 0, outrage: 0, flattery: 0,
      false_calm: 0, manufactured_authority: 0, sarcasm: 0, empathy: 0, celebration: 0,
    },
    featureWeights: [],
  }
}

function defaultIntent(): IntentResult {
  return {
    primaryIntent: 'inform',
    confidence: 0,
    distribution: {
      inform: 1, persuade: 0, sell: 0, mislead: 0, deflect: 0, provoke: 0,
      establish_authority: 0, build_trust: 0, create_urgency: 0,
      virtue_signal: 0, concern_troll: 0, entertain: 0,
    },
    featureWeights: [],
  }
}
