import { describe, it, expect } from 'vitest'
import { splitSentences, normalizeText, extractMetadata } from './preprocessor'

describe('normalizeText', () => {
  it('converts smart quotes to straight quotes', () => {
    expect(normalizeText('\u201CHello\u201D')).toBe('"Hello"')
    expect(normalizeText('\u2018test\u2019')).toBe("'test'")
  })

  it('converts em/en dashes to hyphens', () => {
    expect(normalizeText('hello\u2014world')).toBe('hello-world')
    expect(normalizeText('hello\u2013world')).toBe('hello-world')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeText('hello    world')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello')
  })

  it('preserves single newlines', () => {
    expect(normalizeText('hello\nworld')).toBe('hello\nworld')
  })
})

describe('splitSentences', () => {
  it('splits simple sentences', () => {
    const result = splitSentences('Hello world. Goodbye world.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Hello world.')
    expect(result[1].text).toBe('Goodbye world.')
  })

  it('assigns sequential IDs', () => {
    const result = splitSentences('One. Two. Three.')
    expect(result.map((s) => s.id)).toEqual(['s0', 's1', 's2'])
  })

  it('tracks character offsets', () => {
    const text = 'Hello. World.'
    const result = splitSentences(text)
    expect(result[0].startIndex).toBe(0)
    expect(result[0].endIndex).toBe(6)
    expect(result[1].startIndex).toBe(7)
  })

  it('handles abbreviations without false splits', () => {
    const result = splitSentences('Dr. Smith went to D.C. He liked it.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('Dr.')
    expect(result[0].text).toContain('D.C.')
  })

  it('handles Mr. Mrs. Ms. abbreviations', () => {
    const result = splitSentences('Mr. Jones met Mrs. Smith. They talked.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('Mr.')
    expect(result[0].text).toContain('Mrs.')
  })

  it('handles URLs without splitting', () => {
    const result = splitSentences('Visit https://example.com/page.html for more. Thanks.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('https://example.com/page.html')
  })

  it('handles @mentions', () => {
    const result = splitSentences('@user.name said something. It was interesting.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('@user.name')
  })

  it('handles multiple exclamation marks', () => {
    const result = splitSentences('This is urgent!!! Please respond.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('This is urgent!!!')
    expect(result[1].text).toBe('Please respond.')
  })

  it('handles question marks', () => {
    const result = splitSentences('Is this true? I doubt it.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Is this true?')
  })

  it('handles mixed punctuation ?!', () => {
    const result = splitSentences('Are you serious?! Come on.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('Are you serious?!')
  })

  it('handles ellipsis without splitting', () => {
    const result = splitSentences('Well... I think so. Maybe.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('...')
  })

  it('handles emoji-heavy text', () => {
    const result = splitSentences('This is amazing! 🔥🔥🔥 Best thing ever.')
    expect(result).toHaveLength(2)
  })

  it('handles thread-style numbered lists', () => {
    const result = splitSentences('1/ First point.\n2/ Second point.\n3/ Third point.')
    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('First point.')
    expect(result[1].text).toBe('Second point.')
    expect(result[2].text).toBe('Third point.')
  })

  it('handles newline-separated social media text', () => {
    const result = splitSentences('First line\nSecond line\nThird line')
    expect(result).toHaveLength(3)
  })

  it('handles empty text', () => {
    expect(splitSentences('')).toHaveLength(0)
    expect(splitSentences('   ')).toHaveLength(0)
  })

  it('handles single sentence without trailing punctuation', () => {
    const result = splitSentences('Just one sentence')
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Just one sentence')
  })

  it('handles e.g. and i.e. abbreviations', () => {
    const result = splitSentences('Use tools e.g. ClaimsLens for analysis. It works.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('e.g.')
  })

  it('handles decimal numbers', () => {
    const result = splitSentences('The rate is 3.14 percent. Not bad.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('3.14')
  })

  it('handles a realistic political tweet', () => {
    const text = 'BREAKING: Crime is up 200% in major cities!!! The government REFUSES to act. Either we demand change NOW or accept chaos. Wake up people.'
    const result = splitSentences(text)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('handles a realistic LinkedIn post', () => {
    const text = "I quit my $300k job at Google. Everyone called me crazy. 6 months later I'm making $1M/year. Here's what I learned..."
    const result = splitSentences(text)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

  it('handles hashtags within text', () => {
    const result = splitSentences('This is #important news. Share it with #everyone.')
    expect(result).toHaveLength(2)
    expect(result[0].text).toContain('#important')
  })
})

describe('extractMetadata', () => {
  it('extracts mentions', () => {
    const { mentions } = extractMetadata('Hey @alice and @bob.smith')
    expect(mentions).toContain('alice')
    expect(mentions).toContain('bob.smith')
  })

  it('extracts hashtags', () => {
    const { hashtags } = extractMetadata('#breaking #news today')
    expect(hashtags).toContain('breaking')
    expect(hashtags).toContain('news')
  })

  it('extracts URLs', () => {
    const { urls } = extractMetadata('Check https://example.com and http://test.org/page')
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://example.com')
  })

  it('handles text with no metadata', () => {
    const result = extractMetadata('Just plain text here')
    expect(result.mentions).toHaveLength(0)
    expect(result.hashtags).toHaveLength(0)
    expect(result.urls).toHaveLength(0)
  })
})
