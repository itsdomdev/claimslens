import type { SentenceAnalysis, FeatureWeight, ToneLabel } from '../types/analysis'
import { TONE_COLORS, TONE_LABELS } from './SentimentRibbon'

interface FeatureInspectorProps {
  sentence: SentenceAnalysis
  onClose: () => void
}

export default function FeatureInspector({ sentence, onClose }: FeatureInspectorProps) {
  const sentimentWeights = sentence.sentiment.featureWeights
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  const intentWeights = sentence.intent.featureWeights
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Feature Inspector</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Close inspector"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Sentence text with highlighted words */}
        <div className="mb-6 rounded-lg bg-gray-950 p-3">
          <HighlightedText text={sentence.text} weights={sentimentWeights} />
        </div>

        {/* Sentiment breakdown */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Sentiment Analysis</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-20">Tone:</span>
              <span
                className="rounded px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: TONE_COLORS[sentence.sentiment.dominantTone], color: '#000' }}
              >
                {TONE_LABELS[sentence.sentiment.dominantTone]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-20">Valence:</span>
              <span className="text-gray-300 font-mono">{sentence.sentiment.valence.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-20">Arousal:</span>
              <span className="text-gray-300 font-mono">{sentence.sentiment.arousal.toFixed(2)}</span>
            </div>
          </div>

          {/* Tone scores bar chart */}
          <div className="mt-3 space-y-1">
            {Object.entries(sentence.sentiment.toneScores)
              .filter(([, v]) => v > 0.05)
              .sort(([, a], [, b]) => b - a)
              .map(([tone, score]) => (
                <div key={tone} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-28 text-right truncate">
                    {TONE_LABELS[tone as ToneLabel]}
                  </span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(score * 100)}%`,
                        backgroundColor: TONE_COLORS[tone as ToneLabel],
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono w-8">{Math.round(score * 100)}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Feature weights */}
        {sentimentWeights.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Top Contributing Words (Sentiment)</h4>
            <div className="space-y-1">
              {sentimentWeights.slice(0, 8).map((fw, i) => (
                <FeatureWeightRow key={i} fw={fw} />
              ))}
            </div>
          </div>
        )}

        {/* Intent breakdown */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Intent Analysis</h4>
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="text-gray-500">Primary:</span>
            <span className="text-purple-300 font-medium">{sentence.intent.primaryIntent}</span>
            <span className="text-gray-600 font-mono">({Math.round(sentence.intent.confidence * 100)}%)</span>
          </div>
          {sentence.intent.statedVsDetected && (
            <div className="rounded bg-amber-950/30 border border-amber-800/30 p-2 text-xs text-amber-300 mb-2">
              {'\u26A0'} {sentence.intent.statedVsDetected.mismatchExplanation}
            </div>
          )}
        </div>

        {intentWeights.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Top Contributing Words (Intent)</h4>
            <div className="space-y-1">
              {intentWeights.slice(0, 8).map((fw, i) => (
                <FeatureWeightRow key={i} fw={fw} />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-600">
            Feature weights show how much each word contributed to the classification.
            Positive weights push toward the detected tone/intent; negative weights push away.
          </p>
        </div>
      </div>
    </div>
  )
}

function HighlightedText({ text, weights }: { text: string; weights: FeatureWeight[] }) {
  if (weights.length === 0) {
    return <span className="text-sm text-gray-300">{text}</span>
  }

  // Create highlighted spans
  const segments: Array<{ text: string; weight: number; direction: string }> = []
  let lastEnd = 0

  for (const fw of weights.sort((a, b) => a.startIndex - b.startIndex)) {
    if (fw.startIndex > lastEnd) {
      segments.push({ text: text.slice(lastEnd, fw.startIndex), weight: 0, direction: '' })
    }
    segments.push({ text: text.slice(fw.startIndex, fw.endIndex), weight: fw.weight, direction: fw.direction })
    lastEnd = fw.endIndex
  }
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), weight: 0, direction: '' })
  }

  return (
    <span className="text-sm leading-relaxed">
      {segments.map((seg, i) => (
        <span
          key={i}
          className={seg.weight !== 0 ? 'rounded px-0.5' : ''}
          style={seg.weight !== 0 ? {
            backgroundColor: `${TONE_COLORS[seg.direction as ToneLabel] || '#6b7280'}33`,
            borderBottom: `2px solid ${TONE_COLORS[seg.direction as ToneLabel] || '#6b7280'}`,
          } : undefined}
        >
          {seg.text}
        </span>
      ))}
    </span>
  )
}

function FeatureWeightRow({ fw }: { fw: FeatureWeight }) {
  const isPositive = fw.weight > 0
  const barWidth = Math.min(100, Math.abs(fw.weight) * 100)

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-gray-400 w-24 truncate text-right">{fw.token}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            left: isPositive ? '50%' : `${50 - barWidth}%`,
            backgroundColor: TONE_COLORS[fw.direction as ToneLabel] || '#6b7280',
          }}
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-700" />
      </div>
      <span className={`text-[10px] font-mono w-10 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {fw.weight > 0 ? '+' : ''}{fw.weight.toFixed(2)}
      </span>
    </div>
  )
}
