# Report Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the exported report from a single overview image into a 3-page carousel (Overview, Claims, Reasoning) with selectable export options per page.

**Architecture:** Split `ReportTemplate.tsx` into 3 page components sharing a common header/footer. `ImageExporter.ts` gains a multi-page export function. `ShareMenu.tsx` adds content selection (which page to export) alongside format selection.

**Tech Stack:** React, html2canvas (already installed), TypeScript

---

### Task 1: Report page shared components and OverviewPage

**Files:**
- Create: `app/src/report/ReportShared.tsx`
- Create: `app/src/report/OverviewPage.tsx`

- [ ] **Step 1: Create shared header/footer components**

Create `app/src/report/ReportShared.tsx`:

```tsx
import type { ReportFormat } from './ReportTemplate'

export const REPORT_BG = 'linear-gradient(180deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)'

export function pageStyle(format: ReportFormat, width: number, height: number): React.CSSProperties {
  return {
    width: `${width}px`,
    height: `${height}px`,
    background: REPORT_BG,
    color: '#e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    padding: format === 'twitter' ? '32px 40px' : '48px 56px',
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    overflow: 'hidden',
  }
}

interface ReportHeaderProps {
  title?: string
  pageIndicator?: string
  timestamp: string
  format: ReportFormat
}

export function ReportHeader({ title, pageIndicator, timestamp, format }: ReportHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: format === 'twitter' ? '16px' : '28px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
          ClaimsLens
        </div>
        {title && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{title}</div>
        )}
        {!title && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Rhetorical Analysis Engine</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {pageIndicator && (
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>{pageIndicator}</div>
        )}
        <div style={{ fontSize: '10px', color: '#4b5563' }}>
          {new Date(timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

export function ReportFooter() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: '1px solid #1f2028', paddingTop: '12px',
    }}>
      <div style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>
        claims.anystackdom.dev
      </div>
      <div style={{ fontSize: '11px', color: '#4b5563' }}>
        Analyze any post at claims.anystackdom.dev
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create OverviewPage**

Create `app/src/report/OverviewPage.tsx`. This is the existing ReportTemplate content refactored to use the shared components:

```tsx
import { forwardRef } from 'react'
import type { AnalysisResult, RhetoricalGrade } from '../types/analysis'
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'
import { TONE_COLORS, TONE_LABELS } from '../viz/SentimentRibbon'
import { pageStyle, ReportHeader, ReportFooter } from './ReportShared'

const GRADE_COLORS: Record<RhetoricalGrade, string> = {
  A: '#4ade80', B: '#60a5fa', C: '#facc15', D: '#f97316', F: '#ef4444',
}
const GRADE_LABELS: Record<RhetoricalGrade, string> = {
  A: 'Clean', B: 'Minor Issues', C: 'Misleading', D: 'Manipulative', F: 'Deceptive',
}

interface OverviewPageProps {
  result: AnalysisResult
  format: ReportFormat
  pageIndicator?: string
}

