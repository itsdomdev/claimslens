import { describe, it, expect } from 'vitest'
import { AnalysisOrchestrator } from './orchestrator'
import { computeManipulationScore, computeRhetoricalGrade } from './scorer'
import type { SentenceAnalysis, Claim, Fallacy } from '../types/analysis'

describe('AnalysisOrchestrator', () => {
  const orchestrator = new AnalysisOrchestrator()

  it('runs full pipeline on political text', async () => {
    const result = await orchestrator.analyze({
      text: 'BREAKING: Crime is up 200% in major cities!!! The government REFUSES to act. Either we demand change NOW or accept chaos. Wake up people.',
      source: 'paste',
    })

    expect(result.sentences.length).toBeGreaterThanOrEqual(3)
    expect(result.claims.length).toBeGreaterThan(0)
    expect(result.summary.manipulationScore).toBeGreaterThan(0)
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.summary.rhetoricalGrade)
  })

  it('runs full pipeline on benign text', async () => {
    const result = await orchestrator.analyze({
      text: 'The weather is nice today. I enjoyed my walk in the park.',
      source: 'paste',
    })

    expect(result.sentences.length).toBe(2)
    expect(result.summary.manipulationScore).toBeLessThan(50)
  })

  it('reports progress through callback', async () => {
    const stages: string[] = []

    await orchestrator.analyze(
      { text: 'Studies show experts agree this is dangerous. Act now!', source: 'paste' },
      (update) => { stages.push(update.stage) },
    )

    expect(stages).toContain('local_complete')
    expect(stages).toContain('claims_complete')
    expect(stages).toContain('factcheck_complete')
    expect(stages).toContain('reasoning_complete')
    expect(stages).toContain('complete')
  })

  it('handles empty text gracefully', async () => {
    await expect(orchestrator.analyze({ text: '', source: 'paste' }))
      .rejects.toThrow()
  })
})

describe('computeManipulationScore', () => {
  it('scores low for clean informational text', () => {
    const sentences: SentenceAnalysis[] = [{
      id: 's0', text: 'The data shows a 2% increase.', startIndex: 0, endIndex: 29,
      sentiment: {
        valence: 0, arousal: 0.1, dominantTone: 'neutral',
        toneScores: { neutral: 0.8, fear_appeal: 0, urgency: 0, outrage: 0, flattery: 0, false_calm: 0, manufactured_authority: 0, sarcasm: 0, empathy: 0, celebration: 0 },
        featureWeights: [],
      },
      intent: {
        primaryIntent: 'inform', confidence: 0.8,
        distribution: { inform: 0.8, persuade: 0.1, sell: 0, mislead: 0, deflect: 0, provoke: 0, establish_authority: 0, build_trust: 0, create_urgency: 0, virtue_signal: 0, concern_troll: 0, entertain: 0 },
        featureWeights: [],
      },
      claims: [], fallacies: [],
    }]
    const score = computeManipulationScore(sentences, [], [])
    expect(score).toBeLessThan(20)
  })

  it('scores high for manipulative text', () => {
    const sentences: SentenceAnalysis[] = [{
      id: 's0', text: 'DANGER!!!', startIndex: 0, endIndex: 9,
      sentiment: {
        valence: -0.8, arousal: 0.9, dominantTone: 'fear_appeal',
        toneScores: { neutral: 0, fear_appeal: 0.6, urgency: 0.3, outrage: 0.1, flattery: 0, false_calm: 0, manufactured_authority: 0, sarcasm: 0, empathy: 0, celebration: 0 },
        featureWeights: [],
      },
      intent: {
        primaryIntent: 'provoke', confidence: 0.7,
        distribution: { inform: 0, persuade: 0.1, sell: 0, mislead: 0, deflect: 0, provoke: 0.7, establish_authority: 0, build_trust: 0, create_urgency: 0.2, virtue_signal: 0, concern_troll: 0, entertain: 0 },
        statedVsDetected: { stated: 'inform', detected: 'provoke', mismatchExplanation: 'Mismatch' },
        featureWeights: [],
      },
      claims: [], fallacies: [],
    }]
    const claims: Claim[] = [{
      id: 'c0', text: 'False claim', sentenceId: 's0', type: 'factual',
      factCheck: { verdict: 'contradicted', confidence: 0.9, explanation: 'False', sources: [] },
    }]
    const fallacies: Fallacy[] = [{
      id: 'f0', type: 'false_dichotomy', name: 'False Dichotomy',
      sentenceIds: ['s0'], claimIds: ['c0'], explanation: 'Binary choice', severity: 'major',
    }]
    const score = computeManipulationScore(sentences, claims, fallacies)
    expect(score).toBeGreaterThan(50)
  })
})

describe('computeRhetoricalGrade', () => {
  it('returns A for clean text', () => {
    expect(computeRhetoricalGrade(10, [], [])).toBe('A')
  })

  it('returns F for contradicted claims', () => {
    const claims: Claim[] = [{
      id: 'c0', text: 'False', sentenceId: 's0', type: 'factual',
      factCheck: { verdict: 'contradicted', confidence: 0.9, explanation: 'False', sources: [] },
    }]
    expect(computeRhetoricalGrade(30, claims, [])).toBe('F')
  })

  it('returns F for very high manipulation score', () => {
    expect(computeRhetoricalGrade(80, [], [])).toBe('F')
  })

  it('returns B for moderate score without false claims', () => {
    expect(computeRhetoricalGrade(25, [], [])).toBe('B')
  })

  it('returns C for mid-range score', () => {
    expect(computeRhetoricalGrade(45, [], [])).toBe('C')
  })

  it('returns D for high score', () => {
    expect(computeRhetoricalGrade(65, [], [])).toBe('D')
  })
})
