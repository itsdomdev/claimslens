import { forwardRef } from 'react'
import type { AnalysisResult, IntentLabel } from '../types/analysis'
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'
import { pageStyle, ReportHeader, ReportFooter } from './ReportShared'

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#facc15', moderate: '#f97316', major: '#ef4444',
}
const INTENT_COLORS: Record<IntentLabel, string> = {
  inform: '#3b82f6', persuade: '#6366f1', sell: '#22c55e', mislead: '#ef4444',
  deflect: '#f97316', provoke: '#dc2626', establish_authority: '#8b5cf6',
  build_trust: '#06b6d4', create_urgency: '#f59e0b', virtue_signal: '#ec4899',
  concern_troll: '#f97316', entertain: '#a3e635',
}
const INTENT_LABELS: Record<IntentLabel, string> = {
  inform: 'Inform', persuade: 'Persuade', sell: 'Sell', mislead: 'Mislead',
  deflect: 'Deflect', provoke: 'Provoke', establish_authority: 'Authority',
  build_trust: 'Trust', create_urgency: 'Urgency', virtue_signal: 'Virtue Signal',
  concern_troll: 'Concern Troll', entertain: 'Entertain',
}

interface ReasoningPageProps {
  result: AnalysisResult
  format: ReportFormat
  pageIndicator?: string
}

const ReasoningPage = forwardRef<HTMLDivElement, ReasoningPageProps>(
  ({ result, format, pageIndicator }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const maxFallacies = format === 'twitter' ? 2 : 4
    const visibleFallacies = [...result.fallacies]
      .sort((a, b) => {
        const order = { major: 0, moderate: 1, minor: 2 }
        return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
      })
      .slice(0, maxFallacies)

    const intentTotals: Record<string, number> = {}
    for (const s of result.sentences) {
      for (const [intent, score] of Object.entries(s.intent.distribution)) {
        intentTotals[intent] = (intentTotals[intent] || 0) + score
      }
    }
    const sentenceCount = Math.max(result.sentences.length, 1)
    const topIntents = Object.entries(intentTotals)
      .map(([intent, total]) => ({ intent: intent as IntentLabel, score: total / sentenceCount }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
    const maxIntentScore = topIntents[0]?.score || 1

    const mismatch = result.sentences.find((s) => s.intent.statedVsDetected)?.intent.statedVsDetected

    return (
      <div ref={ref} style={pageStyle(format, width, height)}>
        <ReportHeader title="Reasoning Analysis" timestamp={result.timestamp} pageIndicator={pageIndicator} format={format} />

        <div style={{ marginBottom: format === 'twitter' ? '16px' : '28px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Logical Fallacies
          </div>
          {result.fallacies.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#111118', borderRadius: '10px' }}>
              <span style={{ color: '#4ade80', fontSize: '16px' }}>{'\u2713'}</span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>No logical fallacies detected</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visibleFallacies.map((f) => (
                <div key={f.id} style={{
                  backgroundColor: '#111118', borderRadius: '10px',
                  padding: format === 'twitter' ? '10px 14px' : '12px 16px',
                  borderLeft: `3px solid ${SEVERITY_COLORS[f.severity] || '#f97316'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{f.name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: SEVERITY_COLORS[f.severity] || '#f97316',
                      backgroundColor: `${SEVERITY_COLORS[f.severity] || '#f97316'}18`,
                      borderRadius: '4px', padding: '2px 8px',
                    }}>
                      {f.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.4' }}>
                    {f.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Detected Intent
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: INTENT_COLORS[result.summary.dominantIntent] || '#6b7280' }}>
              {INTENT_LABELS[result.summary.dominantIntent] || result.summary.dominantIntent}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
              {Math.round(topIntents[0]?.score * 100 || 0)}%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topIntents.map(({ intent, score }) => (
              <div key={intent} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', width: '80px', textAlign: 'right' }}>
                  {INTENT_LABELS[intent] || intent}
                </span>
                <div style={{ flex: 1, height: '8px', backgroundColor: '#1f2028', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    width: `${(score / maxIntentScore) * 100}%`,
                    backgroundColor: INTENT_COLORS[intent] || '#6b7280',
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', width: '32px' }}>
                  {Math.round(score * 100)}%
                </span>
              </div>
            ))}
          </div>
          {mismatch && (
            <div style={{
              marginTop: '16px', padding: '10px 14px', backgroundColor: '#f59e0b12',
              borderRadius: '8px', border: '1px solid #f59e0b30',
            }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                {'\u26A0'} Intent Mismatch Detected
              </div>
              <div style={{ fontSize: '11px', color: '#d1d5db', lineHeight: '1.4' }}>
                {mismatch.mismatchExplanation}
              </div>
            </div>
          )}
        </div>

        <ReportFooter />
      </div>
    )
  },
)

ReasoningPage.displayName = 'ReasoningPage'
export default ReasoningPage