const OverviewPage = forwardRef<HTMLDivElement, OverviewPageProps>(
  ({ result, format, pageIndicator }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const grade = result.summary.rhetoricalGrade
    const gradeColor = GRADE_COLORS[grade]

    const truncatedText = result.input.text.length > 280
      ? result.input.text.slice(0, 277) + '...'
      : result.input.text

    const findings: string[] = []
    const supported = result.claims.filter((c) => c.factCheck?.verdict === 'supported').length
    const contradicted = result.claims.filter((c) => c.factCheck?.verdict === 'contradicted').length
    const misleading = result.claims.filter((c) => c.factCheck?.verdict === 'misleading').length

    if (result.claims.length > 0) {
      const parts = [`${result.claims.length} claims extracted`]
      if (supported > 0) parts.push(`${supported} supported`)
      if (contradicted > 0) parts.push(`${contradicted} false`)
      if (misleading > 0) parts.push(`${misleading} misleading`)
      findings.push(parts.join(', '))
    }
    findings.push(`Dominant intent: ${result.summary.dominantIntent}`)
    if (result.fallacies.length > 0) {
      const worst = [...result.fallacies].sort((a, b) => {
        const order = { major: 0, moderate: 1, minor: 2 }
        return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
      })[0]
      findings.push(`Fallacy detected: ${worst.name} (${worst.severity})`)
    }
    if (result.summary.oneSentenceSummary) {
      findings.push(result.summary.oneSentenceSummary)
    }

    return (
      <div ref={ref} style={pageStyle(format, width, height)}>
        <ReportHeader timestamp={result.timestamp} pageIndicator={pageIndicator} format={format} />

        {/* Original text */}
        <div style={{
          backgroundColor: '#111118', borderRadius: '12px',
          padding: format === 'twitter' ? '14px 18px' : '20px 24px',
          borderLeft: '3px solid #4f46e5',
          marginBottom: format === 'twitter' ? '16px' : '28px',
          fontSize: format === 'twitter' ? '13px' : '14px',
          lineHeight: '1.6', color: '#d1d5db',
        }}>
          "{truncatedText}"
        </div>

        {/* Grade + Score */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', marginBottom: format === 'twitter' ? '16px' : '28px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: format === 'twitter' ? '52px' : '72px', fontWeight: 800,
              color: gradeColor, lineHeight: 1, textShadow: `0 0 40px ${gradeColor}44`,
            }}>
              {grade}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{GRADE_LABELS[grade]}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', color: '#e5e7eb' }}>
                {result.summary.manipulationScore}
              </span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>/ 100 manipulation score</span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#1f2028', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${result.summary.manipulationScore}%`, borderRadius: '3px',
                background: 'linear-gradient(90deg, #4ade80, #facc15, #f97316, #ef4444)',
              }} />
            </div>
          </div>
        </div>

        {/* Key findings */}
        <div style={{ flex: 1, marginBottom: format === 'twitter' ? '12px' : '20px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            Key Findings
          </div>
          {findings.slice(0, format === 'twitter' ? 3 : 4).map((finding, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px', fontSize: '13px', color: '#d1d5db' }}>
              <span style={{ color: '#6366f1', fontWeight: 700, flexShrink: 0 }}>{'\u2022'}</span>
              <span>{finding}</span>
            </div>
          ))}
        </div>

        {/* Sentiment ribbon */}
        {format !== 'twitter' && (
          <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', height: '4px' }}>
            {result.sentences.map((s) => (
              <div key={s.id} style={{ flex: 1, backgroundColor: TONE_COLORS[s.sentiment.dominantTone], borderRadius: '2px' }}
                title={TONE_LABELS[s.sentiment.dominantTone]} />
            ))}
          </div>
        )}

        <ReportFooter />
      </div>
    )
  },
)

OverviewPage.displayName = 'OverviewPage'
export default OverviewPage
```

- [ ] **Step 3: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass (OverviewPage is created but not yet imported anywhere)

- [ ] **Step 4: Commit**

```bash
git add app/src/report/ReportShared.tsx app/src/report/OverviewPage.tsx
git commit -m "feat: add report shared components and OverviewPage

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: ClaimsPage

**Files:**
- Create: `app/src/report/ClaimsPage.tsx`

- [ ] **Step 1: Create ClaimsPage component**

Create `app/src/report/ClaimsPage.tsx`:

