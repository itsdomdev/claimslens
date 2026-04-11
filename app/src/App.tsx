import { useReducer, useCallback } from 'react'
import type { AnalysisResult, AnalysisStage, LayerName, ProgressUpdate } from './types/analysis'
import { AnalysisOrchestrator } from './analysis/orchestrator'
import Layout from './ui/Layout'
import InputRouter from './input/InputRouter'
import AnalysisProgress from './ui/AnalysisProgress'
import LayerToggles from './ui/LayerToggles'
import TextOverlay from './viz/TextOverlay'
import { VERDICT_COLORS } from './viz/ClaimHighlight'

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
            <TextOverlay
              sentences={result.sentences}
              activeLayers={state.activeLayers}
            />
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
                        style={{ backgroundColor: VERDICT_COLORS[claim.factCheck.verdict], color: '#000' }}
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
