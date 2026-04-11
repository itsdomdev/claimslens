import type { SentimentResult, ToneLabel, FeatureWeight } from '../types/analysis'
import type { FeatureVector } from './features'
import { tokenize } from './tokenizer'
import { extractFeatures } from './features'
import { tokenPositions } from './tokenizer'
import sentimentWeightsRaw from './data/sentiment-weights.json'

const TONE_LABELS: ToneLabel[] = [
  'neutral', 'fear_appeal', 'urgency', 'outrage', 'flattery',
  'false_calm', 'manufactured_authority', 'sarcasm', 'empathy', 'celebration',
]

// Feature keys in order (must match weight vector order)
const FEATURE_KEYS: (keyof Omit<FeatureVector, 'tokenScores'>)[] = [
  'avgSentiment', 'minSentiment', 'maxSentiment', 'sentimentRange',
  'fearScore', 'urgencyScore', 'outrageScore',
  'flatteryScore', 'authorityScore', 'hedgingScore',
  'exclamationCount', 'questionCount', 'capsRatio', 'ellipsisCount',
  'avgWordLength', 'wordCount',
]

type WeightsMap = Record<string, number[]>
const sentimentWeights: WeightsMap = {}
for (const key of TONE_LABELS) {
  sentimentWeights[key] = (sentimentWeightsRaw as Record<string, unknown>)[key] as number[]
}

/**
 * Softmax function: converts raw scores to probability distribution.
 */
function softmax(values: number[]): number[] {
  const max = Math.max(...values)
  const exps = values.map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/**
 * Convert feature vector to a numeric array in the order expected by weights.
 */
function featureToArray(features: FeatureVector): number[] {
  return FEATURE_KEYS.map((key) => features[key] as number)
}

export class SentimentModel {
  private weights: Record<ToneLabel, number[]>

  constructor() {
    this.weights = {} as Record<ToneLabel, number[]>
    for (const tone of TONE_LABELS) {
      this.weights[tone] = sentimentWeights[tone] || new Array(FEATURE_KEYS.length).fill(0)
    }
  }

  /**
   * Run sentiment analysis on text.
   */
  predict(text: string): SentimentResult {
    const tokens = tokenize(text)
    const features = extractFeatures(tokens, text)
    return this.predictFromFeatures(features, text)
  }

  /**
   * Run sentiment analysis from pre-computed features.
   */
  predictFromFeatures(features: FeatureVector, rawText: string): SentimentResult {
    const featureArr = featureToArray(features)

    // Compute raw scores for each tone class (dot product)
    const rawScores: number[] = TONE_LABELS.map((tone) => {
      const w = this.weights[tone]
      return featureArr.reduce((sum, f, i) => sum + f * (w[i] || 0), 0)
    })

    // Softmax to get probability distribution
    const probs = softmax(rawScores)

    // Build tone scores map
    const toneScores = {} as Record<ToneLabel, number>
    let maxProb = 0
    let dominantTone: ToneLabel = 'neutral'

    for (let i = 0; i < TONE_LABELS.length; i++) {
      toneScores[TONE_LABELS[i]] = probs[i]
      if (probs[i] > maxProb) {
        maxProb = probs[i]
        dominantTone = TONE_LABELS[i]
      }
    }

    // Compute valence from lexicon (-1 to 1)
    const valence = Math.max(-1, Math.min(1, features.avgSentiment / 3))

    // Compute arousal (0 to 1) from emotional intensity signals
    const arousal = Math.min(1, Math.max(0,
      (features.exclamationCount * 0.15) +
      (features.capsRatio * 0.4) +
      (features.fearScore + features.urgencyScore + features.outrageScore) * 0.5 +
      (features.sentimentRange / 6) * 0.3
    ))

    // Get feature weights for transparency
    const featureWeights = this.getFeatureWeights(features, rawText, dominantTone)

    return {
      valence,
      arousal,
      dominantTone,
      toneScores,
      featureWeights,
    }
  }

  /**
   * Map per-token contributions back to character positions.
   */
  private getFeatureWeights(
    features: FeatureVector,
    rawText: string,
    dominantTone: ToneLabel,
  ): FeatureWeight[] {
    const positions = tokenPositions(rawText)
    const weights = this.weights[dominantTone]
    const result: FeatureWeight[] = []

    for (const pos of positions) {
      const tokenInfo = features.tokenScores.find((ts) => ts.token === pos.token)
      if (!tokenInfo) continue

      // Compute this token's contribution to the dominant tone
      let weight = 0
      let direction: ToneLabel = dominantTone

      // Lexicon contribution
      if (tokenInfo.score !== 0) {
        weight += tokenInfo.score * (weights[0] || 0) * 0.3 // avgSentiment weight
      }

      // Category contribution
      if (tokenInfo.category) {
        direction = tokenInfo.category
        const categoryMap: Record<string, number> = {
          fear_appeal: 4,
          urgency: 5,
          outrage: 6,
        }
        const categoryIndex = categoryMap[tokenInfo.category]
        if (categoryIndex !== undefined) {
          weight += (weights[categoryIndex] || 0) * 0.5
        }
      }

      if (Math.abs(weight) > 0.01) {
        result.push({
          token: pos.token,
          startIndex: pos.start,
          endIndex: pos.end,
          weight,
          direction,
        })
      }
    }

    return result
  }
}
