import type { AnalysisStage } from '../types/analysis'

const STAGES = [
  { key: 'local_complete', label: 'Sentiment & Intent' },
  { key: 'claims_complete', label: 'Extracting Claims' },
  { key: 'factcheck_complete', label: 'Fact-Checking' },
  { key: 'reasoning_complete', label: 'Analyzing Reasoning' },
  { key: 'complete', label: 'Complete' },
] as const

const STAGE_ORDER = STAGES.map((s) => s.key)

interface AnalysisProgressProps {
  stage: AnalysisStage
}

export default function AnalysisProgress({ stage }: AnalysisProgressProps) {
  if (stage === 'idle') return null

  const currentIndex = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number])

  return (
    <div className="w-full py-3" role="progressbar" aria-label="Analysis progress">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const done = currentIndex >= i
          const active = currentIndex === i - 1 || (stage === 'preprocessing' && i === 0)

          return (
            <div key={s.key} className="flex flex-1 items-center gap-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-500
                    ${done ? 'bg-indigo-500' : active ? 'bg-indigo-500/40 animate-pulse' : 'bg-gray-800'}
                  `}
                />
                <span className={`mt-1 text-[10px] font-medium whitespace-nowrap
                  ${done ? 'text-indigo-400' : active ? 'text-indigo-400/60' : 'text-gray-600'}
                `}>
                  {done && i < STAGES.length - 1 ? '\u2713 ' : active ? '\u25CF ' : ''}
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
