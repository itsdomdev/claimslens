import type { ToneLabel } from '../types/analysis'
import sentimentLexicon from './data/sentiment-lexicon.json'

const lexicon = sentimentLexicon as Record<string, number>

// ── Word lists for emotional manipulation detection ──────────────

const FEAR_WORDS = new Set([
  'threat', 'threaten', 'danger', 'dangerous', 'risk', 'risky', 'warning',
  'alarming', 'alarm', 'terror', 'terrorism', 'terrify', 'terrifying',
  'deadly', 'lethal', 'fatal', 'peril', 'doom', 'dread', 'horror',
  'nightmare', 'catastrophe', 'catastrophic', 'crisis', 'emergency',
  'panic', 'scare', 'scared', 'scary', 'afraid', 'fear', 'fearful',
  'endanger', 'unsafe', 'vulnerable', 'collapse', 'destroy', 'destruction',
])

const URGENCY_WORDS = new Set([
  'now', 'immediately', 'urgent', 'urgently', 'breaking', 'alert',
  'last', 'hurry', 'rush', 'asap', 'deadline', 'limited', 'expires',
  'act', 'quick', 'quickly', 'fast', 'before', 'tonight', 'today',
  'running', 'final', 'ending', 'countdown',
])

const OUTRAGE_WORDS = new Set([
  'disgusting', 'unacceptable', 'outrageous', 'outrage', 'outraged',
  'shameful', 'shame', 'pathetic', 'revolting', 'appalling', 'shocking',
  'scandalous', 'scandal', 'corrupt', 'corruption', 'criminal', 'vile',
  'despicable', 'reprehensible', 'inexcusable', 'intolerable', 'absurd',
  'ridiculous', 'insane', 'furious', 'fury', 'rage', 'enrage',
])

const FLATTERY_PATTERNS = [
  'smart people', 'intelligent people', 'anyone with a brain',
  'you\'re too smart', 'you already know', 'as you know',
  'savvy', 'discerning', 'astute', 'sharp minds',
  'exclusive', 'hand-picked', 'selected few', 'elite',
  'people like you', 'you deserve', 'you\'ve earned',
]

const AUTHORITY_PATTERNS = [
  'experts agree', 'studies show', 'research shows', 'science says',
  'everyone knows', 'it\'s well known', 'it\'s common knowledge',
  'doctors say', 'scientists say', 'data shows', 'evidence shows',
  'proven', 'scientifically proven', 'studies have shown',
  'according to experts', 'leading experts', 'top researchers',
  'the science is clear', 'the data is clear', 'research confirms',
]

const HEDGING_PHRASES = [
  'some say', 'some people say', 'some believe', 'some experts',
  'it\'s believed', 'reportedly', 'allegedly', 'sources say',
  'it\'s been said', 'many people think', 'there are those who',
  'some would argue', 'one could argue', 'it has been suggested',
  'people are saying', 'i\'ve heard', 'rumor has it', 'word is',
  'apparently', 'supposedly', 'it seems', 'it appears',
]

// ── Feature Vector ───────────────────────────────────────────────

export interface FeatureVector {
  // Lexicon scores
  avgSentiment: number
  minSentiment: number
  maxSentiment: number
  sentimentRange: number

  // Category word counts (normalized by token count)
  fearScore: number
  urgencyScore: number
  outrageScore: number
  flatteryScore: number
  authorityScore: number
  hedgingScore: number

  // Punctuation features
  exclamationCount: number
  questionCount: number
  capsRatio: number
  ellipsisCount: number

  // Text statistics
  avgWordLength: number
  wordCount: number

  // Per-token lexicon scores (for feature weight mapping)
  tokenScores: Array<{ token: string; score: number; category: ToneLabel | null }>
}

/**
 * Extract features from tokens and raw text for sentiment classification.
 */
export function extractFeatures(tokens: string[], rawText: string): FeatureVector {
  // Lexicon scores
  const scores = tokens
    .map((t) => lexicon[t] ?? 0)
  const nonZeroScores = scores.filter((s) => s !== 0)

  const avgSentiment = nonZeroScores.length > 0
    ? nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length
    : 0
  const minSentiment = scores.length > 0 ? Math.min(...scores) : 0
  const maxSentiment = scores.length > 0 ? Math.max(...scores) : 0

  const tokenCount = Math.max(tokens.length, 1)
  const lowerText = rawText.toLowerCase()

  // Category scores
  const fearScore = tokens.filter((t) => FEAR_WORDS.has(t)).length / tokenCount
  const urgencyScore = tokens.filter((t) => URGENCY_WORDS.has(t)).length / tokenCount
  const outrageScore = tokens.filter((t) => OUTRAGE_WORDS.has(t)).length / tokenCount

  // Pattern-based scores: count of matches, capped at 1.0 (any match is a strong signal)
  const flatteryMatches = FLATTERY_PATTERNS.filter((p) => lowerText.includes(p)).length
  const flatteryScore = Math.min(1.0, flatteryMatches * 0.5)
  const authorityMatches = AUTHORITY_PATTERNS.filter((p) => lowerText.includes(p)).length
  const authorityScore = Math.min(1.0, authorityMatches * 0.5)
  const hedgingMatches = HEDGING_PHRASES.filter((p) => lowerText.includes(p)).length
  const hedgingScore = Math.min(1.0, hedgingMatches * 0.5)

  // Punctuation features
  const exclamationCount = (rawText.match(/!/g) || []).length
  const questionCount = (rawText.match(/\?/g) || []).length
  const ellipsisCount = (rawText.match(/\.{2,}/g) || []).length

  // Caps ratio: proportion of uppercase letters in alphabetic characters
  const alphaChars = rawText.replace(/[^a-zA-Z]/g, '')
  const upperChars = rawText.replace(/[^A-Z]/g, '')
  const capsRatio = alphaChars.length > 0 ? upperChars.length / alphaChars.length : 0

  // Text stats
  const words = rawText.split(/\s+/).filter(Boolean)
  const avgWordLength = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 0

  // Per-token scores for feature weight mapping
  const tokenScores = tokens.map((token) => {
    let category: ToneLabel | null = null
    if (FEAR_WORDS.has(token)) category = 'fear_appeal'
    else if (URGENCY_WORDS.has(token)) category = 'urgency'
    else if (OUTRAGE_WORDS.has(token)) category = 'outrage'

    return {
      token,
      score: lexicon[token] ?? 0,
      category,
    }
  })

  return {
    avgSentiment,
    minSentiment,
    maxSentiment,
    sentimentRange: maxSentiment - minSentiment,
    fearScore,
    urgencyScore,
    outrageScore,
    flatteryScore,
    authorityScore,
    hedgingScore,
    exclamationCount,
    questionCount,
    capsRatio,
    ellipsisCount,
    avgWordLength,
    wordCount: words.length,
    tokenScores,
  }
}
