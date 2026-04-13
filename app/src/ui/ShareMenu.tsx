import { useState, useRef, useMemo } from 'react'
import type { AnalysisResult } from '../types/analysis'
import type { ReportFormat } from '../report/ReportTemplate'
import OverviewPage from '../report/OverviewPage'
import ClaimsPage from '../report/ClaimsPage'
import ReasoningPage from '../report/ReasoningPage'
import { exportSinglePage, exportMultiplePages, downloadBlob, downloadMultipleBlobs, copyToClipboard } from '../report/ImageExporter'

interface ShareMenuProps {
  result: AnalysisResult
}

type ContentSelection = 'overview' | 'claims' | 'reasoning' | 'carousel'

const FORMAT_OPTIONS: Array<{ id: ReportFormat; label: string; sublabel: string }> = [
  { id: 'threads', label: 'Threads / Instagram', sublabel: '1080 x 1350' },
  { id: 'twitter', label: 'Twitter / X', sublabel: '1200 x 675' },
  { id: 'square', label: 'Square', sublabel: '1080 x 1080' },
]

export default function ShareMenu({ result }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<ReportFormat>('threads')
  const [content, setContent] = useState<ContentSelection>('overview')

  const overviewRef = useRef<HTMLDivElement>(null)
  const claimsRef = useRef<HTMLDivElement>(null)
  const reasoningRef = useRef<HTMLDivElement>(null)

  const hasClaims = result.claims.length > 0
  const hasReasoningContent = result.fallacies.length > 0 ||
    result.summary.dominantIntent !== 'inform' ||
    result.sentences.some((s) => s.intent.statedVsDetected)

  const applicablePages = useMemo(() => {
    const pages: Array<{ id: ContentSelection; label: string }> = [{ id: 'overview', label: 'Overview' }]
    if (hasClaims) pages.push({ id: 'claims', label: 'Claims detail' })
    if (hasReasoningContent) pages.push({ id: 'reasoning', label: 'Reasoning detail' })
    if (pages.length > 1) pages.push({ id: 'carousel', label: `Full carousel (${pages.length} pages)` })
    return pages
  }, [hasClaims, hasReasoningContent])

  const totalPages = 1 + (hasClaims ? 1 : 0) + (hasReasoningContent ? 1 : 0)

  const getPageIndicator = (pageNum: number) => {
    if (totalPages <= 1) return undefined
    return `${pageNum}/${totalPages}`
  }

  const handleExport = async (action: 'download' | 'copy') => {
    setExporting(true)
    try {
      if (content === 'carousel') {
        const elements: HTMLElement[] = []
        const filenames: string[] = []
        if (overviewRef.current) { elements.push(overviewRef.current); filenames.push('claimslens-overview.png') }
        if (hasClaims && claimsRef.current) { elements.push(claimsRef.current); filenames.push('claimslens-claims.png') }
        if (hasReasoningContent && reasoningRef.current) { elements.push(reasoningRef.current); filenames.push('claimslens-reasoning.png') }

        if (action === 'download') {
          const blobs = await exportMultiplePages(elements, format)
          downloadMultipleBlobs(blobs, filenames)
        } else {
          if (overviewRef.current) {
            const blob = await exportSinglePage(overviewRef.current, format)
            await copyToClipboard(blob)
          }
        }
      } else {
        const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
          overview: overviewRef, claims: claimsRef, reasoning: reasoningRef,
        }
        const ref = refMap[content]
        if (!ref?.current) return

        const blob = await exportSinglePage(ref.current, format)
        if (action === 'download') {
          downloadBlob(blob, `claimslens-${content}.png`)
        } else {
          await copyToClipboard(blob)
        }
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
        >
          Export Report
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl">
            {/* Content selection */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Content</label>
              <div className="mt-1 space-y-1">
                {applicablePages.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setContent(opt.id)}
                    className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors
                      ${content === opt.id
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                        : 'hover:bg-gray-800 text-gray-400'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Format</label>
              <div className="mt-1 space-y-1">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors
                      ${format === opt.id
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                        : 'hover:bg-gray-800 text-gray-400'
                      }
                    `}
                  >
                    {opt.label} <span className="text-gray-600">({opt.sublabel})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <button
                onClick={() => handleExport('download')}
                disabled={exporting}
                className="w-full rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {exporting ? 'Generating...' : content === 'carousel' ? 'Download All PNGs' : 'Download PNG'}
              </button>
              <button
                onClick={() => handleExport('copy')}
                disabled={exporting}
                className="w-full rounded border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {content === 'carousel' ? 'Copy Overview to Clipboard' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offscreen report pages for capture */}
      <OverviewPage ref={overviewRef} result={result} format={format} pageIndicator={getPageIndicator(1)} />
      {hasClaims && (
        <ClaimsPage ref={claimsRef} result={result} format={format}
          pageIndicator={getPageIndicator(2)} />
      )}
      {hasReasoningContent && (
        <ReasoningPage ref={reasoningRef} result={result} format={format}
          pageIndicator={getPageIndicator(hasClaims ? 3 : 2)} />
      )}
    </>
  )
}