```tsx
import { forwardRef } from 'react'
import type { AnalysisResult, Verdict } from '../types/analysis'
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'
import { pageStyle, ReportHeader, ReportFooter } from './ReportShared'

const VERDICT_COLORS: Record<Verdict | 'pending', string> = {
  supported: '#4ade80',
  contradicted: '#ef4444',
  misleading: '#f59e0b',
  unverifiable: '#6b7280',
  outdated: '#eab308',
  pending: '#6b7280',
}

const VERDICT_BG: Record<Verdict | 'pending', string> = {
  supported: '#4ade8018',
  contradicted: '#ef444418',
  misleading: '#f59e0b18',
  unverifiable: '#6b728018',
  outdated: '#eab30818',
  pending: '#6b728018',
}

interface ClaimsPageProps {
  result: AnalysisResult
  format: ReportFormat
  pageIndicator?: string
}

const ClaimsPage = forwardRef<HTMLDivElement, ClaimsPageProps>(
  ({ result, format, pageIndicator }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const maxClaims = format === 'twitter' ? 3 : 5
    const visibleClaims = result.claims.slice(0, maxClaims)
    const remainingCount = result.claims.length - visibleClaims.length

    return (
      <div ref={ref} style={pageStyle(format, width, height)}>
        <ReportHeader title="Claims Analysis" timestamp={result.timestamp} pageIndicator={pageIndicator} format={format} />

        {/* Claims list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: format === 'twitter' ? '8px' : '12px' }}>
          {visibleClaims.map((claim) => {
            const verdict = claim.factCheck?.verdict || 'pending'
            const verdictColor = VERDICT_COLORS[verdict]

            return (
              <div key={claim.id} style={{
                backgroundColor: '#111118', borderRadius: '10px',
                padding: format === 'twitter' ? '10px 14px' : '14px 18px',
                borderLeft: `3px solid ${verdictColor}`,
              }}>
                {/* Claim text */}
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.5', marginBottom: '8px' }}>
                  "{claim.text.length > 120 ? claim.text.slice(0, 117) + '...' : claim.text}"
                </div>

                {/* Badges row */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Type badge */}
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: '#9ca3af',
                    backgroundColor: '#1f2028', borderRadius: '4px', padding: '2px 8px',
                  }}>
                    {claim.type}
                  </span>

                  {/* Verdict badge */}
                  {claim.factCheck && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, color: verdictColor,
                      backgroundColor: VERDICT_BG[verdict], borderRadius: '4px', padding: '2px 8px',
                    }}>
                      {claim.factCheck.verdict} ({Math.round(claim.factCheck.confidence * 100)}%)
                    </span>
                  )}

                  {/* Hedging badge */}
                  {claim.hedging?.detected && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, color: '#f59e0b',
                      backgroundColor: '#f59e0b18', borderRadius: '4px', padding: '2px 8px',
                    }}>
                      hedging
                    </span>
                  )}
                </div>

                {/* Explanation */}
                {claim.factCheck?.explanation && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', lineHeight: '1.4' }}>
                    {claim.factCheck.explanation.length > 100
                      ? claim.factCheck.explanation.slice(0, 97) + '...'
                      : claim.factCheck.explanation}
                  </div>
                )}
              </div>
            )
          })}

          {/* Remaining count */}
          {remainingCount > 0 && (
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px' }}>
              +{remainingCount} more claim{remainingCount === 1 ? '' : 's'}
            </div>
          )}
        </div>

        <ReportFooter />
      </div>
    )
  },
)

ClaimsPage.displayName = 'ClaimsPage'
export default ClaimsPage
```

- [ ] **Step 2: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add app/src/report/ClaimsPage.tsx
git commit -m "feat: add ClaimsPage report component with per-claim verdicts

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: ReasoningPage

**Files:**
- Create: `app/src/report/ReasoningPage.tsx`

- [ ] **Step 1: Create ReasoningPage component**

Create `app/src/report/ReasoningPage.tsx`:

