import type { Claim, FactCheckResult, Fallacy } from '../types/analysis'

export interface ClaimExtractionRequest {
  text: string
  sentences: Array<{ id: string; text: string }>
}

export interface ClaimExtractionResponse {
  claims: Claim[]
}

export interface FactCheckRequest {
  claims: Array<{ id: string; text: string; type: string }>
  originalText: string
}

export interface FactCheckResponse {
  results: FactCheckResult[]
}

export interface ReasoningRequest {
  text: string
  sentences: Array<{ id: string; text: string }>
  claims: Array<{ id: string; text: string; sentenceId: string }>
}

export interface ReasoningResponse {
  fallacies: Fallacy[]
  summary: string
}

export interface UnfurlRequest {
  url: string
}

export interface UnfurlResponse {
  text: string
  platform: string
  author?: string
  date?: string
}

export interface ApiError {
  error: string
  status: number
}
