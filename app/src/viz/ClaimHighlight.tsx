import type { Claim, Verdict } from '../types/analysis'

const VERDICT_COLORS: Record<Verdict | 'pending', string> = {
  supported: '#4ade80',
  contradicted: '#ef4444',
  misleading: '#f59e0b',
  unverifiable: '#6b7280',
  outdated: '#eab308',
  pending: '#6b7280',
}

const CLAIM_TYPE_COLORS: Record<string, string> = {
  factual: '#3b82f6',
  opinion: '#6b7280',
  prediction: '#a855f7',
  assumption: '#f59e0b',
}

interface ClaimHighlightProps {
  claim: Claim
  showFactCheck: boolean
  onClick?: () => void
}

export default function ClaimHighlight({ claim, showFactCheck, onClick }: ClaimHighlightProps) {
  const verdictColor = showFactCheck && claim.factCheck
    ? VERDICT_COLORS[claim.factCheck.verdict]
    : CLAIM_TYPE_COLORS[claim.type] || CLAIM_TYPE_COLORS.factual
  const verdict = claim.factCheck?.verdict

  return (
    <div
      className="text-xs border-l-2 pl-2 cursor-pointer hover:bg-gray-800/30 rounded-r py-0.5 transition-colors"
      style={{ borderColor: verdictColor }}
      onClick={onClick}
      role="button"
      aria-label={`Claim: ${claim.type}${verdict ? `, ${verdict}` : ''}`}
    >
      <span className="text-gray-400">{claim.type}</span>
      {showFactCheck && claim.factCheck && (
        <span
          className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: verdictColor, color: '#000' }}
        >
          {claim.factCheck.verdict}
        </span>
      )}
      {claim.hedging?.detected && (
        <span className="ml-2 text-[10px] text-amber-400" title={claim.hedging.effect}>
          hedging: "{claim.hedging.hedgePhrase}"
        </span>
      )}
    </div>
  )
}

export { VERDICT_COLORS, CLAIM_TYPE_COLORS }
