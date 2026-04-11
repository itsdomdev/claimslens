import sentimentLexicon from './data/sentiment-lexicon.json'

const lexicon = sentimentLexicon as Record<string, number>

// Intent-specific word lists augmenting the vocabulary
const INTENT_WORDS: Record<string, string[]> = {
  sell: [
    'buy', 'sale', 'discount', 'offer', 'deal', 'price', 'order', 'shop',
    'save', 'code', 'promo', 'limited', 'exclusive', 'subscribe', 'premium',
    'free', 'trial', 'shipping', 'checkout', 'click', 'link', 'bio',
  ],
  inform: [
    'according', 'report', 'study', 'data', 'found', 'research', 'source',
    'published', 'evidence', 'analysis', 'fact', 'statistic', 'percent',
    'number', 'figure', 'survey', 'official', 'confirmed',
  ],
  provoke: [
    'wake', 'sheep', 'sheeple', 'coward', 'pathetic', 'disgusting',
    'moron', 'idiot', 'stupid', 'fool', 'clown', 'joke', 'laughable',
    'embarrassing', 'hypocrite', 'liar', 'fraud', 'fake',
  ],
  virtue_signal: [
    'ally', 'solidarity', 'stand', 'proud', 'privilege', 'grateful',
    'blessed', 'humbled', 'honored', 'committed', 'passionate', 'journey',
    'authentic', 'vulnerable', 'transparency', 'accountability',
  ],
  authority: [
    'expert', 'years', 'experience', 'career', 'industry', 'founded',
    'ceo', 'leader', 'built', 'launched', 'created', 'advisor', 'mentor',
    'speaker', 'author', 'degree', 'certified', 'professional',
  ],
}

// Build combined vocabulary
const allWords = new Set<string>()
for (const word of Object.keys(lexicon)) allWords.add(word)
for (const words of Object.values(INTENT_WORDS)) {
  for (const word of words) allWords.add(word)
}

const wordIndex = new Map<string, number>()
let idx = 0
for (const word of allWords) {
  wordIndex.set(word, idx++)
}

const VOCAB_SIZE = wordIndex.size
const OOV_BUCKETS = 100

/**
 * Get the index for a word. OOV words hash to fixed buckets.
 */
export function getWordIndex(word: string): number {
  const known = wordIndex.get(word)
  if (known !== undefined) return known
  // Hash OOV words to buckets
  let hash = 0
  for (let i = 0; i < word.length; i++) {
    hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0
  }
  return VOCAB_SIZE + (Math.abs(hash) % OOV_BUCKETS)
}

/**
 * Check if a token belongs to an intent-specific word list.
 */
export function getIntentCategory(token: string): string | null {
  for (const [category, words] of Object.entries(INTENT_WORDS)) {
    if (words.includes(token)) return category
  }
  return null
}

export { VOCAB_SIZE, OOV_BUCKETS, INTENT_WORDS }
