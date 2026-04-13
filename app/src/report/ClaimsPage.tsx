import { forwardRef } from 'react'
import type { AnalysisResult, Verdict } from '../types/analysis'
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'
import { pageStyle, ReportHeader, ReportFooter } from './ReportShared'

const VERDICT_COLORS: Record<Verdict | 'pending', string> = {
  supported: '#4ade80', contradicted: '#ef4444', misleading: '#f59e0b',
  unverifiable: '#6b7280', outdated: '#eab308', pending: '#6b7280',
}
const VERDICT_BG: Record<Verdict | 'pending', string> = {
  supported: '#4ade8018', contradicted: '#ef444418', misleading: '#f59e0b18',
  unverifiable: '#6b728018', outdated: '#eab30818', pending: '#6b728018',
}

interface ClaimsPageProps {
  result: AnalysisResult
  format: ReportFormat
  pageIndicator?: string
}

const ClaimsPage = forwardRef<HTMLDivElement, ClaimsPageProps>(
  ({ result, format, pageIndicator }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const maxClaims = format === 'twitter' ? 3 : 5
    const visibleClaims = result.claims.slice(0, maxClaims)
    const remainingCount = result.claims.length - visibleClaims.length

    return (
      <div ref={ref} style={pageStyle(format, width, height)}>
        <ReportHeader title="Claims Analysis" timestamp={result.timestamp} pageIndicator={pageIndicator} format={format} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: format === 'twitter' ? '8px' : '12px' }}>
          {visibleClaims.map((claim) => {
            const verdict = claim.factCheck?.verdict || 'pending'
            const verdictColor = VERDICT_COLORS[verdict]
            return (
              <div key={claim.id} style={{
                backgroundColor: '#111118', borderRadius: '10px',
                padding: format === 'twitter' ? '10px 14px' : '14px 18px',
                borderLeft: `3px solid ${verdictColor}`,
              }}>
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', marginBottom: '8px' }}>
                  "{claim.text.length > 120 ? claim.text.slice(0, 117) + '...' : claim.text}"
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', backgroundColor: '#1f2028', borderRadius: '4px', padding: '2px 8px' }}>
                    {claim.type}
                  </span>
                  {claim.factCheck && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: verdictColor, backgroundColor: VERDICT_BG[verdict], borderRadius: '4px', padding: '2px 8px' }}>
                      {claim.factCheck.verdict} ({Math.round(claim.factCheck.confidence * 100)}%)
                    </span>
                  )}
                  {claim.hedging?.detected && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#f59e0b', backgroundColor: '#f59e0b18', borderRadius: '4px', padding: '2px 8px' }}>
                      hedging
                    </span>
                  )}
                </div>
                {claim.factCheck?.explanation && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', lineHeight: '1.4' }}>
                    {claim.factCheck.explanation.length > 100 ? claim.factCheck.explanation.slice(0, 97) + '...' : claim.factCheck.explanation}
                  </div>
                )}
              </div>
            )
          })}
          {remainingCount > 0 && (
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px' }}>
              +{remainingCount} more claim{remainingCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
        <ReportFooter />
      </div>
    )
  },
)

ClaimsPage.displayName = 'ClaimsPage'
export default ClaimsPage
