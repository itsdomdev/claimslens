import { useState } from 'react'
import type { SentenceAnalysis, LayerName } from '../types/analysis'
import SentimentRibbon from './SentimentRibbon'
import IntentBadge from './IntentBadge'
import ClaimHighlight from './ClaimHighlight'
import FallacyAnnotation from './FallacyAnnotation'
import FeatureInspector from './FeatureInspector'

interface TextOverlayProps {
  sentences: SentenceAnalysis[]
  activeLayers: Set<LayerName>
  onClaimClick?: (claimId: string) => void
}

export default function TextOverlay({ sentences, activeLayers, onClaimClick }: TextOverlayProps) {
  const [inspectedSentence, setInspectedSentence] = useState<SentenceAnalysis | null>(null)

  return (
    <>
      <div className="space-y-2">
        {sentences.map((sentence) => (
          <div
            key={sentence.id}
            className="group relative rounded-md p-2 hover:bg-gray-900/50 transition-colors"
            data-sentence-id={sentence.id}
          >
            {/* Sentiment ribbon */}
            {activeLayers.has('sentiment') && (
              <SentimentRibbon
                sentiment={sentence.sentiment}
                onClick={() => setInspectedSentence(sentence)}
              />
            )}

            <div className="pl-3">
              {/* Sentence text */}
              <span className="text-sm leading-relaxed text-gray-200">
                {sentence.text}
              </span>

              {/* Intent badge */}
              {activeLayers.has('intent') && (
                <IntentBadge
                  intent={sentence.intent}
                  onClick={() => setInspectedSentence(sentence)}
                />
              )}
            </div>

            {/* Claim highlights */}
            {activeLayers.has('claims') && sentence.claims.length > 0 && (
              <div className="mt-1 pl-3 space-y-1">
                {sentence.claims.map((claim) => (
                  <ClaimHighlight
                    key={claim.id}
                    claim={claim}
                    showFactCheck={activeLayers.has('factcheck')}
                    onClick={() => onClaimClick?.(claim.id)}
                  />
                ))}
              </div>
            )}

            {/* Fallacy annotations */}
            {activeLayers.has('fallacies') && sentence.fallacies.length > 0 && (
              <div className="mt-1 pl-3 space-y-1">
                {sentence.fallacies.map((fallacy) => (
                  <FallacyAnnotation
                    key={fallacy.id}
                    fallacy={fallacy}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Feature Inspector modal */}
      {inspectedSentence && (
        <FeatureInspector
          sentence={inspectedSentence}
          onClose={() => setInspectedSentence(null)}
        />
      )}
    </>
  )
}
