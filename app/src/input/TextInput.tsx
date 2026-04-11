import { EXAMPLE_POSTS } from '../ui/ExamplePosts'

interface TextInputProps {
  value: string
  onChange: (text: string) => void
  onAnalyze: () => void
  analyzing: boolean
  readonly?: boolean
}

const MAX_CHARS = 5000

export default function TextInput({ value, onChange, onAnalyze, analyzing, readonly }: TextInputProps) {
  const charCount = value.length
  const tooShort = charCount > 0 && charCount < 10
  const tooLong = charCount > MAX_CHARS

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readonly || analyzing}
          placeholder="Paste any social media post..."
          rows={5}
          className={`w-full resize-none rounded-lg border bg-gray-900 p-4 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors
            ${tooLong ? 'border-red-500' : 'border-gray-800 focus:border-indigo-500'}
            ${readonly ? 'opacity-80' : ''}
          `}
          aria-label="Social media post text"
        />
        <span className={`absolute bottom-2 right-3 text-xs ${tooLong ? 'text-red-400' : 'text-gray-600'}`}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {tooShort && (
        <p className="text-xs text-yellow-500">Text too short for analysis (minimum 10 characters).</p>
      )}
      {tooLong && (
        <p className="text-xs text-red-400">Text exceeds maximum length. Please shorten to {MAX_CHARS} characters.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onAnalyze}
          disabled={analyzing || charCount < 10 || tooLong}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all
            ${analyzing
              ? 'bg-indigo-700 cursor-wait'
              : charCount < 10 || tooLong
                ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-500/20 animate-[pulse_3s_ease-in-out_infinite]'
            }
          `}
        >
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </button>

        <div className="flex gap-2 overflow-x-auto">
          {EXAMPLE_POSTS.map((example) => (
            <button
              key={example.label}
              onClick={() => onChange(example.text)}
              disabled={analyzing}
              className="whitespace-nowrap rounded-md border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-200 disabled:opacity-40"
            >
              <span className="mr-1">{example.emoji}</span>
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
