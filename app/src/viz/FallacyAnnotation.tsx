import type { Fallacy } from '../types/analysis'

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  minor: { bg: 'bg-yellow-950/30', border: 'border-yellow-800/30', text: 'text-yellow-300' },
  moderate: { bg: 'bg-orange-950/30', border: 'border-orange-800/30', text: 'text-orange-300' },
  major: { bg: 'bg-red-950/30', border: 'border-red-800/30', text: 'text-red-300' },
}

interface FallacyAnnotationProps {
  fallacy: Fallacy
  onClick?: () => void
}

export default function FallacyAnnotation({ fallacy, onClick }: FallacyAnnotationProps) {
  const style = SEVERITY_STYLES[fallacy.severity] || SEVERITY_STYLES.moderate

  return (
    <div
      className={`rounded ${style.bg} border ${style.border} px-2 py-1 text-xs cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onClick}
      role="button"
      aria-label={`Fallacy: ${fallacy.name} (${fallacy.severity})`}
    >
      <span className={`font-medium ${style.text}`}>{fallacy.name}</span>
      <span className="ml-2 text-gray-500">({fallacy.severity})</span>
    </div>
  )
}
