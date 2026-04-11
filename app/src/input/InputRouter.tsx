import TextInput from './TextInput'

interface InputRouterProps {
  value: string
  onChange: (text: string) => void
  onAnalyze: () => void
  analyzing: boolean
  readonly?: boolean
}

const TABS = [
  { id: 'paste', label: 'Paste Text', enabled: true },
  { id: 'url', label: 'Paste URL', enabled: false },
  { id: 'screenshot', label: 'Screenshot', enabled: false },
] as const

export default function InputRouter({ value, onChange, onAnalyze, analyzing, readonly }: InputRouterProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            disabled={!tab.enabled}
            className={`px-4 py-2 text-xs font-medium transition-colors
              ${tab.id === 'paste'
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-600 cursor-not-allowed'
              }
            `}
          >
            {tab.label}
            {!tab.enabled && <span className="ml-1 text-[10px] text-gray-700">soon</span>}
          </button>
        ))}
      </div>

      <TextInput
        value={value}
        onChange={onChange}
        onAnalyze={onAnalyze}
        analyzing={analyzing}
        readonly={readonly}
      />
    </div>
  )
}
