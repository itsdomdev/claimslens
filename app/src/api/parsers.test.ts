import { describe, it, expect } from 'vitest'
import { parseClaims, parseFactCheck, parseFallacies, parseExtraction } from './parsers'

describe('parseClaims', () => {
  it('parses valid claim JSON', () => {
    const raw = JSON.stringify({
      claims: [
        { id: 'c0', text: 'Test claim', sentenceId: 's0', type: 'factual', hedging: null },
      ],
    })
    const result = parseClaims(raw)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c0')
    expect(result[0].type).toBe('factual')
  })

  it('handles hedging', () => {
    const raw = JSON.stringify({
      claims: [
        { id: 'c0', text: 'Claim', sentenceId: 's0', type: 'factual', hedging: { detected: true, hedgePhrase: 'studies show', effect: 'vague' } },
      ],
    })
    const result = parseClaims(raw)
    expect(result[0].hedging?.detected).toBe(true)
  })

  it('handles malformed JSON gracefully', () => {
    const result = parseClaims('not json')
    expect(result).toEqual([])
  })

  it('handles missing fields with defaults', () => {
    const raw = JSON.stringify({ claims: [{ text: 'A claim' }] })
    const result = parseClaims(raw)
    expect(result[0].id).toBe('c0')
    expect(result[0].type).toBe('factual')
  })
})

describe('parseFactCheck', () => {
  it('parses valid fact check results', () => {
    const raw = JSON.stringify({
      results: [
        { verdict: 'supported', confidence: 0.9, explanation: 'Verified.', sources: [] },
      ],
    })
    const result = parseFactCheck(raw)
    expect(result).toHaveLength(1)
    expect(result[0].verdict).toBe('supported')
  })

  it('handles malformed JSON gracefully', () => {
    expect(parseFactCheck('bad')).toEqual([])
  })

  it('defaults unknown verdicts to unverifiable', () => {
    const raw = JSON.stringify({ results: [{ verdict: 'banana', explanation: 'test' }] })
    const result = parseFactCheck(raw)
    expect(result[0].verdict).toBe('unverifiable')
  })
})

describe('parseFallacies', () => {
  it('parses valid fallacies', () => {
    const raw = JSON.stringify({
      fallacies: [
        { id: 'f0', type: 'false_dichotomy', name: 'False Dichotomy', sentenceIds: ['s0'], claimIds: [], explanation: 'Binary choice.', severity: 'major' },
      ],
      summary: 'One fallacy found.',
    })
    const result = parseFallacies(raw)
    expect(result.fallacies).toHaveLength(1)
    expect(result.summary).toBe('One fallacy found.')
  })

  it('handles malformed JSON gracefully', () => {
    const result = parseFallacies('nope')
    expect(result.fallacies).toEqual([])
    expect(result.summary).toBe('')
  })
})

describe('parseExtraction', () => {
  it('parses valid extraction response', () => {
    const raw = JSON.stringify({ text: 'Hello world', platform: 'twitter', author: 'user1', date: '2026-01-01' })
    const result = parseExtraction(raw)
    expect(result.text).toBe('Hello world')
    expect(result.platform).toBe('twitter')
    expect(result.author).toBe('user1')
  })

  it('handles code-fence wrapped response', () => {
    const raw = '```json\n{"text": "Post text", "platform": "threads"}\n```'
    const result = parseExtraction(raw)
    expect(result.text).toBe('Post text')
  })

  it('throws on error response', () => {
    const raw = JSON.stringify({ error: 'Could not access URL' })
    expect(() => parseExtraction(raw)).toThrow('Could not access URL')
  })

  it('throws on missing text', () => {
    const raw = JSON.stringify({ platform: 'twitter' })
    expect(() => parseExtraction(raw)).toThrow('No text extracted')
  })

  it('throws on malformed JSON', () => {
    expect(() => parseExtraction('not json')).toThrow()
  })
})
