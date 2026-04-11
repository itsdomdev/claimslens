import { useReducer, useCallback } from 'react'
import type { AnalysisResult, AnalysisStage, LayerName, ProgressUpdate } from './types/analysis'
import { AnalysisOrchestrator } from './analysis/orchestrator'
import Layout from './ui/Layout'
import InputRouter from './input/InputRouter'
import AnalysisProgress from './ui/AnalysisProgress'
import LayerToggles from './ui/LayerToggles'
import TextOverlay from './viz/TextOverlay'
import Sidebar from './viz/Sidebar'
import CredibilityDashboard from './viz/CredibilityDashboard'
import ShareMenu from './ui/ShareMenu'

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
          <div className="flex items-center gap-3">
            <LayerToggles
              activeLayers={state.activeLayers}
              onToggle={(layer) => dispatch({ type: 'TOGGLE_LAYER', layer })}
              disabled={!isComplete}
            />
            {isComplete && result && <ShareMenu result={result} />}
          </div>
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
        isComplete && result ? (
          <Sidebar result={result} />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-gray-700">
            <p className="text-xs">Analysis results will appear here.</p>
          </div>
        )
      }
      dashboard={
        isComplete && result ? (
          <CredibilityDashboard summary={result.summary} />
        ) : (
          <div className="text-center text-xs text-gray-700">
            Credibility dashboard
          </div>
        )
      }
    />
  )
}

export default App
