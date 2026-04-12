import { useState } from 'react'
import TextInput from './TextInput'
import UrlInput from './UrlInput'
import ScreenshotInput from './ScreenshotInput'

interface InputRouterProps {
  value: string
  onChange: (text: string) => void
  onAnalyze: () => void
  onSourceChange: (source: 'paste' | 'url' | 'screenshot') => void
  analyzing: boolean
  readonly?: boolean
}

type InputTab = 'paste' | 'url' | 'screenshot'

const TABS: Array<{ id: InputTab; label: string }> = [
  { id: 'paste', label: 'Paste Text' },
  { id: 'url', label: 'Paste URL' },
  { id: 'screenshot', label: 'Screenshot' },
]

export default function InputRouter({ value, onChange, onAnalyze, onSourceChange, analyzing, readonly }: InputRouterProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('paste')

  const handleTabChange = (tab: InputTab) => {
    setActiveTab(tab)
    onSourceChange(tab)
  }

  // When URL or screenshot extraction succeeds, switch to paste view to show the text
  const handleExtracted = (text: string) => {
    onChange(text)
    setActiveTab('paste')
    onSourceChange('paste')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={analyzing || readonly}
            className={`px-4 py-2 text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
              }
              ${analyzing || readonly ? 'cursor-not-allowed opacity-60' : ''}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'paste' && (
        <TextInput
          value={value}
          onChange={onChange}
          onAnalyze={onAnalyze}
          analyzing={analyzing}
          readonly={readonly}
        />
      )}
      {activeTab === 'url' && (
        <UrlInput
          onChange={handleExtracted}
          disabled={analyzing || readonly}
        />
      )}
      {activeTab === 'screenshot' && (
        <ScreenshotInput
          onChange={handleExtracted}
          disabled={analyzing || readonly}
        />
      )}
    </div>
  )
}
