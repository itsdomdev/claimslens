import { useReducer, useCallback } from 'react'
import type { AnalysisResult, AnalysisStage, LayerName, ProgressUpdate } from './types/analysis'
import { AnalysisOrchestrator } from './analysis/orchestrator'
import Layout from './ui/Layout'
import InputRouter from './input/InputRouter'
import AnalysisProgress from './ui/AnalysisProgress'
import LayerToggles from './ui/LayerToggles'

interface AppState {
  inputText: string
  analysisState: 'idle' | 'analyzing' | 'complete' | 'error'
  analysisResult: AnalysisResult | null
  progressStage: AnalysisStage
  activeLayers: Set<LayerName>
  error: string | null
}

type AppAction =
  | { type: 'SET_INPUT'; text: string }
  | { type: 'START_ANALYSIS' }
  | { type: 'PROGRESS'; update: ProgressUpdate }
  | { type: 'COMPLETE'; result: AnalysisResult }
  | { type: 'ERROR'; error: string }
  | { type: 'TOGGLE_LAYER'; layer: LayerName }
  | { type: 'RESET' }

const ALL_LAYERS: LayerName[] = ['sentiment', 'intent', 'claims', 'factcheck', 'fallacies']

const initialState: AppState = {
  inputText: '',
  analysisState: 'idle',
  analysisResult: null,
  progressStage: 'idle',
  activeLayers: new Set(ALL_LAYERS),
  error: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputText: action.text }
    case 'START_ANALYSIS':
      return {
        ...state,
        analysisState: 'analyzing',
        analysisResult: null,
        progressStage: 'preprocessing',
        error: null,
      }
    case 'PROGRESS':
      return {
        ...state,
        progressStage: action.update.stage,
        analysisResult: action.update.result || state.analysisResult,
      }
    case 'COMPLETE':
      return {
        ...state,
        analysisState: 'complete',
        analysisResult: action.result,
        progressStage: 'complete',
      }
    case 'ERROR':
      return {
        ...state,
        analysisState: 'error',
        error: action.error,
        progressStage: 'error',
      }
    case 'TOGGLE_LAYER': {
      const next = new Set(state.activeLayers)
      if (next.has(action.layer)) {
        next.delete(action.layer)
      } else {
        next.add(action.layer)
      }
      return { ...state, activeLayers: next }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const orchestrator = new AnalysisOrchestrator()

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const handleAnalyze = useCallback(async () => {
    dispatch({ type: 'START_ANALYSIS' })

    try {
      const result = await orchestrator.analyze(
        { text: state.inputText, source: 'paste' },
        (update) => dispatch({ type: 'PROGRESS', update }),
      )
      dispatch({ type: 'COMPLETE', result })
    } catch (e) {
      dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : 'Analysis failed' })
    }
  }, [state.inputText])

  const isAnalyzing = state.analysisState === 'analyzing'
  const isComplete = state.analysisState === 'complete'
  const result = state.analysisResult

  return (
    <Layout
      topBar={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-white">ClaimsLens</h1>
            <span className="hidden text-xs text-gray-500 sm:inline">Rhetorical Analysis Engine</span>
          </div>
          <LayerToggles
            activeLayers={state.activeLayers}
            onToggle={(layer) => dispatch({ type: 'TOGGLE_LAYER', layer })}
            disabled={!isComplete}
          />
        </div>
      }
      input={
        <InputRouter
          value={state.inputText}
          onChange={(text) => dispatch({ type: 'SET_INPUT', text })}
          onAnalyze={handleAnalyze}
          analyzing={isAnalyzing}
          readonly={isComplete}
        />
      }
      progress={
        <AnalysisProgress stage={state.progressStage} />
      }
      mainContent={
        <div className="min-h-[200px]">
          {state.error && (
            <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
              {state.error}
            </div>
          )}
          {!isComplete && !isAnalyzing && !state.error && (
            <div className="flex h-full items-center justify-center text-gray-600">
              <p className="text-center text-sm">
                Paste a social media post and hit <strong>Analyze</strong> to see the rhetorical breakdown.
              </p>
            </div>
          )}
          {(isAnalyzing || isComplete) && result?.sentences && (
            <div className="space-y-2">
              {result.sentences.map((sentence) => (
                <div key={sentence.id} className="group relative rounded-md p-2 hover:bg-gray-900/50">
                  {/* Sentiment ribbon */}
                  {state.activeLayers.has('sentiment') && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                      style={{ backgroundColor: getToneColor(sentence.sentiment.dominantTone) }}
                      title={`Tone: ${sentence.sentiment.dominantTone}`}
                    />
                  )}
                  <div className="pl-3">
                    <span className="text-sm leading-relaxed text-gray-200">
                      {sentence.text}
                    </span>
                    {/* Intent badge */}
                    {state.activeLayers.has('intent') && (
                      <span
                        className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: getIntentColor(sentence.intent.primaryIntent),
                          opacity: Math.max(0.4, sentence.intent.confidence),
                        }}
                        title={`Intent: ${sentence.intent.primaryIntent} (${Math.round(sentence.intent.confidence * 100)}%)`}
                      >
                        {sentence.intent.primaryIntent}
                        {sentence.intent.statedVsDetected && ' \u26A0\uFE0F'}
                      </span>
                    )}
                  </div>
                  {/* Claim underlines */}
                  {state.activeLayers.has('claims') && sentence.claims.length > 0 && (
                    <div className="mt-1 pl-3 space-y-1">
                      {sentence.claims.map((claim) => (
                        <div
                          key={claim.id}
                          className="text-xs border-l-2 pl-2"
                          style={{ borderColor: getVerdictColor(claim.factCheck?.verdict) }}
                        >
                          <span className="text-gray-400">{claim.type}</span>
                          {state.activeLayers.has('factcheck') && claim.factCheck && (
                            <span
                              className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: getVerdictColor(claim.factCheck.verdict), color: '#000' }}
                            >
                              {claim.factCheck.verdict}
                            </span>
                          )}
                          {claim.hedging?.detected && (
                            <span className="ml-2 text-[10px] text-amber-400" title={claim.hedging.effect}>
                              hedging: "{claim.hedging.hedgePhrase}"
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Fallacy annotations */}
                  {state.activeLayers.has('fallacies') && sentence.fallacies.length > 0 && (
                    <div className="mt-1 pl-3 space-y-1">
                      {sentence.fallacies.map((fallacy) => (
                        <div
                          key={fallacy.id}
                          className="rounded bg-yellow-950/50 border border-yellow-800/30 px-2 py-1 text-xs text-yellow-300"
                        >
                          <span className="font-medium">{fallacy.name}</span>
                          <span className="ml-2 text-yellow-500">({fallacy.severity})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      }
      sidebar={
        <div className="p-4">
          {isComplete && result ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-300">Claims ({result.claims.length})</h2>
              {result.claims.length === 0 && (
                <p className="text-xs text-gray-600">No claims extracted.</p>
              )}
              {result.claims.map((claim) => (
                <div key={claim.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3 space-y-2">
                  <p className="text-xs text-gray-300 leading-relaxed">"{claim.text}"</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                      {claim.type}
                    </span>
                    {claim.factCheck && (
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: getVerdictColor(claim.factCheck.verdict), color: '#000' }}
                      >
                        {claim.factCheck.verdict} ({Math.round(claim.factCheck.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                  {claim.factCheck?.explanation && (
                    <p className="text-[11px] text-gray-500">{claim.factCheck.explanation}</p>
                  )}
                  {claim.factCheck?.missingContext && (
                    <p className="text-[11px] text-amber-500/80">
                      Missing context: {claim.factCheck.missingContext}
                    </p>
                  )}
                  {claim.hedging?.detected && (
                    <p className="text-[11px] text-amber-400/60">
                      Hedging: "{claim.hedging.hedgePhrase}" - {claim.hedging.effect}
                    </p>
                  )}
                </div>
              ))}

              {result.fallacies.length > 0 && (
                <>
                  <h2 className="mt-6 text-sm font-semibold text-gray-300">Fallacies ({result.fallacies.length})</h2>
                  {result.fallacies.map((fallacy) => (
                    <div key={fallacy.id} className="rounded-lg border border-yellow-800/30 bg-yellow-950/20 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-yellow-300">{fallacy.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium
                          ${fallacy.severity === 'major' ? 'bg-red-500/20 text-red-300'
                            : fallacy.severity === 'moderate' ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-yellow-500/20 text-yellow-300'}
                        `}>
                          {fallacy.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">{fallacy.explanation}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-700">
              <p className="text-xs">Analysis results will appear here.</p>
            </div>
          )}
        </div>
      }
      dashboard={
        isComplete && result ? (
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getGradeColor(result.summary.rhetoricalGrade)}`}>
                {result.summary.rhetoricalGrade}
              </div>
              <div className="text-[10px] text-gray-500">Grade</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-200 font-mono">
                {result.summary.manipulationScore}
              </div>
              <div className="text-[10px] text-gray-500">Manipulation</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-300">
                {result.summary.totalClaims}
              </div>
              <div className="text-[10px] text-gray-500">Claims</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-300">
                {result.summary.fallacyCount}
              </div>
              <div className="text-[10px] text-gray-500">Fallacies</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-purple-400">
                {result.summary.dominantIntent}
              </div>
              <div className="text-[10px] text-gray-500">Intent</div>
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-500">{result.summary.oneSentenceSummary}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-700">
            Credibility dashboard
          </div>
        )
      }
    />
  )
}

function getToneColor(tone: string): string {
  const colors: Record<string, string> = {
    neutral: '#6b7280',
    fear_appeal: '#ef4444',
    urgency: '#f59e0b',
    outrage: '#dc2626',
    flattery: '#f472b6',
    false_calm: '#2dd4bf',
    manufactured_authority: '#a855f7',
    sarcasm: '#a3e635',
    empathy: '#60a5fa',
    celebration: '#4ade80',
  }
  return colors[tone] || '#6b7280'
}

function getIntentColor(intent: string): string {
  const colors: Record<string, string> = {
    inform: '#3b82f6',
    persuade: '#6366f1',
    sell: '#22c55e',
    mislead: '#ef4444',
    deflect: '#f97316',
    provoke: '#dc2626',
    establish_authority: '#8b5cf6',
    build_trust: '#06b6d4',
    create_urgency: '#f59e0b',
    virtue_signal: '#ec4899',
    concern_troll: '#f97316',
    entertain: '#a3e635',
  }
  return colors[intent] || '#6b7280'
}

function getVerdictColor(verdict?: string): string {
  const colors: Record<string, string> = {
    supported: '#4ade80',
    contradicted: '#ef4444',
    misleading: '#f59e0b',
    unverifiable: '#6b7280',
    outdated: '#eab308',
  }
  return colors[verdict || ''] || '#6b7280'
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: 'text-green-400',
    B: 'text-blue-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    F: 'text-red-400',
  }
  return colors[grade] || 'text-gray-400'
}

export default App
