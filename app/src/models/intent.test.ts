import { describe, it, expect } from 'vitest'
import { IntentModel } from './intent'
import { SentimentModel } from './sentiment'

describe('IntentModel', () => {
  const intentModel = new IntentModel()
  const sentimentModel = new SentimentModel()

  function classify(text: string) {
    const sentiment = sentimentModel.predict(text)
    return intentModel.predict(text, sentiment)
  }

  it('classifies sell intent with urgency and product language', () => {
    const result = classify('Use code SAVE50 for 50% off - today only! Limited time offer, buy now!')
    expect(result.primaryIntent).toBe('sell')
    expect(result.distribution.sell).toBeGreaterThan(result.distribution.inform)
  })

  it('classifies inform intent with data language', () => {
    const result = classify("Here's what the data actually shows: according to the published research and official statistics.")
    expect(result.primaryIntent).toBe('inform')
  })

  it('classifies provoke intent with outrage language', () => {
    const result = classify('This is absolutely DISGUSTING and everyone should be outraged! These clowns are pathetic!')
    expect(result.primaryIntent).toBe('provoke')
  })

  it('detects stated vs detected intent mismatch - just asking questions', () => {
    const result = classify("I'm just asking questions, but isn't it disgusting how these pathetic clowns run everything?")
    expect(result.statedVsDetected).toBeDefined()
    if (result.statedVsDetected) {
      expect(result.statedVsDetected.stated).toBe('inform')
      expect(result.statedVsDetected.detected).not.toBe('inform')
    }
  })

  it('detects stated vs detected intent mismatch - not racist but', () => {
    const result = classify("I'm not racist but those people are all criminals and disgusting")
    expect(result.statedVsDetected).toBeDefined()
    if (result.statedVsDetected) {
      expect(result.statedVsDetected.stated).toBe('inform')
    }
  })

  it('classifies create_urgency with urgency words and exclamations', () => {
    const result = classify('ACT NOW! This deal expires TONIGHT! Last chance to save! Hurry hurry hurry!')
    expect(['sell', 'create_urgency']).toContain(result.primaryIntent)
    expect(result.distribution.create_urgency + result.distribution.sell).toBeGreaterThan(0.3)
  })

  it('classifies virtue_signal with moral language and self-reference', () => {
    const result = classify("I'm so grateful and humbled to stand in solidarity with this community. I'm proud to be an ally on this journey of accountability and transparency.")
    expect(result.primaryIntent).toBe('virtue_signal')
  })

  it('classifies establish_authority with expertise language', () => {
    const result = classify("With 20 years of experience as a CEO and industry leader, I've built and launched multiple companies. As a certified professional advisor and mentor, here's my expert take.")
    expect(result.primaryIntent).toBe('establish_authority')
  })

  it('returns all 12 intent labels in distribution', () => {
    const result = classify('Hello world')
    const labels = Object.keys(result.distribution)
    expect(labels).toHaveLength(12)
    expect(labels).toContain('inform')
    expect(labels).toContain('sell')
    expect(labels).toContain('provoke')
    expect(labels).toContain('concern_troll')
  })

  it('distribution sums to approximately 1', () => {
    const result = classify('Some random text to analyze')
    const sum = Object.values(result.distribution).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })

  it('confidence is between 0 and 1', () => {
    const result = classify('Test text')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('returns feature weights with valid positions', () => {
    const text = 'Buy this amazing product now! Limited offer!'
    const result = classify(text)
    for (const fw of result.featureWeights) {
      expect(fw.startIndex).toBeGreaterThanOrEqual(0)
      expect(fw.endIndex).toBeLessThanOrEqual(text.length)
    }
  })
})
