import { useState, useRef } from 'react'
import type { AnalysisResult } from '../types/analysis'
import type { ReportFormat } from '../report/ReportTemplate'
import ReportTemplate from '../report/ReportTemplate'
import { exportReport, downloadBlob, copyToClipboard } from '../report/ImageExporter'

interface ShareMenuProps {
  result: AnalysisResult
}

const FORMAT_OPTIONS: Array<{ id: ReportFormat; label: string; sublabel: string }> = [
  { id: 'threads', label: 'Threads / Instagram', sublabel: '1080 x 1350' },
  { id: 'twitter', label: 'Twitter / X', sublabel: '1200 x 675' },
  { id: 'square', label: 'Square', sublabel: '1080 x 1080' },
]

export default function ShareMenu({ result }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<ReportFormat>('threads')
  const reportRef = useRef<HTMLDivElement>(null)

  const handleExport = async (action: 'download' | 'copy') => {
    if (!reportRef.current) return
    setExporting(true)

    try {
      const blob = await exportReport(reportRef.current, format)

      if (action === 'download') {
        downloadBlob(blob, `claimslens-report-${format}.png`)
      } else {
        await copyToClipboard(blob)
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
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl">
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
                {exporting ? 'Generating...' : 'Download PNG'}
              </button>
              <button
                onClick={() => handleExport('copy')}
                disabled={exporting}
                className="w-full rounded border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offscreen report template for capture */}
      <ReportTemplate ref={reportRef} result={result} format={format} />
    </>
  )
}