```tsx
import { forwardRef } from 'react'
import type { AnalysisResult, IntentLabel } from '../types/analysis'
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'
import { pageStyle, ReportHeader, ReportFooter } from './ReportShared'

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#facc15',
  moderate: '#f97316',
  major: '#ef4444',
}

const INTENT_COLORS: Record<IntentLabel, string> = {
  inform: '#3b82f6', persuade: '#6366f1', sell: '#22c55e', mislead: '#ef4444',
  deflect: '#f97316', provoke: '#dc2626', establish_authority: '#8b5cf6',
  build_trust: '#06b6d4', create_urgency: '#f59e0b', virtue_signal: '#ec4899',
  concern_troll: '#f97316', entertain: '#a3e635',
}

const INTENT_LABELS: Record<IntentLabel, string> = {
  inform: 'Inform', persuade: 'Persuade', sell: 'Sell', mislead: 'Mislead',
  deflect: 'Deflect', provoke: 'Provoke', establish_authority: 'Authority',
  build_trust: 'Trust', create_urgency: 'Urgency', virtue_signal: 'Virtue Signal',
  concern_troll: 'Concern Troll', entertain: 'Entertain',
}

interface ReasoningPageProps {
  result: AnalysisResult
  format: ReportFormat
  pageIndicator?: string
}

const ReasoningPage = forwardRef<HTMLDivElement, ReasoningPageProps>(
  ({ result, format, pageIndicator }, ref) => {
    const { width, height } = DIMENSIONS[format]
    const maxFallacies = format === 'twitter' ? 2 : 4
    const visibleFallacies = [...result.fallacies]
      .sort((a, b) => {
        const order = { major: 0, moderate: 1, minor: 2 }
        return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
      })
      .slice(0, maxFallacies)

    // Compute top 4 intents from aggregate distribution
    const intentTotals: Record<string, number> = {}
    for (const s of result.sentences) {
      for (const [intent, score] of Object.entries(s.intent.distribution)) {
        intentTotals[intent] = (intentTotals[intent] || 0) + score
      }
    }
    const sentenceCount = Math.max(result.sentences.length, 1)
    const topIntents = Object.entries(intentTotals)
      .map(([intent, total]) => ({ intent: intent as IntentLabel, score: total / sentenceCount }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
    const maxIntentScore = topIntents[0]?.score || 1

    // Check for any mismatch
    const mismatch = result.sentences.find((s) => s.intent.statedVsDetected)?.intent.statedVsDetected

    return (
      <div ref={ref} style={pageStyle(format, width, height)}>
        <ReportHeader title="Reasoning Analysis" timestamp={result.timestamp} pageIndicator={pageIndicator} format={format} />

        {/* Fallacies section */}
        <div style={{ marginBottom: format === 'twitter' ? '16px' : '28px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Logical Fallacies
          </div>

          {result.fallacies.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#111118', borderRadius: '10px' }}>
              <span style={{ color: '#4ade80', fontSize: '16px' }}>{'\u2713'}</span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>No logical fallacies detected</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visibleFallacies.map((f) => (
                <div key={f.id} style={{
                  backgroundColor: '#111118', borderRadius: '10px',
                  padding: format === 'twitter' ? '10px 14px' : '12px 16px',
                  borderLeft: `3px solid ${SEVERITY_COLORS[f.severity] || '#f97316'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{f.name}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: SEVERITY_COLORS[f.severity] || '#f97316',
                      backgroundColor: `${SEVERITY_COLORS[f.severity] || '#f97316'}18`,
                      borderRadius: '4px', padding: '2px 8px',
                    }}>
                      {f.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.4' }}>
                    {f.explanation.length > 120 ? f.explanation.slice(0, 117) + '...' : f.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intent section */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Detected Intent
          </div>

          {/* Dominant intent */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              fontSize: '22px', fontWeight: 700,
              color: INTENT_COLORS[result.summary.dominantIntent] || '#6b7280',
            }}>
              {INTENT_LABELS[result.summary.dominantIntent] || result.summary.dominantIntent}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
              {Math.round(topIntents[0]?.score * 100 || 0)}%
            </span>
          </div>

          {/* Bar chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topIntents.map(({ intent, score }) => (
              <div key={intent} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', width: '80px', textAlign: 'right' }}>
                  {INTENT_LABELS[intent] || intent}
                </span>
                <div style={{ flex: 1, height: '8px', backgroundColor: '#1f2028', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    width: `${(score / maxIntentScore) * 100}%`,
                    backgroundColor: INTENT_COLORS[intent] || '#6b7280',
                  }} />
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', width: '32px' }}>
                  {Math.round(score * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Mismatch warning */}
          {mismatch && (
            <div style={{
              marginTop: '16px', padding: '10px 14px', backgroundColor: '#f59e0b12',
              borderRadius: '8px', border: '1px solid #f59e0b30',
            }}>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                {'\u26A0'} Intent Mismatch Detected
              </div>
              <div style={{ fontSize: '11px', color: '#d1d5db', lineHeight: '1.4' }}>
                {mismatch.mismatchExplanation.length > 150
                  ? mismatch.mismatchExplanation.slice(0, 147) + '...'
                  : mismatch.mismatchExplanation}
              </div>
            </div>
          )}
        </div>

        <ReportFooter />
      </div>
    )
  },
)

