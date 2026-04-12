import { useState, useRef } from 'react'
import { ClaimsLensAPI } from '../api/client'

interface ScreenshotInputProps {
  onChange: (text: string) => void
  disabled?: boolean
}

const api = new ClaimsLensAPI()
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ScreenshotInput({ onChange, disabled }: ScreenshotInputProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validateAndSet = (f: File) => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported format. Use PNG, JPEG, or WebP.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.extractFromScreenshot(file)
      onChange(result.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from screenshot')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors
            ${dragOver ? 'border-indigo-500 bg-indigo-950/20' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}
            ${disabled ? 'opacity-40 pointer-events-none' : ''}
          `}
          role="button"
          aria-label="Upload screenshot"
        >
          <p className="text-sm text-gray-400">Drop a screenshot here or click to browse</p>
          <p className="mt-1 text-[10px] text-gray-600">PNG, JPEG, or WebP up to 5MB</p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
          {preview && (
            <img src={preview} alt="Screenshot preview" className="h-20 w-20 rounded object-cover" />
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-300">{file.name}</p>
            <p className="text-[10px] text-gray-600">{(file.size / 1024).toFixed(0)} KB</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleExtract}
                disabled={loading || disabled}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white transition-all
                  ${loading ? 'bg-indigo-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}
                `}
              >
                {loading ? 'Extracting...' : 'Extract Text'}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="rounded px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f) }}
        className="hidden"
      />

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300">
          {error}
          <span className="ml-2 text-gray-500">Try pasting the text directly instead.</span>
        </div>
      )}
    </div>
  )
}
