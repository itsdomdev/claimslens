import type { Claim } from '../types/analysis'
import { VERDICT_COLORS } from './ClaimHighlight'

interface ClaimCardProps {
  claim: Claim
  onClick?: () => void
}

export default function ClaimCard({ claim, onClick }: ClaimCardProps) {
  const verdict = claim.factCheck?.verdict
  const verdictColor = verdict ? VERDICT_COLORS[verdict] : undefined

  return (
    <div
      className="rounded-lg border border-gray-800 bg-gray-900 p-3 space-y-2 transition-all hover:border-gray-700 hover:shadow-md hover:shadow-black/20 cursor-pointer"
      onClick={onClick}
      role="button"
      aria-label={`Claim: ${claim.text.slice(0, 50)}`}
    >
      <p className="text-xs text-gray-300 leading-relaxed">"{claim.text}"</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          {claim.type}
        </span>
        {claim.factCheck && (
          <span
            className="rounded px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: verdictColor, color: '#000' }}
          >
            {claim.factCheck.verdict} ({Math.round(claim.factCheck.confidence * 100)}%)
          </span>
        )}
        {!claim.factCheck && (
          <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500 animate-pulse">
            checking...
          </span>
        )}
      </div>

      {claim.factCheck?.explanation && (
        <p className="text-[11px] text-gray-500 leading-relaxed">{claim.factCheck.explanation}</p>
      )}

      {claim.factCheck?.missingContext && (
        <p className="text-[11px] text-amber-500/80 leading-relaxed">
          <span className="font-medium">Missing context:</span> {claim.factCheck.missingContext}
        </p>
      )}

      {claim.factCheck?.sources && claim.factCheck.sources.length > 0 && (
        <div className="space-y-1">
          {claim.factCheck.sources.map((source, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px]">
              <span className={source.supportType === 'supports' ? 'text-green-500' : source.supportType === 'contradicts' ? 'text-red-400' : 'text-gray-500'}>
                {source.supportType === 'supports' ? '\u2713' : source.supportType === 'contradicts' ? '\u2717' : '\u2022'}
              </span>
              <span className="text-indigo-400 hover:underline">{source.title}</span>
            </div>
          ))}
        </div>
      )}

      {claim.hedging?.detected && (
        <p className="text-[11px] text-amber-400/60">
          <span className="font-medium">Hedging:</span> "{claim.hedging.hedgePhrase}" — {claim.hedging.effect}
        </p>
      )}
    </div>
  )
}
