import type { IntentResult, IntentLabel, SentimentResult, FeatureWeight, StatedVsDetected } from '../types/analysis'
import type { FeatureVector } from './features'
import { tokenize } from './tokenizer'
import { extractFeatures } from './features'
import { tokenPositions } from './tokenizer'
import { getIntentCategory, INTENT_WORDS } from './vocabulary'
import intentWeightsRaw from './data/intent-weights.json'

const INTENT_LABELS: IntentLabel[] = [
  'inform', 'persuade', 'sell', 'mislead', 'deflect', 'provoke',
  'establish_authority', 'build_trust', 'create_urgency', 'virtue_signal',
  'concern_troll', 'entertain',
]

interface IntentWeights {
  inputToHidden: number[][]  // 32 x 20
  hiddenBias: number[]       // 32
  hiddenToOutput: number[][] // 12 x 32
  outputBias: number[]       // 12
}

const weights: IntentWeights = intentWeightsRaw as IntentWeights

// Stated intent detection patterns
const STATED_INTENT_PATTERNS: Array<{ patterns: string[]; stated: IntentLabel }> = [
  {
    patterns: ["i'm just asking", 'just curious', 'honest question', 'genuine question', 'just wondering', 'not trying to start'],
    stated: 'inform',
  },
  {
    patterns: ['not trying to sell', "this isn't an ad", 'not sponsored', 'not a promotion', 'no affiliate'],
    stated: 'inform',
  },
  {
    patterns: ["i don't want to scare", 'not trying to frighten', "don't panic but", 'not to alarm you'],
    stated: 'inform',
  },
  {
    patterns: ["i'm not racist but", "i'm not sexist but", "not to be rude but", 'no offense but', "i'm not saying"],
    stated: 'inform',
  },
  {
    patterns: ["i'm worried about", "i'm concerned about", 'my concern is', 'i just worry'],
    stated: 'inform',
  },
]

/**
 * Softmax function.
 */
