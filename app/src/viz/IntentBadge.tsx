import type { IntentResult, IntentLabel } from '../types/analysis'

const INTENT_COLORS: Record<IntentLabel, string> = {
  inform: '#3b82f6',
  persuade: '#6366f1',
  sell: '#22c55e',
  mislead: '#ef4444',
  deflect: '#f97316',
  provoke: '#dc2626',
  establish_authority: '#8b5cf6',
  build_trust: '#06b6d4',
  create_urgency: '#f59e0b',
  virtue_signal: '#ec4899',
  concern_troll: '#f97316',
  entertain: '#a3e635',
}

const INTENT_LABELS: Record<IntentLabel, string> = {
  inform: 'Inform',
  persuade: 'Persuade',
  sell: 'Sell',
  mislead: 'Mislead',
  deflect: 'Deflect',
  provoke: 'Provoke',
  establish_authority: 'Authority',
  build_trust: 'Trust',
  create_urgency: 'Urgency',
  virtue_signal: 'Virtue Signal',
  concern_troll: 'Concern Troll',
  entertain: 'Entertain',
}

interface IntentBadgeProps {
  intent: IntentResult
  onClick?: () => void
}

export default function IntentBadge({ intent, onClick }: IntentBadgeProps) {
  const color = INTENT_COLORS[intent.primaryIntent]
  const label = INTENT_LABELS[intent.primaryIntent]
  const hasMismatch = !!intent.statedVsDetected

  // Build tooltip with top 3 intents
  const topIntents = Object.entries(intent.distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${Math.round(v * 100)}%`)
    .join(', ')

  return (
    <span
      className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white cursor-pointer transition-all hover:scale-105
        ${hasMismatch ? 'ring-1 ring-amber-400 ring-offset-1 ring-offset-gray-950' : ''}
      `}
      style={{
        backgroundColor: color,
        opacity: Math.max(0.5, intent.confidence),
      }}
      onClick={onClick}
      title={`Intent: ${label} (${Math.round(intent.confidence * 100)}%)\nDistribution: ${topIntents}${hasMismatch ? `\n⚠ Mismatch: ${intent.statedVsDetected!.mismatchExplanation}` : ''}`}
      role="button"
      aria-label={`Detected intent: ${label}`}
    >
      {label}
      {hasMismatch && <span className="ml-0.5">{'\u26A0'}</span>}
    </span>
  )
}

export { INTENT_COLORS, INTENT_LABELS }
