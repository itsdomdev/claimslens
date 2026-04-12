# URL & Screenshot Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL paste and screenshot upload input methods that extract post text via Claude API, then feed it into the existing analysis pipeline.

**Architecture:** Two new worker endpoints (`/api/unfurl` for URL extraction, `/api/ocr` for screenshot vision) call Claude to extract text. Two new frontend components (`UrlInput`, `ScreenshotInput`) handle input and show extracted text for confirmation. The `InputRouter` switches between all three modes. All paths produce text that flows into the existing orchestrator unchanged.

**Tech Stack:** Claude API (text + vision), Cloudflare Worker, React, TypeScript

---

### Task 1: Worker — URL unfurl handler

**Files:**
- Create: `worker/src/handlers/unfurl.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create the unfurl handler**

Create `worker/src/handlers/unfurl.ts`:

```typescript
import type { Env } from '../index'

export async function handleUnfurl(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { url } = body as { url: string }

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL format' }), { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.1,
      system: 'You are a social media post extractor. Given a URL, fetch and extract the main post text content. Return JSON: { "text": "the post text", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. If you cannot access the URL or extract text, return { "error": "description" }.',
      messages: [
        { role: 'user', content: `Extract the social media post text from this URL: ${url}` },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: `Claude API error: ${response.status}`, details: err }), { status: 502 })
  }

  const data = (await response.json()) as { content: Array<{ text: string }> }
  const content = data.content?.[0]?.text || '{}'

  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Wire the handler into the worker router**

In `worker/src/index.ts`, add the import at the top:

```typescript
import { handleUnfurl } from './handlers/unfurl'
```

Replace the `/api/unfurl` case (lines 77-81):

```typescript
        case '/api/unfurl':
          response = await handleUnfurl(body, env)
          break
```

- [ ] **Step 3: Verify worker builds**

Run: `cd worker && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add worker/src/handlers/unfurl.ts worker/src/index.ts
git commit -m "feat: add URL unfurl worker handler with Claude extraction"
```

---

### Task 2: Worker — OCR handler

**Files:**
- Create: `worker/src/handlers/ocr.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create the OCR handler**

Create `worker/src/handlers/ocr.ts`:

```typescript
import type { Env } from '../index'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

