import type {
  AnalysisInput, AnalysisResult, ProgressCallback,
  SentimentResult, IntentResult, Claim, Fallacy,
} from '../types/analysis'
import { splitSentences, normalizeText } from './preprocessor'
import { mergeLayers } from './merger'
import { computeManipulationScore, computeRhetoricalGrade } from './scorer'
import { SentimentModel } from '../models/sentiment'
import { IntentModel } from '../models/intent'
import { ClaimsLensAPI } from '../api/client'
import { tokenize } from '../models/tokenizer'
import { extractFeatures } from '../models/features'

export class AnalysisOrchestrator {
  private sentimentModel: SentimentModel
  private intentModel: IntentModel
  private api: ClaimsLensAPI

  constructor(
    sentimentModel?: SentimentModel,
    intentModel?: IntentModel,
    api?: ClaimsLensAPI,
  ) {
    this.sentimentModel = sentimentModel || new SentimentModel()
    this.intentModel = intentModel || new IntentModel()
    this.api = api || new ClaimsLensAPI()
  }

  async analyze(input: AnalysisInput, onProgress?: ProgressCallback): Promise<AnalysisResult> {
    // 1. Preprocess
    const normalizedText = normalizeText(input.text)
    const sentences = splitSentences(normalizedText)
    if (sentences.length === 0) {
      throw new Error('No sentences could be extracted from the input text.')
    }

    // 2. Local models (instant)
    const sentimentResults: SentimentResult[] = []
    const intentResults: IntentResult[] = []

    for (const sentence of sentences) {
      const tokens = tokenize(sentence.text)
      const features = extractFeatures(tokens, sentence.text)
      const sentiment = this.sentimentModel.predictFromFeatures(features, sentence.text)
      const intent = this.intentModel.predictFromFeatures(features, sentiment, sentence.text)
      sentimentResults.push(sentiment)
      intentResults.push(intent)
    }

    const sentenceAnalyses = mergeLayers(sentences, sentimentResults, intentResults, [], [])

    onProgress?.({
      stage: 'local_complete',
      sentences: sentenceAnalyses,
    })

    // 3. Claim extraction (API)
    let claims: Claim[] = []
    try {
      claims = await this.api.extractClaims(
        normalizedText,
        sentences.map((s) => ({ id: s.id, text: s.text })),
      )
    } catch (e) {
      console.error('[orchestrator] Claim extraction failed:', e)
    }

    const withClaims = mergeLayers(sentences, sentimentResults, intentResults, claims, [])
    onProgress?.({
      stage: 'claims_complete',
      sentences: withClaims,
      claims,
    })

    // 4. Fact verification (API)
    if (claims.length > 0) {
      try {
        const factCheckResults = await this.api.factCheck(
          claims.map((c) => ({ id: c.id, text: c.text, type: c.type })),
          normalizedText,
        )
        // Attach fact check results to claims
        for (let i = 0; i < claims.length && i < factCheckResults.length; i++) {
          claims[i].factCheck = factCheckResults[i]
        }
      } catch (e) {
        console.error('[orchestrator] Fact checking failed:', e)
      }
    }

    const withFactCheck = mergeLayers(sentences, sentimentResults, intentResults, claims, [])
    onProgress?.({
      stage: 'factcheck_complete',
      sentences: withFactCheck,
      claims,
    })

    // 5. Reasoning analysis (API)
    let fallacies: Fallacy[] = []
    try {
      const reasoning = await this.api.analyzeReasoning(
        normalizedText,
        sentences.map((s) => ({ id: s.id, text: s.text })),
        claims.map((c) => ({ id: c.id, text: c.text, sentenceId: c.sentenceId })),
      )
      fallacies = reasoning.fallacies
    } catch (e) {
      console.error('[orchestrator] Reasoning analysis failed:', e)
    }

    const finalSentences = mergeLayers(sentences, sentimentResults, intentResults, claims, fallacies)
    onProgress?.({
      stage: 'reasoning_complete',
      sentences: finalSentences,
      fallacies,
    })

    // 6. Scoring
    const manipulationScore = computeManipulationScore(finalSentences, claims, fallacies)
    const rhetoricalGrade = computeRhetoricalGrade(manipulationScore, claims, fallacies)

    // Determine dominant intent across all sentences
    const intentCounts = new Map<string, number>()
    for (const ir of intentResults) {
      intentCounts.set(ir.primaryIntent, (intentCounts.get(ir.primaryIntent) || 0) + 1)
    }
    let dominantIntent = intentResults[0]?.primaryIntent || 'inform'
    let maxCount = 0
    for (const [intent, count] of intentCounts) {
      if (count > maxCount) {
        maxCount = count
        dominantIntent = intent as typeof dominantIntent
      }
    }

    // Claims by verdict
    const claimsByVerdict: Record<string, number> = {}
    for (const claim of claims) {
      const verdict = claim.factCheck?.verdict || 'pending'
      claimsByVerdict[verdict] = (claimsByVerdict[verdict] || 0) + 1
    }

    const result: AnalysisResult = {
      id: crypto.randomUUID(),
      input: { ...input, metadata: { ...input.metadata } },
      sentences: finalSentences,
      claims,
      fallacies,
      summary: {
        totalClaims: claims.length,
        claimsByVerdict,
        dominantIntent,
        manipulationScore,
        fallacyCount: fallacies.length,
        rhetoricalGrade,
        oneSentenceSummary: generateSummary(claims, fallacies, rhetoricalGrade),
      },
      timestamp: new Date().toISOString(),
    }

    onProgress?.({
      stage: 'complete',
      result,
    })

    return result
  }
}

function generateSummary(claims: Claim[], fallacies: Fallacy[], grade: string): string {
  const claimCount = claims.length
  const falseCount = claims.filter((c) => c.factCheck?.verdict === 'contradicted').length
  const misleadingCount = claims.filter((c) => c.factCheck?.verdict === 'misleading').length
  const fallacyCount = fallacies.length

  if (grade === 'A') {
    return `Clean analysis: ${claimCount} claim${claimCount === 1 ? '' : 's'} found, no significant issues detected.`
  }

  const issues: string[] = []
  if (falseCount > 0) issues.push(`${falseCount} false claim${falseCount === 1 ? '' : 's'}`)
  if (misleadingCount > 0) issues.push(`${misleadingCount} misleading claim${misleadingCount === 1 ? '' : 's'}`)
  if (fallacyCount > 0) issues.push(`${fallacyCount} logical fallac${fallacyCount === 1 ? 'y' : 'ies'}`)

  return `Found ${issues.join(', ')} across ${claimCount} extracted claim${claimCount === 1 ? '' : 's'}.`
}
