import type { ReportFormat } from './ReportTemplate'

export const REPORT_BG = 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)'

export function pageStyle(format: ReportFormat, width: number, height: number): React.CSSProperties {
  return {
    width: `${width}px`,
    height: `${height}px`,
    background: REPORT_BG,
    color: '#e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    padding: format === 'twitter' ? '32px 40px' : '48px 56px',
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    overflow: 'hidden',
  }
}

interface ReportHeaderProps {
  title?: string
  pageIndicator?: string
  timestamp: string
  format: ReportFormat
}

export function ReportHeader({ title, pageIndicator, timestamp, format }: ReportHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: format === 'twitter' ? '16px' : '28px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
          ClaimsLens
        </div>
        {title && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{title}</div>
        )}
        {!title && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Rhetorical Analysis Engine</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {pageIndicator && (
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>{pageIndicator}</div>
        )}
        <div style={{ fontSize: '10px', color: '#4b5563' }}>
          {new Date(timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

export function ReportFooter() {
  return null
}