export async function handleOcr(body: Record<string, unknown>, env: Env): Promise<Response> {
  const { image, mimeType } = body as { image: string; mimeType: string }

  if (!image || !mimeType) {
    return new Response(JSON.stringify({ error: 'Missing image or mimeType' }), { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return new Response(JSON.stringify({ error: `Unsupported image type: ${mimeType}. Use PNG, JPEG, or WebP.` }), { status: 400 })
  }

  // Check decoded size (base64 is ~4/3 of original)
  const estimatedBytes = Math.ceil(image.length * 0.75)
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ error: 'Image exceeds 5MB limit' }), { status: 413 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.1,
      system: 'You are a social media screenshot text extractor. Extract all visible text from this screenshot of a social media post. Return JSON: { "text": "the post text content only, not UI chrome", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. Extract only the post content — ignore navigation, buttons, like counts, and other UI elements.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Extract the social media post text from this screenshot.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return new Response(JSON.stringify({ error: `Claude API error: ${response.status}`, details: err }), { status: 502 })
  }

  const data = (await response.json()) as { content: Array<{ text: string }> }
  const content = data.content?.[0]?.text || '{}'

  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Wire OCR handler and adjust body size limit**

In `worker/src/index.ts`, add import:

```typescript
import { handleOcr } from './handlers/ocr'
```

Replace the `MAX_BODY_SIZE` constant and body parsing logic. Change the constant:

```typescript
const MAX_BODY_SIZE = 10_000
const MAX_OCR_BODY_SIZE = 8_000_000 // 8MB for base64 images
```

In the body parsing section, replace the size check (line 49-53):

```typescript
      const maxSize = url.pathname === '/api/ocr' ? MAX_OCR_BODY_SIZE : MAX_BODY_SIZE
      if (text.length > maxSize) {
```

Add the OCR route case after the unfurl case:

```typescript
        case '/api/ocr':
          response = await handleOcr(body, env)
          break
```

- [ ] **Step 3: Verify worker builds**

Run: `cd worker && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add worker/src/handlers/ocr.ts worker/src/index.ts
git commit -m "feat: add screenshot OCR worker handler with Claude vision"
```

---

### Task 3: Frontend — API client methods and parser

**Files:**
- Modify: `app/src/api/client.ts`
- Modify: `app/src/api/parsers.ts`
- Create: `app/src/api/parsers.test.ts` (add tests)

- [ ] **Step 1: Add `parseExtraction` to parsers**

Add to the end of `app/src/api/parsers.ts`:

```typescript
/**
 * Parse URL unfurl or OCR extraction response.
 */
export function parseExtraction(raw: string): { text: string; platform: string; author?: string; date?: string } {
  try {
    const data = JSON.parse(stripCodeFences(raw))
    if (data.error) {
      throw new Error(data.error)
    }
    if (!data.text || typeof data.text !== 'string') {
      throw new Error('No text extracted from response')
    }
    return {
      text: data.text,
      platform: data.platform || 'other',
      author: data.author || undefined,
      date: data.date || undefined,
    }
  } catch (e) {
    if (e instanceof Error && e.message !== 'No text extracted from response' && !e.message.startsWith('Could not')) {
      console.warn('[parseExtraction] Failed to parse JSON:', e)
    }
    throw e
  }
}
```

- [ ] **Step 2: Write tests for parseExtraction**

Add these tests to `app/src/api/parsers.test.ts`:

```typescript
describe('parseExtraction', () => {
  it('parses valid extraction response', () => {
    const raw = JSON.stringify({ text: 'Hello world', platform: 'twitter', author: 'user1', date: '2026-01-01' })
    const result = parseExtraction(raw)
    expect(result.text).toBe('Hello world')
    expect(result.platform).toBe('twitter')
    expect(result.author).toBe('user1')
  })

  it('handles code-fence wrapped response', () => {
    const raw = '```json\n{"text": "Post text", "platform": "threads"}\n```'
    const result = parseExtraction(raw)
    expect(result.text).toBe('Post text')
  })

  it('throws on error response', () => {
    const raw = JSON.stringify({ error: 'Could not access URL' })
    expect(() => parseExtraction(raw)).toThrow('Could not access URL')
  })

  it('throws on missing text', () => {
    const raw = JSON.stringify({ platform: 'twitter' })
    expect(() => parseExtraction(raw)).toThrow('No text extracted')
  })

  it('throws on malformed JSON', () => {
    expect(() => parseExtraction('not json')).toThrow()
  })
})
```

Add the import at the top of the test file:

```typescript
import { parseClaims, parseFactCheck, parseFallacies, parseExtraction } from './parsers'
```

- [ ] **Step 3: Run tests to verify**

Run: `cd app && npx vitest run src/api/parsers.test.ts`
Expected: all tests pass

- [ ] **Step 4: Add `unfurlUrl` and `extractFromScreenshot` to client**

Add to `app/src/api/client.ts`. Import `parseExtraction`:

```typescript
import { parseClaims, parseFactCheck, parseFallacies, parseExtraction } from './parsers'
```

Add these two methods inside the `ClaimsLensAPI` class, before the `private async post` method:

```typescript
  async unfurlUrl(url: string): Promise<{ text: string; platform: string; author?: string; date?: string }> {
    const response = await this.post('/unfurl', { url })
    return parseExtraction(response)
  }

  async extractFromScreenshot(file: File): Promise<{ text: string; platform: string; author?: string; date?: string }> {
    const { base64, mimeType } = await fileToBase64(file)
    const response = await this.post('/ocr', { image: base64, mimeType })
    return parseExtraction(response)
  }
```

Add the `fileToBase64` helper function outside the class, at the bottom of the file:

```typescript
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
```

- [ ] **Step 5: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 6: Commit**

```bash
git add app/src/api/client.ts app/src/api/parsers.ts app/src/api/parsers.test.ts
git commit -m "feat: add unfurlUrl and extractFromScreenshot API client methods"
```

---

### Task 4: Frontend — UrlInput component

**Files:**
- Create: `app/src/input/UrlInput.tsx`

- [ ] **Step 1: Create UrlInput component**

Create `app/src/input/UrlInput.tsx`:

```tsx
import { useState } from 'react'
import { ClaimsLensAPI } from '../api/client'

interface UrlInputProps {
  onChange: (text: string) => void
  disabled?: boolean
}

const api = new ClaimsLensAPI()

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function UrlInput({ onChange, disabled }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = isValidUrl(url)

  const handleExtract = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.unfurlUrl(url)
      onChange(result.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          placeholder="https://twitter.com/user/status/..."
          disabled={disabled || loading}
          className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors focus:border-indigo-500"
          aria-label="Social media post URL"
        />
        <button
          onClick={handleExtract}
          disabled={!valid || loading || disabled}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all
            ${loading ? 'bg-indigo-700 cursor-wait' : !valid ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-indigo-600 hover:bg-indigo-500'}
          `}
        >
          {loading ? 'Extracting...' : 'Extract'}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300">
          {error}
          <span className="ml-2 text-gray-500">Try pasting the text directly instead.</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add app/src/input/UrlInput.tsx
