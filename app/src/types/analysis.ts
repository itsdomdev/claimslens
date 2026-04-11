// ── Tone & Sentiment ──────────────────────────────────────────────

export type ToneLabel =
  | 'neutral'
  | 'fear_appeal'
  | 'urgency'
  | 'outrage'
  | 'flattery'
  | 'false_calm'
  | 'manufactured_authority'
  | 'sarcasm'
  | 'empathy'
  | 'celebration'

export interface FeatureWeight {
  token: string
  startIndex: number
  endIndex: number
  weight: number
  direction: ToneLabel
}

export interface SentimentResult {
  valence: number           // -1 to 1
  arousal: number           // 0 to 1 (calm → intense)
  dominantTone: ToneLabel
  toneScores: Record<ToneLabel, number>
  featureWeights: FeatureWeight[]
}

// ── Intent ────────────────────────────────────────────────────────

export type IntentLabel =
  | 'inform'
  | 'persuade'
  | 'sell'
  | 'mislead'
  | 'deflect'
  | 'provoke'
  | 'establish_authority'
  | 'build_trust'
  | 'create_urgency'
  | 'virtue_signal'
  | 'concern_troll'
  | 'entertain'

export interface StatedVsDetected {
  stated: IntentLabel
  detected: IntentLabel
  mismatchExplanation: string
}

export interface IntentResult {
  primaryIntent: IntentLabel
  confidence: number
  distribution: Record<IntentLabel, number>
  statedVsDetected?: StatedVsDetected
  featureWeights: FeatureWeight[]
}

// ── Claims ────────────────────────────────────────────────────────

export type ClaimType = 'factual' | 'opinion' | 'prediction' | 'assumption'

export interface Hedging {
  detected: boolean
  hedgePhrase: string
  effect: string
}

export type Verdict = 'supported' | 'contradicted' | 'unverifiable' | 'misleading' | 'outdated'

export interface Source {
  title: string
  url: string
  relevantQuote: string
  supportType: 'supports' | 'contradicts' | 'partial'
}

export interface FactCheckResult {
  verdict: Verdict
  confidence: number
  explanation: string
  sources: Source[]
  missingContext?: string
}

export interface Claim {
  id: string
  text: string
  sentenceId: string
  type: ClaimType
  hedging?: Hedging
  factCheck?: FactCheckResult
}

// ── Fallacies ─────────────────────────────────────────────────────

export type FallacyType =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dichotomy'
  | 'slippery_slope'
  | 'appeal_to_authority'
  | 'whataboutism'
  | 'circular_reasoning'
  | 'moving_goalposts'
  | 'cherry_picking'
  | 'false_equivalence'
  | 'anecdotal_evidence'
  | 'burden_of_proof_reversal'
  | 'red_herring'
  | 'tu_quoque'
  | 'hasty_generalization'
  | 'loaded_question'
  | 'texas_sharpshooter'
  | 'unsupported_causal'
  | 'missing_context'
  | 'motte_and_bailey'

export type FallacySeverity = 'minor' | 'moderate' | 'major'

export interface Fallacy {
  id: string
  type: FallacyType
  name: string
  sentenceIds: string[]
  claimIds: string[]
  explanation: string
  severity: FallacySeverity
}

// ── Sentence ──────────────────────────────────────────────────────

export interface Sentence {
  id: string
  text: string
  startIndex: number
  endIndex: number
}

export interface SentenceAnalysis {
  id: string
  text: string
  startIndex: number
  endIndex: number
  sentiment: SentimentResult
  intent: IntentResult
  claims: Claim[]
  fallacies: Fallacy[]
}

// ── Full Result ───────────────────────────────────────────────────

export type RhetoricalGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AnalysisSummary {
  totalClaims: number
  claimsByVerdict: Record<string, number>
  dominantIntent: IntentLabel
  manipulationScore: number     // 0-100
  fallacyCount: number
  rhetoricalGrade: RhetoricalGrade
  oneSentenceSummary: string
}

export interface AnalysisInput {
  text: string
  source: 'paste' | 'url' | 'screenshot'
  sourceUrl?: string
  metadata?: {
    platform?: 'twitter' | 'threads' | 'linkedin' | 'reddit' | 'instagram' | 'other'
    author?: string
    date?: string
  }
}

export interface AnalysisResult {
  id: string
  input: AnalysisInput
  sentences: SentenceAnalysis[]
  claims: Claim[]
  fallacies: Fallacy[]
  summary: AnalysisSummary
  timestamp: string
}

// ── Analysis Layers ───────────────────────────────────────────────

export type LayerName = 'sentiment' | 'intent' | 'claims' | 'factcheck' | 'fallacies'

// ── Progress ──────────────────────────────────────────────────────

export type AnalysisStage =
  | 'idle'
  | 'preprocessing'
  | 'local_complete'
  | 'claims_complete'
  | 'factcheck_complete'
  | 'reasoning_complete'
  | 'complete'
  | 'error'

export interface ProgressUpdate {
  stage: AnalysisStage
  sentences?: SentenceAnalysis[]
  claims?: Claim[]
  fallacies?: Fallacy[]
  result?: AnalysisResult
  error?: string
}

export type ProgressCallback = (update: ProgressUpdate) => void
