import { useState } from 'react'
import { ClaimsLensAPI } from '../api/client'

interface UrlInputProps {
  onChange: (text: string) => void
  disabled?: boolean
}

const api = new ClaimsLensAPI()

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function UrlInput({ onChange, disabled }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = isValidUrl(url)

  const handleExtract = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.unfurlUrl(url)
      onChange(result.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          placeholder="https://twitter.com/user/status/..."
          disabled={disabled || loading}
          className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors focus:border-indigo-500"
          aria-label="Social media post URL"
        />
        <button
          onClick={handleExtract}
          disabled={!valid || loading || disabled}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all
            ${loading ? 'bg-indigo-700 cursor-wait' : !valid ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-indigo-600 hover:bg-indigo-500'}
          `}
        >
          {loading ? 'Extracting...' : 'Extract'}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300">
          {error}
          <span className="ml-2 text-gray-500">Try pasting the text directly instead.</span>
        </div>
      )}
    </div>
  )
}
