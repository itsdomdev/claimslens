import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'

/**
 * Export a report template element as a PNG blob.
 * Uses html2canvas (lazy-loaded to reduce initial bundle).
 */
export async function exportReport(
  element: HTMLElement,
  format: ReportFormat,
): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')

  const { width, height } = DIMENSIONS[format]

  const canvas = await html2canvas(element, {
    width,
    height,
    scale: 2, // 2x for crisp text on retina
    backgroundColor: '#0a0a0f',
    logging: false,
    useCORS: true,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate image'))
      },
      'image/png',
      1.0,
    )
  })
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copy a blob to the clipboard.
 */
export async function copyToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}
