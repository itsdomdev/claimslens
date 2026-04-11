import { describe, it, expect } from 'vitest'
import { SentimentModel } from './sentiment'

describe('SentimentModel', () => {
  const model = new SentimentModel()

  it('detects urgency in breaking news text', () => {
    const result = model.predict('BREAKING: This is URGENT!!!')
    expect(result.dominantTone).toBe('urgency')
    expect(result.toneScores.urgency).toBeGreaterThan(result.toneScores.neutral)
    expect(result.arousal).toBeGreaterThan(0.3)
  })

  it('detects manufactured authority', () => {
    const result = model.predict('Studies show that experts agree this is dangerous')
    expect(result.dominantTone).toBe('manufactured_authority')
    expect(result.toneScores.manufactured_authority).toBeGreaterThan(result.toneScores.neutral)
  })

  it('scores neutral/low arousal for benign text', () => {
    const result = model.predict('Have a nice day')
    expect(result.arousal).toBeLessThan(0.3)
    expect(result.valence).toBeGreaterThanOrEqual(0)
  })

  it('detects fear appeal', () => {
    const result = model.predict('This is extremely dangerous and threatens our safety. The risk is terrifying.')
    expect(result.toneScores.fear_appeal).toBeGreaterThan(result.toneScores.neutral)
  })

  it('detects outrage', () => {
    const result = model.predict('This is absolutely DISGUSTING and SHAMEFUL behavior! Outrageous!')
    expect(result.toneScores.outrage).toBeGreaterThan(result.toneScores.neutral)
    expect(result.arousal).toBeGreaterThan(0.3)
  })

  it('detects flattery', () => {
    const result = model.predict('Smart people like you already know the truth. You deserve better.')
    expect(result.toneScores.flattery).toBeGreaterThan(result.toneScores.neutral)
  })

  it('returns feature weights that reference original text positions', () => {
    const text = 'BREAKING: This is URGENT!!!'
    const result = model.predict(text)
    expect(result.featureWeights.length).toBeGreaterThan(0)

    for (const fw of result.featureWeights) {
      expect(fw.startIndex).toBeGreaterThanOrEqual(0)
      expect(fw.endIndex).toBeGreaterThan(fw.startIndex)
      expect(fw.endIndex).toBeLessThanOrEqual(text.length)
      expect(fw.weight).not.toBe(0)
    }
  })

  it('returns all tone labels in toneScores', () => {
    const result = model.predict('Hello world')
    const expectedTones = [
      'neutral', 'fear_appeal', 'urgency', 'outrage', 'flattery',
      'false_calm', 'manufactured_authority', 'sarcasm', 'empathy', 'celebration',
    ]
    for (const tone of expectedTones) {
      expect(result.toneScores).toHaveProperty(tone)
      expect(typeof result.toneScores[tone as keyof typeof result.toneScores]).toBe('number')
    }
  })

  it('tone scores sum to approximately 1 (softmax)', () => {
    const result = model.predict('BREAKING: This is URGENT!!!')
    const sum = Object.values(result.toneScores).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })

  it('valence is between -1 and 1', () => {
    const positive = model.predict('This is wonderful and amazing!')
    expect(positive.valence).toBeGreaterThan(0)
    expect(positive.valence).toBeLessThanOrEqual(1)

    const negative = model.predict('This is terrible and awful and horrible')
    expect(negative.valence).toBeLessThan(0)
    expect(negative.valence).toBeGreaterThanOrEqual(-1)
  })

  it('arousal is between 0 and 1', () => {
    const calm = model.predict('The weather is okay today')
    expect(calm.arousal).toBeGreaterThanOrEqual(0)
    expect(calm.arousal).toBeLessThanOrEqual(1)

    const intense = model.predict('DANGER!!! EMERGENCY!!! ACT NOW!!!')
    expect(intense.arousal).toBeGreaterThanOrEqual(0)
    expect(intense.arousal).toBeLessThanOrEqual(1)
  })
})
