import type { SentenceAnalysis, Claim, Fallacy, RhetoricalGrade } from '../types/analysis'

/**
 * Compute a manipulation score from 0-100 based on combined analysis signals.
 *
 * Weights:
 * - Emotional manipulation (arousal + fear/urgency/outrage): 30%
 * - Intent mismatch (stated vs detected): 15%
 * - False/misleading claims ratio: 30%
 * - Fallacy count and severity: 25%
 */
export function computeManipulationScore(
  sentences: SentenceAnalysis[],
  claims: Claim[],
  fallacies: Fallacy[],
): number {
  if (sentences.length === 0) return 0

  // 1. Emotional manipulation score (0-1)
  const emotionalScores = sentences.map((s) => {
    const manipulativeTones = ['fear_appeal', 'urgency', 'outrage', 'flattery', 'manufactured_authority', 'false_calm'] as const
    const toneScore = manipulativeTones.reduce(
      (sum, tone) => sum + (s.sentiment.toneScores[tone] || 0),
      0,
    )
    return Math.min(1, toneScore + s.sentiment.arousal * 0.3)
  })
  const avgEmotional = emotionalScores.reduce((a, b) => a + b, 0) / emotionalScores.length

  // 2. Intent mismatch score (0-1)
  const mismatchCount = sentences.filter((s) => s.intent.statedVsDetected).length
  const intentMismatch = Math.min(1, mismatchCount / Math.max(sentences.length, 1) * 3)

  // 3. False/misleading claims ratio (0-1)
  const factualClaims = claims.filter((c) => c.type === 'factual' && c.factCheck)
  const badClaims = factualClaims.filter((c) =>
    c.factCheck?.verdict === 'contradicted' || c.factCheck?.verdict === 'misleading',
  )
  const claimsRatio = factualClaims.length > 0
    ? badClaims.length / factualClaims.length
    : 0

  // 4. Fallacy severity score (0-1)
  const fallacyScore = fallacies.reduce((sum, f) => {
    const severityWeight = { minor: 0.2, moderate: 0.5, major: 1.0 }
    return sum + (severityWeight[f.severity] || 0.3)
  }, 0)
  const normalizedFallacy = Math.min(1, fallacyScore / 3)

  // Weighted sum
  const raw = (
    avgEmotional * 0.30 +
    intentMismatch * 0.15 +
    claimsRatio * 0.30 +
    normalizedFallacy * 0.25
  )

  return Math.round(Math.min(100, Math.max(0, raw * 100)))
}

/**
 * Compute rhetorical grade from A-F.
 *
 * A: score 0-15, no false claims, no major fallacies
 * B: score 16-35, no false claims
 * C: score 36-55
 * D: score 56-75
 * F: score 76-100 or any contradicted factual claim
 */
export function computeRhetoricalGrade(
  manipulationScore: number,
  claims: Claim[],
  fallacies: Fallacy[],
): RhetoricalGrade {
  // Auto-F for any contradicted factual claim
  const hasContradicted = claims.some(
    (c) => c.type === 'factual' && c.factCheck?.verdict === 'contradicted',
  )
  if (hasContradicted) return 'F'

  // Auto-F for very high manipulation score
  if (manipulationScore >= 76) return 'F'

  // Check for major fallacies
  const hasMajorFallacy = fallacies.some((f) => f.severity === 'major')
  const hasFalseClaim = claims.some(
    (c) => c.type === 'factual' && c.factCheck?.verdict === 'contradicted',
  )

  if (manipulationScore <= 15 && !hasFalseClaim && !hasMajorFallacy) return 'A'
  if (manipulationScore <= 35 && !hasFalseClaim) return 'B'
  if (manipulationScore <= 55) return 'C'
  return 'D'
}
