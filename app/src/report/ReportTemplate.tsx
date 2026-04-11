import { forwardRef } from 'react'
import type { AnalysisResult, RhetoricalGrade } from '../types/analysis'
import { TONE_COLORS, TONE_LABELS } from '../viz/SentimentRibbon'

const GRADE_COLORS: Record<RhetoricalGrade, string> = {
  A: '#4ade80', B: '#60a5fa', C: '#facc15', D: '#f97316', F: '#ef4444',
}
const GRADE_LABELS: Record<RhetoricalGrade, string> = {
  A: 'Clean', B: 'Minor Issues', C: 'Misleading', D: 'Manipulative', F: 'Deceptive',
}

export type ReportFormat = 'threads' | 'twitter' | 'square'

const DIMENSIONS: Record<ReportFormat, { width: number; height: number }> = {
  threads: { width: 1080, height: 1350 },
  twitter: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
}

interface ReportTemplateProps {
  result: AnalysisResult
  format: ReportFormat
}

const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ result, format }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const grade = result.summary.rhetoricalGrade
    const gradeColor = GRADE_COLORS[grade]

    const truncatedText = result.input.text.length > 280
      ? result.input.text.slice(0, 277) + '...'
      : result.input.text

    // Key findings
    const findings: string[] = []
    const supported = result.claims.filter((c) => c.factCheck?.verdict === 'supported').length
    const contradicted = result.claims.filter((c) => c.factCheck?.verdict === 'contradicted').length
    const misleading = result.claims.filter((c) => c.factCheck?.verdict === 'misleading').length

    if (result.claims.length > 0) {
      const parts = [`${result.claims.length} claims extracted`]
      if (supported > 0) parts.push(`${supported} supported`)
      if (contradicted > 0) parts.push(`${contradicted} false`)
      if (misleading > 0) parts.push(`${misleading} misleading`)
      findings.push(parts.join(', '))
    }
    findings.push(`Dominant intent: ${result.summary.dominantIntent}`)
    if (result.fallacies.length > 0) {
      const worst = result.fallacies.sort((a, b) => {
        const order = { major: 0, moderate: 1, minor: 2 }
        return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
      })[0]
      findings.push(`Fallacy detected: ${worst.name} (${worst.severity})`)
    }
    if (result.summary.oneSentenceSummary) {
      findings.push(result.summary.oneSentenceSummary)
    }

    return (
      <div
        ref={ref}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          padding: format === 'twitter' ? '32px 40px' : '48px 56px',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: format === 'twitter' ? '16px' : '28px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
              ClaimsLens
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              Rhetorical Analysis Engine
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#4b5563' }}>
            {new Date(result.timestamp).toLocaleDateString()}
          </div>
        </div>

        {/* Original text */}
        <div style={{
          backgroundColor: '#111118',
          borderRadius: '12px',
          padding: format === 'twitter' ? '14px 18px' : '20px 24px',
          borderLeft: '3px solid #4f46e5',
          marginBottom: format === 'twitter' ? '16px' : '28px',
          fontSize: format === 'twitter' ? '13px' : '14px',
          lineHeight: '1.6',
          color: '#d1d5db',
        }}>
          "{truncatedText}"
        </div>

        {/* Grade + Score */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginBottom: format === 'twitter' ? '16px' : '28px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: format === 'twitter' ? '52px' : '72px',
              fontWeight: 800,
              color: gradeColor,
              lineHeight: 1,
              textShadow: `0 0 40px ${gradeColor}44`,
            }}>
              {grade}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {GRADE_LABELS[grade]}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: '#e5e7eb' }}>
                {result.summary.manipulationScore}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>/ 100 manipulation score</span>
            </div>

            {/* Mini gauge */}
            <div style={{ height: '6px', backgroundColor: '#1f2028', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${result.summary.manipulationScore}%`,
                borderRadius: '3px',
                background: `linear-gradient(90deg, #4ade80, #facc15, #f97316, #ef4444)`,
              }} />
            </div>
          </div>
        </div>

        {/* Key findings */}
        <div style={{ flex: 1, marginBottom: format === 'twitter' ? '12px' : '20px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Key Findings
          </div>
          {findings.slice(0, format === 'twitter' ? 3 : 4).map((finding, i) => (
            <div key={i} style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start',
              marginBottom: '8px', fontSize: '13px', color: '#d1d5db',
            }}>
              <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>{'\u2022'}</span>
              <span>{finding}</span>
            </div>
          ))}
        </div>

        {/* Sentiment ribbon (miniature) */}
        {format !== 'twitter' && (
          <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', height: '4px' }}>
            {result.sentences.map((s) => (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  backgroundColor: TONE_COLORS[s.sentiment.dominantTone],
                  borderRadius: '2px',
                }}
                title={TONE_LABELS[s.sentiment.dominantTone]}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid #1f2028', paddingTop: '12px',
        }}>
          <div style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>
            claims.anystackdom.dev
          </div>
          <div style={{ fontSize: '11px', color: '#4b5563' }}>
            Analyze any post at claims.anystackdom.dev
          </div>
        </div>
      </div>
    )
  },
)

ReportTemplate.displayName = 'ReportTemplate'

export default ReportTemplate
export { DIMENSIONS }
