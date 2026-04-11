import type { SentimentResult, ToneLabel } from '../types/analysis'

const TONE_COLORS: Record<ToneLabel, string> = {
  neutral: '#6b7280',
  fear_appeal: '#ef4444',
  urgency: '#f59e0b',
  outrage: '#dc2626',
  flattery: '#f472b6',
  false_calm: '#2dd4bf',
  manufactured_authority: '#a855f7',
  sarcasm: '#a3e635',
  empathy: '#60a5fa',
  celebration: '#4ade80',
}

const TONE_LABELS: Record<ToneLabel, string> = {
  neutral: 'Neutral',
  fear_appeal: 'Fear Appeal',
  urgency: 'Urgency',
  outrage: 'Outrage',
  flattery: 'Flattery',
  false_calm: 'False Calm',
  manufactured_authority: 'Manufactured Authority',
  sarcasm: 'Sarcasm',
  empathy: 'Empathy',
  celebration: 'Celebration',
}

interface SentimentRibbonProps {
  sentiment: SentimentResult
  onClick?: () => void
}

export default function SentimentRibbon({ sentiment, onClick }: SentimentRibbonProps) {
  const color = TONE_COLORS[sentiment.dominantTone]
  const label = TONE_LABELS[sentiment.dominantTone]

  const topWeights = sentiment.featureWeights
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3)
    .map((fw) => fw.token)

  return (
    <div
      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md cursor-pointer transition-all hover:w-1.5"
      style={{ backgroundColor: color }}
      onClick={onClick}
      title={`${label} | Valence: ${sentiment.valence.toFixed(2)} | Arousal: ${sentiment.arousal.toFixed(2)}${topWeights.length > 0 ? ` | Top words: ${topWeights.join(', ')}` : ''}`}
      role="button"
      aria-label={`Sentiment: ${label}`}
    />
  )
}

export { TONE_COLORS, TONE_LABELS }
