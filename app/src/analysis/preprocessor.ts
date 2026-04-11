import type { Sentence } from '../types/analysis'

// Patterns that contain periods but aren't sentence endings
const URL_PATTERN = /https?:\/\/[^\s]+/g
const MENTION_PATTERN = /@[\w.]+/g
const ELLIPSIS_PATTERN = /\.{2,}/g
const DECIMAL_PATTERN = /\d+\.\d+/g

/**
 * Split text into sentences, handling social media patterns.
 */
export function splitSentences(text: string): Sentence[] {
  const normalized = normalizeText(text)
  if (!normalized.trim()) return []

  // Replace patterns that contain periods with placeholders
  const placeholders: Map<string, string> = new Map()
  let placeholderIndex = 0

  function addPlaceholder(match: string): string {
    const key = `\x00PH${placeholderIndex++}\x00`
    placeholders.set(key, match)
    return key
  }

  let work = normalized

  // Replace URLs
  work = work.replace(URL_PATTERN, (m) => addPlaceholder(m))
  // Replace @mentions
  work = work.replace(MENTION_PATTERN, (m) => addPlaceholder(m))
  // Replace decimals (e.g. 3.14)
  work = work.replace(DECIMAL_PATTERN, (m) => addPlaceholder(m))
  // Replace ellipsis
  work = work.replace(ELLIPSIS_PATTERN, (m) => addPlaceholder(m))

  // Known abbreviations that commonly precede capitalized words (never sentence-ending)
  const ALWAYS_ABBREV = new Set(['e.g.', 'i.e.', 'a.m.', 'p.m.'])

  // Replace multi-letter abbreviations with dots (U.S., D.C., e.g., i.e.)
  work = work.replace(/\b([A-Za-z]\.){2,}/g, (m, _g, offset) => {
    // Always protect known abbreviations
    if (ALWAYS_ABBREV.has(m.toLowerCase())) {
      return addPlaceholder(m)
    }
    // Check if followed by space + uppercase letter (sentence boundary)
    const after = work.slice(offset + m.length, offset + m.length + 2)
    if (/^\s[A-Z]/.test(after)) {
      // Likely a sentence ending — protect inner dots, keep final dot
      const inner = m.slice(0, -1)
      return addPlaceholder(inner) + '.'
    }
    return addPlaceholder(m)
  })

  // Replace known abbreviations followed by space or end (Dr. Mr. Mrs. etc.)
  work = work.replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|Ave|Blvd|Dept|Est|Gov|Inc|Ltd|No|Vs|Etc|Approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi, (m) => addPlaceholder(m))

  // First, split on newlines to handle social media line breaks
  const lines = work.split('\n').map((l) => l.trim()).filter(Boolean)

  const sentenceParts: string[] = []

  for (const line of lines) {
    // Strip thread numbering (1/ 2/ 3) etc.)
    let cleanLine = line
    const threadMatch = line.match(/^(\d+)[/)]\s*(.+)$/)
    if (threadMatch && threadMatch[2]) {
      cleanLine = threadMatch[2]
    }

    // Split line on sentence-ending punctuation followed by space or end
    let current = ''
    for (let i = 0; i < cleanLine.length; i++) {
      current += cleanLine[i]

      const ch = cleanLine[i]
      const isTerminator = ch === '.' || ch === '!' || ch === '?'

      if (isTerminator) {
        // Consume additional terminators (!! ?? ?! ...)
        while (i + 1 < cleanLine.length && (cleanLine[i + 1] === '!' || cleanLine[i + 1] === '?' || cleanLine[i + 1] === '.')) {
          i++
          current += cleanLine[i]
        }

        // Check if followed by whitespace or end of string
        const nextChar = cleanLine[i + 1]
        if (nextChar === undefined || nextChar === ' ' || nextChar === '\t') {
          sentenceParts.push(current.trim())
          current = ''
        }
      }
    }

    // Remaining text in this line (no terminator at end)
    const remaining = current.trim()
    if (remaining) {
      sentenceParts.push(remaining)
    }
  }

  // Restore placeholders and build Sentence objects
  const sentences: Sentence[] = []
  let searchStart = 0

  for (let i = 0; i < sentenceParts.length; i++) {
    let sentenceText = sentenceParts[i]

    // Restore placeholders
    for (const [key, value] of placeholders) {
      sentenceText = sentenceText.replaceAll(key, value)
    }

    // Skip empty sentences
    if (!sentenceText.trim()) continue

    // Find position in original normalized text
    const startIndex = normalized.indexOf(sentenceText, searchStart)
    const actualStart = startIndex >= 0 ? startIndex : searchStart
    const endIndex = actualStart + sentenceText.length

    sentences.push({
      id: `s${sentences.length}`,
      text: sentenceText,
      startIndex: actualStart,
      endIndex,
    })

    searchStart = endIndex
  }

  return sentences
}

/**
 * Normalize Unicode and whitespace.
 */
export function normalizeText(text: string): string {
  return text
    // Smart quotes → straight quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Em/en dashes → hyphens
    .replace(/[\u2013\u2014]/g, '-')
    // Collapse multiple spaces (but preserve newlines)
    .replace(/[^\S\n]+/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Extract social media metadata from text.
 */
export function extractMetadata(text: string): {
  mentions: string[]
  hashtags: string[]
  urls: string[]
} {
  const mentions = [...text.matchAll(/@([\w.]+)/g)].map((m) => m[1])
  const hashtags = [...text.matchAll(/#([\w]+)/g)].map((m) => m[1])
  const urls = [...text.matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0])

  return { mentions, hashtags, urls }
}
