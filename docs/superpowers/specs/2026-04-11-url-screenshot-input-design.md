# URL & Screenshot Input — Design Spec

## Overview

Add two new input methods to ClaimsLens: paste a URL to extract post text, and upload a screenshot for OCR. Both use Claude API for extraction — no additional dependencies.

## URL Input

### User flow
1. User switches to "Paste URL" tab
2. Pastes a social media URL (twitter.com, threads.net, linkedin.com, etc.)
3. Clicks "Extract"
4. Loading state while worker calls Claude
5. Extracted text appears in the textarea for user to confirm/edit
6. User clicks "Analyze" to run the normal pipeline

### Implementation

**`worker/src/handlers/unfurl.ts`** — new handler
- Receives `{ url: string }`
- Validates URL format
- Calls Claude API with system prompt:
  ```
  You are a social media post extractor. Given a URL, fetch and extract the main post text content. Return JSON: { "text": "the post text", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. If you cannot access the URL or extract text, return { "error": "description" }.
  ```
- Uses `claude-sonnet-4-20250514` model, temperature 0.1
- Returns the JSON response to frontend

**`worker/src/index.ts`** — route `/api/unfurl` to new handler (replace 501 stub)

**`app/src/api/client.ts`** — add method:
```typescript
async unfurlUrl(url: string): Promise<{ text: string; platform: string; author?: string; date?: string }>
```
- Posts to `/api/unfurl`
- Parses response, strips code fences

**`app/src/input/UrlInput.tsx`** — new component
- Text input field with URL validation (must start with http:// or https://)
- "Extract" button, disabled until valid URL
- Loading state with spinner
- Error state if extraction fails, with suggestion to paste text manually
- On success, calls `onChange(extractedText)` to populate the main textarea

## Screenshot Input

### User flow
1. User switches to "Screenshot" tab
2. Uploads an image via file picker or drag-and-drop
3. Image preview shown
4. Clicks "Extract Text"
5. Loading state while worker calls Claude vision
6. Extracted text appears in textarea for user to confirm/edit
7. User clicks "Analyze"

### Implementation

**`worker/src/handlers/ocr.ts`** — new handler
- Receives `{ image: string, mimeType: string }` where image is base64-encoded
- Validates mimeType is image/png, image/jpeg, or image/webp
- Validates decoded size <= 5MB
- Calls Claude vision API with the image and system prompt:
  ```
  You are a social media screenshot text extractor. Extract all visible text from this screenshot of a social media post. Return JSON: { "text": "the post text content only, not UI chrome", "platform": "twitter|threads|linkedin|reddit|instagram|other", "author": "username or null", "date": "ISO date or null" }. Extract only the post content — ignore navigation, buttons, like counts, and other UI elements.
  ```
- Uses `claude-sonnet-4-20250514` with vision, temperature 0.1
- Returns JSON response

**`worker/src/index.ts`**
- Add `/api/ocr` route
- Increase body size limit to 8MB for `/api/ocr` only (10KB remains for other routes)

**`app/src/api/client.ts`** — add method:
```typescript
async extractFromScreenshot(file: File): Promise<{ text: string; platform: string; author?: string; date?: string }>
```
- Reads file as base64 via FileReader
- Posts `{ image, mimeType }` to `/api/ocr`
- Parses response, strips code fences

**`app/src/input/ScreenshotInput.tsx`** — new component
- File input accepting image/png, image/jpeg, image/webp
- Drag-and-drop zone with visual indicator
- Max file size: 5MB (validate client-side, show error if exceeded)
- Image preview thumbnail after selection
- "Extract Text" button
- Loading state with spinner
- Error state with retry option
- On success, calls `onChange(extractedText)`

## Shared Changes

**`app/src/input/InputRouter.tsx`**
- Enable URL and Screenshot tabs
- Track active tab in state
- Render UrlInput or ScreenshotInput based on active tab
- All three input modes share the same `onChange` callback — they all ultimately produce text

**`app/src/App.tsx`**
- Add `inputSource: 'paste' | 'url' | 'screenshot'` to state
- Pass source to orchestrator so `AnalysisInput.source` is set correctly
- No changes to analysis pipeline — it receives text regardless of source

## What doesn't change
- Models, orchestrator, merger, scorer
- Visualization layer, sidebar, dashboard
- Report generator
- Existing text paste flow

## Error handling
- Invalid URL → client-side validation error
- Claude can't access URL → show error, suggest manual paste
- File too large → client-side validation error (before upload)
- Unsupported image format → client-side validation error
- Claude vision fails → show error, suggest manual paste
- Rate limiting applies to unfurl and OCR calls same as analysis calls

## Testing
- Unit tests for URL validation
- Unit tests for file size/type validation
- Parser tests for unfurl and OCR response formats
- Integration test: mock unfurl response → text populates → analysis runs
