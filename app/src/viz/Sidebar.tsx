import { useState } from 'react'
import type { AnalysisResult } from '../types/analysis'
import ClaimCard from './ClaimCard'
import FallacyCard from './FallacyCard'

interface SidebarProps {
  result: AnalysisResult
  onClaimClick?: (claimId: string) => void
}

type SidebarTab = 'claims' | 'fallacies'

export default function Sidebar({ result, onClaimClick }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('claims')
  const [claimFilter, setClaimFilter] = useState<string>('all')

  const filteredClaims = claimFilter === 'all'
    ? result.claims
    : result.claims.filter((c) => c.type === claimFilter)

  const verdictCounts = result.claims.reduce((acc, c) => {
    const v = c.factCheck?.verdict || 'pending'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors
            ${activeTab === 'claims' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}
          `}
        >
          Claims ({result.claims.length})
        </button>
        <button
          onClick={() => setActiveTab('fallacies')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors
            ${activeTab === 'fallacies' ? 'border-b-2 border-yellow-500 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}
          `}
        >
          Fallacies ({result.fallacies.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {activeTab === 'claims' && (
          <>
            {/* Filter buttons */}
            <div className="flex gap-1 flex-wrap">
              {['all', 'factual', 'opinion', 'prediction'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setClaimFilter(filter)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors
                    ${claimFilter === filter ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}
                  `}
                >
                  {filter === 'all' ? 'All' : filter}
                </button>
              ))}
            </div>

            {/* Verdict summary */}
            {Object.keys(verdictCounts).length > 0 && (
              <p className="text-[10px] text-gray-600">
                {Object.entries(verdictCounts).map(([v, c]) => `${c} ${v}`).join(' \u00B7 ')}
              </p>
            )}

            {/* Claim cards */}
            {filteredClaims.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">No claims found.</p>
            )}
            {filteredClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onClick={() => onClaimClick?.(claim.id)}
              />
            ))}
          </>
        )}

        {activeTab === 'fallacies' && (
          <>
            {result.fallacies.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">No fallacies detected.</p>
            )}
            {result.fallacies
              .sort((a, b) => {
                const order = { major: 0, moderate: 1, minor: 2 }
                return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
              })
              .map((fallacy) => (
                <FallacyCard key={fallacy.id} fallacy={fallacy} />
              ))}
          </>
        )}
      </div>
    </div>
  )
}
