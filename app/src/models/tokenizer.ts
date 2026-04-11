const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'nor', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
  'that', 'this', 'these', 'those', 'it', 'its', 'he', 'she', 'they',
  'them', 'his', 'her', 'their', 'we', 'us', 'our', 'my', 'your',
  'am', 'if', 'then', 'than', 'when', 'where', 'who', 'whom', 'which',
  'what', 'how', 'up', 'out', 'about',
])

/**
 * Tokenize text for model input. Lowercases, splits on whitespace/punctuation,
 * keeps contractions intact. Zero external dependencies.
 */
export function tokenize(text: string, removeStopWords = true): string[] {
  // Lowercase
  const lower = text.toLowerCase()

  // Split on whitespace and punctuation, keeping contractions (don't, it's)
  // Also keep hashtags and @mentions as single tokens
  const rawTokens = lower.match(/[@#]?\w+(?:'\w+)?/g) || []

  if (!removeStopWords) return rawTokens

  return rawTokens.filter((t) => !STOP_WORDS.has(t))
}

/**
 * Get all tokens including stop words (for feature weight mapping back to text).
 */
export function tokenizeAll(text: string): string[] {
  return tokenize(text, false)
}

/**
 * Map tokens back to their character positions in the original text.
 */
export function tokenPositions(text: string): Array<{ token: string; start: number; end: number }> {
  const lower = text.toLowerCase()
  const regex = /[@#]?\w+(?:'\w+)?/g
  const positions: Array<{ token: string; start: number; end: number }> = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(lower)) !== null) {
    positions.push({
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return positions
}
