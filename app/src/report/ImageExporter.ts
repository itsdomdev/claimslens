import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'

/**
 * Export a single report page element as a PNG blob.
 */
export async function exportSinglePage(
  element: HTMLElement,
  format: ReportFormat,
): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')

  const { width, height } = DIMENSIONS[format]

  const canvas = await html2canvas(element, {
    width,
    height,
    scale: 2,
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
 * Export multiple report page elements as PNG blobs.
 */
export async function exportMultiplePages(
  elements: HTMLElement[],
  format: ReportFormat,
): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (const element of elements) {
    blobs.push(await exportSinglePage(element, format))
  }
  return blobs
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
 * Download multiple blobs as separate files.
 */
export function downloadMultipleBlobs(blobs: Blob[], filenames: string[]): void {
  for (let i = 0; i < blobs.length; i++) {
    downloadBlob(blobs[i], filenames[i])
  }
}

/**
 * Copy a blob to the clipboard.
 */
export async function copyToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}
