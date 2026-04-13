export type ReportFormat = 'threads' | 'twitter' | 'square'

export const DIMENSIONS: Record<ReportFormat, { width: number; height: number }> = {
  threads: { width: 1080, height: 1350 },
  twitter: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
}