git commit -m "feat: add UrlInput component for URL text extraction"
```

---

### Task 5: Frontend — ScreenshotInput component

**Files:**
- Create: `app/src/input/ScreenshotInput.tsx`

- [ ] **Step 1: Create ScreenshotInput component**

Create `app/src/input/ScreenshotInput.tsx`:

```tsx
import { useState, useRef } from 'react'
import { ClaimsLensAPI } from '../api/client'

interface ScreenshotInputProps {
  onChange: (text: string) => void
  disabled?: boolean
}

const api = new ClaimsLensAPI()
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ScreenshotInput({ onChange, disabled }: ScreenshotInputProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validateAndSet = (f: File) => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported format. Use PNG, JPEG, or WebP.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.extractFromScreenshot(file)
      onChange(result.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from screenshot')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors
            ${dragOver ? 'border-indigo-500 bg-indigo-950/20' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}
            ${disabled ? 'opacity-40 pointer-events-none' : ''}
          `}
          role="button"
          aria-label="Upload screenshot"
        >
          <p className="text-sm text-gray-400">Drop a screenshot here or click to browse</p>
          <p className="mt-1 text-[10px] text-gray-600">PNG, JPEG, or WebP up to 5MB</p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
          {preview && (
            <img src={preview} alt="Screenshot preview" className="h-20 w-20 rounded object-cover" />
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-300">{file.name}</p>
            <p className="text-[10px] text-gray-600">{(file.size / 1024).toFixed(0)} KB</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleExtract}
                disabled={loading || disabled}
                className={`rounded px-4 py-1.5 text-xs font-semibold text-white transition-all
                  ${loading ? 'bg-indigo-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}
                `}
              >
                {loading ? 'Extracting...' : 'Extract Text'}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="rounded px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSet(f) }}
        className="hidden"
      />

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-300">
          {error}
          <span className="ml-2 text-gray-500">Try pasting the text directly instead.</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add app/src/input/ScreenshotInput.tsx
git commit -m "feat: add ScreenshotInput component with drag-and-drop and preview"
```

---

### Task 6: Frontend — Wire InputRouter and App

**Files:**
- Modify: `app/src/input/InputRouter.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Update InputRouter to support all three tabs**

Replace `app/src/input/InputRouter.tsx` entirely:

```tsx
import { useState } from 'react'
import TextInput from './TextInput'
import UrlInput from './UrlInput'
import ScreenshotInput from './ScreenshotInput'

interface InputRouterProps {
  value: string
  onChange: (text: string) => void
  onAnalyze: () => void
  onSourceChange: (source: 'paste' | 'url' | 'screenshot') => void
  analyzing: boolean
  readonly?: boolean
}

type InputTab = 'paste' | 'url' | 'screenshot'

const TABS: Array<{ id: InputTab; label: string }> = [
  { id: 'paste', label: 'Paste Text' },
  { id: 'url', label: 'Paste URL' },
  { id: 'screenshot', label: 'Screenshot' },
]

export default function InputRouter({ value, onChange, onAnalyze, onSourceChange, analyzing, readonly }: InputRouterProps) {
  const [activeTab, setActiveTab] = useState<InputTab>('paste')

  const handleTabChange = (tab: InputTab) => {
    setActiveTab(tab)
    onSourceChange(tab)
  }

  // When URL or screenshot extraction succeeds, switch to paste view to show the text
  const handleExtracted = (text: string) => {
    onChange(text)
    setActiveTab('paste')
    onSourceChange('paste')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={analyzing || readonly}
            className={`px-4 py-2 text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-500 hover:text-gray-300'
              }
              ${analyzing || readonly ? 'cursor-not-allowed opacity-60' : ''}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'paste' && (
        <TextInput
          value={value}
          onChange={onChange}
          onAnalyze={onAnalyze}
          analyzing={analyzing}
          readonly={readonly}
        />
      )}
      {activeTab === 'url' && (
        <UrlInput
          onChange={handleExtracted}
          disabled={analyzing || readonly}
        />
      )}
      {activeTab === 'screenshot' && (
        <ScreenshotInput
          onChange={handleExtracted}
          disabled={analyzing || readonly}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx state and props**

In `app/src/App.tsx`, add `inputSource` to the state interface:

```typescript
interface AppState {
  inputText: string
  inputSource: 'paste' | 'url' | 'screenshot'
  analysisState: 'idle' | 'analyzing' | 'complete' | 'error'
  analysisResult: AnalysisResult | null
  progressStage: AnalysisStage
  activeLayers: Set<LayerName>
  error: string | null
}
```

Add a new action type:

```typescript
  | { type: 'SET_SOURCE'; source: 'paste' | 'url' | 'screenshot' }
```

Update `initialState`:

```typescript
const initialState: AppState = {
  inputText: '',
  inputSource: 'paste',
  analysisState: 'idle',
  analysisResult: null,
  progressStage: 'idle',
  activeLayers: new Set(ALL_LAYERS),
  error: null,
}
```

Add the case to the reducer (after `SET_INPUT`):

```typescript
    case 'SET_SOURCE':
      return { ...state, inputSource: action.source }
```

Update `handleAnalyze` to use `state.inputSource`:

```typescript
      const result = await orchestrator.analyze(
        { text: state.inputText, source: state.inputSource },
        (update) => dispatch({ type: 'PROGRESS', update }),
      )
```

Add `onSourceChange` prop to the InputRouter in the JSX:

```tsx
        <InputRouter
          value={state.inputText}
          onChange={(text) => dispatch({ type: 'SET_INPUT', text })}
          onAnalyze={handleAnalyze}
          onSourceChange={(source) => dispatch({ type: 'SET_SOURCE', source })}
          analyzing={isAnalyzing}
          readonly={isComplete}
        />
```

- [ ] **Step 3: Run all tests**

Run: `cd app && npx vitest run`
Expected: all tests pass

- [ ] **Step 4: Build check**

Run: `cd /Users/dom/Developer/Claimlens && pnpm build`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add app/src/input/InputRouter.tsx app/src/App.tsx
git commit -m "feat: wire URL and screenshot input tabs into app"
```

---

### Task 7: Deploy and verify

**Files:** none (deployment only)

- [ ] **Step 1: Deploy worker**

```bash
cd worker && wrangler deploy
```

Expected: successful deployment with `/api/unfurl` and `/api/ocr` routes

- [ ] **Step 2: Push frontend**

```bash
git push
```

Expected: Cloudflare Pages auto-builds and deploys

- [ ] **Step 3: Commit build log update**

Update `BUILD_LOG.md` with URL and screenshot feature completion, then:

```bash
git add BUILD_LOG.md
git commit -m "docs: update build log with URL and screenshot input features"
git push
```
