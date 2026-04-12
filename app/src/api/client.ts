import type { Claim, FactCheckResult, Fallacy } from '../types/analysis'
import { parseClaims, parseFactCheck, parseFallacies, parseExtraction } from './parsers'
import { mockExtractClaims, mockFactCheck, mockAnalyzeReasoning } from './mocks'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api'
const TIMEOUT = 30_000
const MAX_RETRIES = 2

export class ClaimsLensAPI {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE
  }

  async extractClaims(
    text: string,
    sentences: Array<{ id: string; text: string }>,
  ): Promise<Claim[]> {
    if (USE_MOCKS) {
      return mockExtractClaims(text, sentences)
    }

    const response = await this.post('/analyze/claims', { text, sentences })
    return parseClaims(response)
  }

  async factCheck(
    claims: Array<{ id: string; text: string; type: string }>,
    originalText: string,
  ): Promise<FactCheckResult[]> {
    if (USE_MOCKS) {
      const fullClaims: Claim[] = claims.map((c) => ({
        ...c,
        sentenceId: 's0',
        type: c.type as Claim['type'],
      }))
      return mockFactCheck(fullClaims, originalText)
    }

    const response = await this.post('/analyze/factcheck', { claims, originalText })
    return parseFactCheck(response)
  }

  async analyzeReasoning(
    text: string,
    sentences: Array<{ id: string; text: string }>,
    claims: Array<{ id: string; text: string; sentenceId: string }>,
  ): Promise<{ fallacies: Fallacy[]; summary: string }> {
    if (USE_MOCKS) {
      return mockAnalyzeReasoning(text, sentences, claims)
    }

    const response = await this.post('/analyze/reasoning', { text, sentences, claims })
    return parseFallacies(response)
  }

  async unfurlUrl(url: string): Promise<{ text: string; platform: string; author?: string; date?: string }> {
    const response = await this.post('/unfurl', { url })
    return parseExtraction(response)
  }

  async extractFromScreenshot(file: File): Promise<{ text: string; platform: string; author?: string; date?: string }> {
    const { base64, mimeType } = await fileToBase64(file)
    const response = await this.post('/ocr', { image: base64, mimeType })
    return parseExtraction(response)
  }

  private async post(path: string, body: unknown): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), TIMEOUT)

        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            throw new Error(`Rate limited. Try again in ${retryAfter || '60'} seconds.`)
          }
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }

        return await response.text()
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        if (attempt < MAX_RETRIES && !lastError.message.includes('Rate limited')) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError || new Error('Unknown API error')
  }
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Strip the "data:image/png;base64," prefix
      const base64 = dataUrl.split(',')[1]
      resolve({ base64, mimeType: file.type })
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
