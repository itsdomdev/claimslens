import type { LayerName } from '../types/analysis'

const LAYERS: Array<{ id: LayerName; label: string; color: string }> = [
  { id: 'sentiment', label: 'Sentiment', color: 'bg-orange-500' },
  { id: 'intent', label: 'Intent', color: 'bg-purple-500' },
  { id: 'claims', label: 'Claims', color: 'bg-blue-500' },
  { id: 'factcheck', label: 'Fact-Check', color: 'bg-emerald-500' },
  { id: 'fallacies', label: 'Fallacies', color: 'bg-yellow-500' },
]

interface LayerTogglesProps {
  activeLayers: Set<LayerName>
  onToggle: (layer: LayerName) => void
  disabled?: boolean
}

export default function LayerToggles({ activeLayers, onToggle, disabled }: LayerTogglesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LAYERS.map((layer) => {
        const active = activeLayers.has(layer.id)
        return (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`Toggle ${layer.label} layer`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all
              ${active
                ? `${layer.color} text-white shadow-md`
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {layer.label}
          </button>
        )
      })}
    </div>
  )
}
