import type { AnalysisSummary, RhetoricalGrade } from '../types/analysis'

const GRADE_CONFIG: Record<RhetoricalGrade, { color: string; label: string }> = {
  A: { color: 'text-green-400', label: 'Clean' },
  B: { color: 'text-blue-400', label: 'Minor issues' },
  C: { color: 'text-yellow-400', label: 'Misleading' },
  D: { color: 'text-orange-400', label: 'Manipulative' },
  F: { color: 'text-red-400', label: 'Deceptive' },
}

interface CredibilityDashboardProps {
  summary: AnalysisSummary
}

export default function CredibilityDashboard({ summary }: CredibilityDashboardProps) {
  const grade = GRADE_CONFIG[summary.rhetoricalGrade]

  // Manipulation score color
  const scoreColor = summary.manipulationScore <= 25 ? 'text-green-400'
    : summary.manipulationScore <= 50 ? 'text-yellow-400'
    : summary.manipulationScore <= 75 ? 'text-orange-400'
    : 'text-red-400'

  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-6">
      {/* Rhetorical Grade */}
      <button
        className="text-center group"
        aria-label={`Rhetorical grade: ${summary.rhetoricalGrade}, ${grade.label}`}
      >
        <div className={`text-3xl font-bold ${grade.color} transition-transform group-hover:scale-110`}>
          {summary.rhetoricalGrade}
        </div>
        <div className="text-[10px] text-gray-500">{grade.label}</div>
      </button>

      {/* Manipulation Score */}
      <div className="text-center">
        <div className={`text-2xl font-bold font-mono ${scoreColor}`}>
          {summary.manipulationScore}
        </div>
        <div className="text-[10px] text-gray-500">Manipulation</div>
        {/* Mini gauge */}
        <div className="mt-1 h-1 w-16 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${summary.manipulationScore}%`,
              backgroundColor: summary.manipulationScore <= 25 ? '#4ade80'
                : summary.manipulationScore <= 50 ? '#facc15'
                : summary.manipulationScore <= 75 ? '#f97316'
                : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Claims breakdown */}
      <div className="text-center">
        <div className="text-lg font-medium text-gray-300">
          {summary.totalClaims}
        </div>
        <div className="text-[10px] text-gray-500">Claims</div>
        {summary.totalClaims > 0 && (
          <div className="mt-1 flex gap-0.5 justify-center">
            {Object.entries(summary.claimsByVerdict).map(([verdict, count]) => (
              <div
                key={verdict}
                className="h-1.5 rounded-full min-w-1"
                style={{
                  width: `${(count / summary.totalClaims) * 40}px`,
                  backgroundColor: getVerdictDotColor(verdict),
                }}
                title={`${verdict}: ${count}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fallacy Count */}
      <div className="text-center">
        <div className={`text-lg font-medium ${summary.fallacyCount > 0 ? 'text-yellow-300' : 'text-gray-500'}`}>
          {summary.fallacyCount}
        </div>
        <div className="text-[10px] text-gray-500">Fallacies</div>
      </div>

      {/* Dominant Intent */}
      <div className="text-center">
        <div className="text-sm font-medium text-purple-400">
          {summary.dominantIntent}
        </div>
        <div className="text-[10px] text-gray-500">Intent</div>
      </div>

      {/* Summary */}
      <div className="flex-1 text-right hidden md:block">
        <p className="text-xs text-gray-500 italic leading-relaxed">
          {summary.oneSentenceSummary}
        </p>
      </div>
    </div>
  )
}

function getVerdictDotColor(verdict: string): string {
  const colors: Record<string, string> = {
    supported: '#4ade80',
    contradicted: '#ef4444',
    misleading: '#f59e0b',
    unverifiable: '#6b7280',
    outdated: '#eab308',
    pending: '#4b5563',
  }
  return colors[verdict] || '#4b5563'
}