function softmax(values: number[]): number[] {
  const max = Math.max(...values)
  const exps = values.map((v) => Math.exp(v - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

/**
 * ReLU activation function.
 */
function relu(x: number): number {
  return Math.max(0, x)
}

export class IntentModel {
  /**
   * Run intent classification on text.
   */
  predict(text: string, sentimentResult?: SentimentResult): IntentResult {
    const tokens = tokenize(text)
    const features = extractFeatures(tokens, text)
    return this.predictFromFeatures(features, sentimentResult, text)
  }

  /**
   * Run intent classification from pre-computed features.
   */
  predictFromFeatures(
    features: FeatureVector,
    sentimentResult: SentimentResult | undefined,
    rawText: string,
  ): IntentResult {
    const input = this.buildInputVector(features, sentimentResult)

    // Layer 1: input → hidden (32 units, ReLU)
    const hidden = new Array(32).fill(0)
    for (let h = 0; h < 32; h++) {
      let sum = weights.hiddenBias[h] || 0
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * (weights.inputToHidden[h]?.[i] || 0)
      }
      hidden[h] = relu(sum)
    }

    // Layer 2: hidden → output (12 intent classes, softmax)
    const rawScores = new Array(INTENT_LABELS.length).fill(0)
    for (let o = 0; o < INTENT_LABELS.length; o++) {
      let sum = weights.outputBias[o] || 0
      for (let h = 0; h < 32; h++) {
        sum += hidden[h] * (weights.hiddenToOutput[o]?.[h] || 0)
      }
      rawScores[o] = sum
    }

    const probs = softmax(rawScores)

    // Build distribution and find primary intent
    const distribution = {} as Record<IntentLabel, number>
    let maxProb = 0
    let primaryIntent: IntentLabel = 'inform'

    for (let i = 0; i < INTENT_LABELS.length; i++) {
      distribution[INTENT_LABELS[i]] = probs[i]
      if (probs[i] > maxProb) {
        maxProb = probs[i]
        primaryIntent = INTENT_LABELS[i]
      }
    }

    // Detect stated vs detected intent mismatch
    const tokens = tokenize(rawText, false)
    const statedVsDetected = this.getIntentMismatch(tokens, primaryIntent, maxProb, rawText)

    // Get feature weights
    const featureWeights = this.getFeatureWeights(features, rawText, primaryIntent)

    return {
      primaryIntent,
      confidence: maxProb,
      distribution,
      statedVsDetected: statedVsDetected || undefined,
      featureWeights,
    }
  }

  /**
   * Build the 20-dimension input vector from features and sentiment.
   */
  private buildInputVector(features: FeatureVector, sentiment?: SentimentResult): number[] {
    const tokens = features.tokenScores.map((ts) => ts.token)

    // Count intent-specific word categories
    const sellWords = tokens.filter((t) => INTENT_WORDS.sell?.includes(t)).length / Math.max(tokens.length, 1)
    const informWords = tokens.filter((t) => INTENT_WORDS.inform?.includes(t)).length / Math.max(tokens.length, 1)
    const provokeWords = tokens.filter((t) => INTENT_WORDS.provoke?.includes(t)).length / Math.max(tokens.length, 1)
    const virtueSignalWords = tokens.filter((t) => INTENT_WORDS.virtue_signal?.includes(t)).length / Math.max(tokens.length, 1)
    const authorityWords = tokens.filter((t) => INTENT_WORDS.authority?.includes(t)).length / Math.max(tokens.length, 1)

    return [
      features.avgSentiment,
      features.minSentiment,
      features.maxSentiment,
      features.sentimentRange,
      features.fearScore,
      features.urgencyScore,
      features.outrageScore,
      features.flatteryScore,
      features.authorityScore,
      features.hedgingScore,
      features.exclamationCount,
      features.questionCount,
      features.capsRatio,
      features.ellipsisCount,
      sellWords,
      informWords,
      provokeWords,
      virtueSignalWords,
      authorityWords,
      sentiment?.valence ?? 0,
    ]
  }

  /**
   * Detect mismatch between stated intent and detected intent.
   */
  private getIntentMismatch(
    _tokens: string[],
    detectedIntent: IntentLabel,
    confidence: number,
    rawText: string,
  ): StatedVsDetected | null {
    const lower = rawText.toLowerCase()

    for (const pattern of STATED_INTENT_PATTERNS) {
      const matched = pattern.patterns.find((p) => lower.includes(p))
      if (matched && pattern.stated !== detectedIntent && confidence > 0.15) {
        return {
          stated: pattern.stated,
          detected: detectedIntent,
          mismatchExplanation: `The phrase "${matched}" suggests the author claims to be ${pattern.stated}ing, but the detected intent is ${detectedIntent} (confidence: ${(confidence * 100).toFixed(0)}%).`,
        }
      }
    }

    return null
  }

  /**
   * Map per-token contributions to character positions.
   */
  private getFeatureWeights(
    features: FeatureVector,
    rawText: string,
    _primaryIntent: IntentLabel,
  ): FeatureWeight[] {
    const positions = tokenPositions(rawText)
    const result: FeatureWeight[] = []

    for (const pos of positions) {
      const category = getIntentCategory(pos.token)
      const tokenInfo = features.tokenScores.find((ts) => ts.token === pos.token)

      let weight = 0

      // Category word contribution
      if (category) {
        weight += 0.5
      }

      // Lexicon contribution
      if (tokenInfo && tokenInfo.score !== 0) {
        weight += Math.abs(tokenInfo.score) * 0.1
      }

      if (weight > 0.05) {
        result.push({
          token: pos.token,
          startIndex: pos.start,
          endIndex: pos.end,
          weight,
          direction: tokenInfo?.category || 'neutral',
        })
      }
    }

    return result
  }
}