ReasoningPage.displayName = 'ReasoningPage'
export default ReasoningPage
```

- [ ] **Step 2: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add app/src/report/ReasoningPage.tsx
git commit -m "feat: add ReasoningPage report with fallacies and intent breakdown

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Update ImageExporter for multi-page export

**Files:**
- Modify: `app/src/report/ImageExporter.ts`

- [ ] **Step 1: Add exportSinglePage and update exportReport**

Replace `app/src/report/ImageExporter.ts` entirely:

```typescript
import type { ReportFormat } from './ReportTemplate'
import { DIMENSIONS } from './ReportTemplate'

/**
 * Export a single report page element as a PNG blob.
 */
export async function exportSinglePage(
  element: HTMLElement,
  format: ReportFormat,
): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')

  const { width, height } = DIMENSIONS[format]

  const canvas = await html2canvas(element, {
    width,
    height,
    scale: 2,
    backgroundColor: '#0a0a0f',
    logging: false,
    useCORS: true,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate image'))
      },
      'image/png',
      1.0,
    )
  })
}

/**
 * Export multiple report page elements as PNG blobs.
 */
export async function exportMultiplePages(
  elements: HTMLElement[],
  format: ReportFormat,
): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (const element of elements) {
    blobs.push(await exportSinglePage(element, format))
  }
  return blobs
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download multiple blobs as separate files.
 */
export function downloadMultipleBlobs(blobs: Blob[], filenames: string[]): void {
  for (let i = 0; i < blobs.length; i++) {
    downloadBlob(blobs[i], filenames[i])
  }
}

/**
 * Copy a blob to the clipboard.
 */
export async function copyToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add app/src/report/ImageExporter.ts
git commit -m "feat: update ImageExporter for single and multi-page export

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Update ShareMenu with content selection and wire pages

**Files:**
- Modify: `app/src/ui/ShareMenu.tsx`

- [ ] **Step 1: Rewrite ShareMenu**

Replace `app/src/ui/ShareMenu.tsx` entirely:

```tsx
import { useState, useRef, useMemo } from 'react'
import type { AnalysisResult } from '../types/analysis'
import type { ReportFormat } from '../report/ReportTemplate'
import OverviewPage from '../report/OverviewPage'
import ClaimsPage from '../report/ClaimsPage'
import ReasoningPage from '../report/ReasoningPage'
import { exportSinglePage, exportMultiplePages, downloadBlob, downloadMultipleBlobs, copyToClipboard } from '../report/ImageExporter'

interface ShareMenuProps {
  result: AnalysisResult
}

type ContentSelection = 'overview' | 'claims' | 'reasoning' | 'carousel'

const FORMAT_OPTIONS: Array<{ id: ReportFormat; label: string; sublabel: string }> = [
  { id: 'threads', label: 'Threads / Instagram', sublabel: '1080 x 1350' },
  { id: 'twitter', label: 'Twitter / X', sublabel: '1200 x 675' },
  { id: 'square', label: 'Square', sublabel: '1080 x 1080' },
]

export default function ShareMenu({ result }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<ReportFormat>('threads')
  const [content, setContent] = useState<ContentSelection>('overview')

  const overviewRef = useRef<HTMLDivElement>(null)
  const claimsRef = useRef<HTMLDivElement>(null)
  const reasoningRef = useRef<HTMLDivElement>(null)

  const hasClaims = result.claims.length > 0
  const hasReasoningContent = result.fallacies.length > 0 ||
    result.summary.dominantIntent !== 'inform' ||
    result.sentences.some((s) => s.intent.statedVsDetected)

  const applicablePages = useMemo(() => {
    const pages: Array<{ id: ContentSelection; label: string }> = [{ id: 'overview', label: 'Overview' }]
    if (hasClaims) pages.push({ id: 'claims', label: 'Claims detail' })
    if (hasReasoningContent) pages.push({ id: 'reasoning', label: 'Reasoning detail' })
    if (pages.length > 1) pages.push({ id: 'carousel', label: `Full carousel (${pages.length - 1 + 1} pages)` })
    return pages
  }, [hasClaims, hasReasoningContent])

  const totalPages = 1 + (hasClaims ? 1 : 0) + (hasReasoningContent ? 1 : 0)

  const getPageIndicator = (pageNum: number) => {
    if (totalPages <= 1) return undefined
    return `${pageNum}/${totalPages}`
  }

  const handleExport = async (action: 'download' | 'copy') => {
    setExporting(true)
    try {
      if (content === 'carousel') {
        const elements: HTMLElement[] = []
        const filenames: string[] = []
        if (overviewRef.current) { elements.push(overviewRef.current); filenames.push(`claimslens-overview.png`) }
        if (hasClaims && claimsRef.current) { elements.push(claimsRef.current); filenames.push(`claimslens-claims.png`) }
        if (hasReasoningContent && reasoningRef.current) { elements.push(reasoningRef.current); filenames.push(`claimslens-reasoning.png`) }

        if (action === 'download') {
          const blobs = await exportMultiplePages(elements, format)
          downloadMultipleBlobs(blobs, filenames)
        } else {
          // Copy just overview for carousel
          if (overviewRef.current) {
            const blob = await exportSinglePage(overviewRef.current, format)
            await copyToClipboard(blob)
          }
        }
      } else {
        const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
          overview: overviewRef, claims: claimsRef, reasoning: reasoningRef,
        }
        const ref = refMap[content]
        if (!ref?.current) return

        const blob = await exportSinglePage(ref.current, format)
        if (action === 'download') {
          downloadBlob(blob, `claimslens-${content}.png`)
        } else {
          await copyToClipboard(blob)
        }
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
        >
          Export Report
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl">
            {/* Content selection */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Content</label>
              <div className="mt-1 space-y-1">
                {applicablePages.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setContent(opt.id)}
                    className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors
                      ${content === opt.id
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                        : 'hover:bg-gray-800 text-gray-400'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">Format</label>
              <div className="mt-1 space-y-1">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    className={`w-full rounded px-3 py-1.5 text-left text-xs transition-colors
                      ${format === opt.id
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                        : 'hover:bg-gray-800 text-gray-400'
                      }
                    `}
                  >
                    {opt.label} <span className="text-gray-600">({opt.sublabel})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <button
                onClick={() => handleExport('download')}
                disabled={exporting}
                className="w-full rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {exporting ? 'Generating...' : content === 'carousel' ? 'Download All PNGs' : 'Download PNG'}
              </button>
              <button
                onClick={() => handleExport('copy')}
                disabled={exporting}
                className="w-full rounded border border-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {content === 'carousel' ? 'Copy Overview to Clipboard' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offscreen report pages for capture */}
      <OverviewPage ref={overviewRef} result={result} format={format} pageIndicator={getPageIndicator(1)} />
      {hasClaims && (
        <ClaimsPage ref={claimsRef} result={result} format={format}
          pageIndicator={getPageIndicator(2)} />
      )}
      {hasReasoningContent && (
        <ReasoningPage ref={reasoningRef} result={result} format={format}
          pageIndicator={getPageIndicator(hasClaims ? 3 : 2)} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/dom/Developer/Claimlens/app && npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/ShareMenu.tsx
git commit -m "feat: update ShareMenu with content selection and carousel export

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Clean up old ReportTemplate

**Files:**
- Modify: `app/src/report/ReportTemplate.tsx`

- [ ] **Step 1: Slim down ReportTemplate to just types and dimensions**

The old `ReportTemplate` component is no longer rendered by `ShareMenu` (replaced by `OverviewPage`). Replace `app/src/report/ReportTemplate.tsx` with just the shared types and constants:

```tsx
export type ReportFormat = 'threads' | 'twitter' | 'square'

export const DIMENSIONS: Record<ReportFormat, { width: number; height: number }> = {
  threads: { width: 1080, height: 1350 },
  twitter: { width: 1200, height: 675 },
  square: { width: 1080, height: 1080 },
}
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/dom/Developer/Claimlens/app && npx vitest run`
Expected: all tests pass

- [ ] **Step 3: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 4: Commit and push**

```bash
git add app/src/report/ReportTemplate.tsx
git commit -m "refactor: slim ReportTemplate to shared types, remove old single-page component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```
