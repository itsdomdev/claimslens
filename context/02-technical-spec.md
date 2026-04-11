# ClaimsLens — Technical Specification

---

## Architecture Overview

ClaimsLens is a static single-page app with a lightweight backend proxy for Claude API calls. The frontend handles all UI, rendering, and the from-scratch sentiment/intent models. The backend is a single Cloudflare Worker that proxies Claude API requests (to keep the API key server-side) and handles URL unfurling for social media posts.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Tab                           │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │    Input Layer        │   │    Analysis UI                │ │
│  │                       │   │                               │ │
│  │  - Paste text         │   │  - Multi-layer text overlay   │ │
│  │  - Paste URL          │   │  - Claim cards sidebar        │ │
│  │  - Screenshot upload  │   │  - Credibility dashboard      │ │
│  │  - OCR (Tesseract.js) │   │  - Layer toggle controls      │ │
│  └───────┬───────────────┘   │  - Report image export        │ │
│          │                   └──────────┬───────────────────┘ │
│          ▼                              ▲                     │
│  ┌──────────────────────────────────────┴───────────────────┐ │
│  │              Analysis Orchestrator                        │ │
│  │                                                           │ │
│  │  1. Preprocess text (normalize, split sentences)          │ │
│  │  2. Run sentiment model (local, from scratch)             │ │
│  │  3. Run intent model (local, from scratch)                │ │
│  │  4. Call Claude API → claim extraction                    │ │
│  │  5. Call Claude API → fact verification (with web search) │ │
│  │  6. Call Claude API → reasoning/fallacy analysis          │ │
│  │  7. Merge all layers into unified analysis object         │ │
│  └──────┬──────────────────────────────────────┬────────────┘ │
│         │                                      │              │
│  ┌──────▼──────────────┐   ┌───────────────────▼────────────┐│
│  │  Local Models        │   │  Claude API Client             ││
│  │  (Pure TS, zero deps)│   │  (via Cloudflare Worker proxy) ││
│  │                      │   │                                ││
│  │  - Sentiment model   │   │  - Claim extraction prompt     ││
│  │  - Intent model      │   │  - Fact-check prompt + search  ││
│  │  - Tokenizer         │   │  - Fallacy detection prompt    ││
│  │  - Feature extractor │   │                                ││
│  └──────────────────────┘   └────────────────────────────────┘│
│                                                               │
│  ┌───────────────────────────────────────────────────────────┐│
│  │  Report Generator                                         ││
│  │  - HTML → Canvas → PNG export                             ││
│  │  - Threads/Twitter/Instagram aspect ratios                ││
│  │  - Branded template with analysis overlays                ││
│  └───────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker (API Proxy)                │
│                                                                │
│  - POST /api/analyze/claims    → Claude API (claim extraction) │
│  - POST /api/analyze/factcheck → Claude API (+ web search)    │
│  - POST /api/analyze/reasoning → Claude API (fallacy detection)│
│  - POST /api/unfurl            → Fetch social media post text  │
│  - Rate limiting (per-IP, 20 req/min)                          │
│  - API key stored in Worker secrets                            │
│  └─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Cloudflare Worker as API proxy.** The Claude API key can't live in the browser. A single Worker handles all three Claude calls and URL unfurling. It's free-tier eligible, deploys alongside the static site, and adds <50ms latency.
2. **Local models for sentiment and intent.** These run in the browser as pure TypeScript. They're fast (inference in <50ms on a short post), inspectable (expose attention/feature weights), and don't require API calls. This is the "from scratch" flex.
3. **Three separate Claude API calls, not one.** Claim extraction, fact-checking, and fallacy detection are distinct tasks with different prompting strategies. Fact-checking needs web search enabled; the others don't. Separating them also lets us stream results — claims appear first, then fact-check verdicts fill in, then fallacy analysis arrives last.
4. **Canvas-based report export.** No server-side image generation. The report is rendered as a styled HTML element, then captured to PNG via `html2canvas` or the native Canvas API. Keeps everything client-side.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety for model code and API contracts |
| Framework | React 18 + Vite | Fast builds, static output, familiar |
| Styling | Tailwind CSS | Dark theme, rapid iteration, responsive |
| Local ML models | Pure TypeScript, zero deps | Portfolio flex — the sentiment/intent models import nothing |
| Claude API | Anthropic SDK (server-side in Worker) | Claim extraction, fact-check, fallacy detection |
| API proxy | Cloudflare Worker | Secrets management, rate limiting, zero cold start |
| OCR | Tesseract.js (WASM) | Client-side screenshot text extraction |
| Image export | html2canvas | Render report as shareable PNG |
| URL unfurling | Cloudflare Worker fetch | Server-side to avoid CORS on social media URLs |
| Compression | pako | If URL-encoded report sharing is added |
| Deployment | Cloudflare Pages + Workers | Static site + API proxy on same platform |
| Testing | Vitest | Fast, Vite-native |
| Domain | claims.anystackdom.dev | Subdomain of existing domain |

---

## Data Models

### Input

```typescript
interface AnalysisInput {
  text: string;
  source: 'paste' | 'url' | 'screenshot';
  sourceUrl?: string;
  metadata?: {
    platform?: 'twitter' | 'threads' | 'linkedin' | 'reddit' | 'instagram' | 'other';
    author?: string;
    date?: string;
  };
}
```

### Sentence-Level Analysis

```typescript
interface SentenceAnalysis {
  id: string;
  text: string;
  startIndex: number;    // char offset in original text
  endIndex: number;
  sentiment: SentimentResult;
  intent: IntentResult;
  claims: Claim[];
  fallacies: Fallacy[];
}
```

### Sentiment (from-scratch model)

```typescript
interface SentimentResult {
  valence: number;           // -1 to 1
  arousal: number;           // 0 to 1 (calm → intense)
  dominantTone: ToneLabel;
  toneScores: Record<ToneLabel, number>;
  featureWeights: FeatureWeight[];  // which words triggered what
}

type ToneLabel =
  | 'neutral'
  | 'fear_appeal'
  | 'urgency'
  | 'outrage'
  | 'flattery'
  | 'false_calm'
  | 'manufactured_authority'
  | 'sarcasm'
  | 'empathy'
  | 'celebration';

interface FeatureWeight {
  token: string;
  startIndex: number;
  endIndex: number;
  weight: number;        // contribution to classification
  direction: ToneLabel;  // which tone this token pushed toward
}
```

### Intent (from-scratch model)

```typescript
interface IntentResult {
  primaryIntent: IntentLabel;
  confidence: number;
  distribution: Record<IntentLabel, number>;
  statedVsDetected?: {
    stated: IntentLabel;
    detected: IntentLabel;
    mismatchExplanation: string;
  };
  featureWeights: FeatureWeight[];
}

type IntentLabel =
  | 'inform'
  | 'persuade'
  | 'sell'
  | 'mislead'
  | 'deflect'
  | 'provoke'
  | 'establish_authority'
  | 'build_trust'
  | 'create_urgency'
  | 'virtue_signal'
  | 'concern_troll'
  | 'entertain';
```

### Claim (Claude API)

```typescript
interface Claim {
  id: string;
  text: string;
  sentenceId: string;
  type: 'factual' | 'opinion' | 'prediction' | 'assumption';
  hedging?: {
    detected: boolean;
    hedgePhrase: string;     // "some experts say", "it's believed"
    effect: string;          // "disguises opinion as fact"
  };
  factCheck?: FactCheckResult;
}

interface FactCheckResult {
  verdict: 'supported' | 'contradicted' | 'unverifiable' | 'misleading' | 'outdated';
  confidence: number;
  explanation: string;
  sources: Source[];
  missingContext?: string;   // for "misleading" verdict
}

interface Source {
  title: string;
  url: string;
  relevantQuote: string;
  supportType: 'supports' | 'contradicts' | 'partial';
}
```

### Fallacy (Claude API)

```typescript
interface Fallacy {
  id: string;
  type: FallacyType;
  name: string;              // human-readable name
  sentenceIds: string[];     // which sentences are involved
  claimIds: string[];        // which claims are involved
  explanation: string;       // why this is a fallacy, specific to this text
  severity: 'minor' | 'moderate' | 'major';
}

type FallacyType =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dichotomy'
  | 'slippery_slope'
  | 'appeal_to_authority'
  | 'whataboutism'
  | 'circular_reasoning'
  | 'moving_goalposts'
  | 'cherry_picking'
  | 'false_equivalence'
  | 'anecdotal_evidence'
  | 'burden_of_proof_reversal'
  | 'red_herring'
  | 'tu_quoque'
  | 'hasty_generalization'
  | 'loaded_question'
  | 'texas_sharpshooter'
  | 'unsupported_causal'
  | 'missing_context'
  | 'motte_and_bailey';
```

### Full Analysis Result

```typescript
interface AnalysisResult {
  id: string;
  input: AnalysisInput;
  sentences: SentenceAnalysis[];
  claims: Claim[];
  fallacies: Fallacy[];
  summary: AnalysisSummary;
  timestamp: string;
}

interface AnalysisSummary {
  totalClaims: number;
  claimsByVerdict: Record<string, number>;
  dominantIntent: IntentLabel;
  manipulationScore: number;     // 0-100, composite of tone + intent + fallacies
  fallacyCount: number;
  rhetoricalGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  oneSentenceSummary: string;    // generated by Claude
}
```

---

## Module Breakdown

### 1. Local Models (`/src/models/`)

Zero external dependencies. Hand-written TypeScript.

| File | Responsibility |
|---|---|
| `tokenizer.ts` | Simple whitespace + punctuation tokenizer, lowercasing, stop-word removal |
| `vocabulary.ts` | Vocabulary builder, word-to-index mapping, OOV handling |
| `embeddings.ts` | Pre-trained word embeddings (small, bundled as JSON — GloVe 50d subset or custom-trained) |
| `features.ts` | Feature extraction: n-grams, sentiment lexicon scores, punctuation patterns, caps ratio, hedging phrase detector |
| `sentiment.ts` | Sentiment/tone classifier: linear model over features with learned weights. Exposes per-feature contribution. |
| `intent.ts` | Intent classifier: small feed-forward network over features. Exposes layer activations and per-feature weights. |
| `weights.ts` | Pre-trained weight files for sentiment and intent models (bundled as JSON, loaded at init) |

### 2. Claude API Client (`/src/api/`)

| File | Responsibility |
|---|---|
| `client.ts` | HTTP client for the Cloudflare Worker proxy. Handles streaming, retries, error mapping. |
| `prompts.ts` | All Claude prompt templates: claim extraction, fact-check, fallacy detection. Structured output instructions (JSON mode). |
| `parsers.ts` | Parse Claude JSON responses into typed Claim[], Fallacy[], etc. Handle malformed responses gracefully. |
| `types.ts` | API request/response types shared between frontend and worker |

### 3. Analysis Orchestrator (`/src/analysis/`)

| File | Responsibility |
|---|---|
| `orchestrator.ts` | Runs the full analysis pipeline. Coordinates local models and API calls. Manages state transitions (pending → extracting claims → fact-checking → analyzing reasoning → complete). |
| `preprocessor.ts` | Text normalization: sentence splitting, Unicode cleanup, thread/quote-tweet syntax handling, mention/hashtag extraction. |
| `merger.ts` | Merges results from all five layers into a unified AnalysisResult. Links claims to sentences, fallacies to claims, etc. |
| `scorer.ts` | Computes the manipulation score and rhetorical grade from combined analysis signals. |

### 4. Visualization Layer (`/src/viz/`)

| File | Responsibility |
|---|---|
| `TextOverlay.tsx` | Core component: renders original text with toggleable annotation layers (highlights, underlines, margin badges). |
| `SentimentRibbon.tsx` | Colored strip alongside text showing per-sentence tone. Hover for detail. |
| `IntentBadge.tsx` | Inline badge showing detected intent per sentence. Click for confidence distribution. |
| `ClaimHighlight.tsx` | Underlines claims in the text. Color-coded by fact-check verdict. |
| `FallacyAnnotation.tsx` | Margin annotations linking to fallacy cards. Connects related sentences with arcs. |
| `FeatureInspector.tsx` | Modal/panel showing per-word feature weights for sentiment/intent — the "why did it classify this way" view. |
| `CredibilityDashboard.tsx` | Summary panel: claim stats, manipulation score, rhetorical grade, dominant intent. |
| `ClaimCard.tsx` | Sidebar card for each claim: text, type, verdict, sources, related fallacies. |

### 5. Report Generator (`/src/report/`)

| File | Responsibility |
|---|---|
| `ReportTemplate.tsx` | Styled HTML component for the shareable report. Branded, dark theme. |
| `ImageExporter.ts` | Captures ReportTemplate as PNG using html2canvas. Handles Threads (1080x1350), Twitter (1200x675), Instagram (1080x1080) ratios. |
| `CarouselExporter.ts` | For complex analyses: splits report into multi-image carousel (overview → claims → fallacies → verdict). |

### 6. Input Layer (`/src/input/`)

| File | Responsibility |
|---|---|
| `TextInput.tsx` | Paste-text textarea with character count and "Analyze" button. |
| `UrlInput.tsx` | URL paste field. Calls worker proxy to unfurl and extract post text. |
| `ScreenshotInput.tsx` | Image upload + Tesseract.js OCR. Shows extracted text for user confirmation before analysis. |
| `InputRouter.tsx` | Tab interface switching between paste/URL/screenshot input modes. |

### 7. UI Shell (`/src/ui/`)

| File | Responsibility |
|---|---|
| `Layout.tsx` | Main grid: input (top) → analysis text with overlays (center-left) → claim cards (center-right) → dashboard (bottom). |
| `LayerToggles.tsx` | Toggle bar for enabling/disabling each analysis layer overlay. |
| `AnalysisProgress.tsx` | Progress indicator showing which layers are complete (local models → claims → fact-check → reasoning). |
| `ShareMenu.tsx` | Export menu: copy report image, download PNG, generate shareable URL. |
| `ExamplePicker.tsx` | Pre-loaded example posts for first-time users (a political tweet, a LinkedIn hustle post, a health misinformation post). |

### 8. Cloudflare Worker (`/worker/`)

| File | Responsibility |
|---|---|
| `index.ts` | Worker entry point. Routes requests to handlers. |
| `handlers/claims.ts` | Proxies claim extraction request to Claude API. |
| `handlers/factcheck.ts` | Proxies fact-check request to Claude API with web search tool enabled. |
| `handlers/reasoning.ts` | Proxies fallacy detection request to Claude API. |
| `handlers/unfurl.ts` | Fetches social media URL, extracts post text content. |
| `middleware/rateLimit.ts` | Per-IP rate limiting using Cloudflare KV or in-memory counter. |
| `middleware/cors.ts` | CORS headers for the static site origin. |

---

## API Design

### Cloudflare Worker Endpoints

#### POST `/api/analyze/claims`

Extract claims from text.

```typescript
// Request
{
  text: string;
  sentences: { id: string; text: string }[];
}

// Response (streamed)
{
  claims: Claim[];
}
```

#### POST `/api/analyze/factcheck`

Fact-check extracted claims. Uses Claude with web search enabled.

```typescript
// Request
{
  claims: { id: string; text: string; type: string }[];
  originalText: string;
}

// Response (streamed, per-claim)
{
  results: FactCheckResult[];  // ordered by claim ID
}
```

#### POST `/api/analyze/reasoning`

Detect fallacies and reasoning defects.

```typescript
// Request
{
  text: string;
  sentences: { id: string; text: string }[];
  claims: { id: string; text: string; sentenceId: string }[];
}

// Response
{
  fallacies: Fallacy[];
  summary: string;
}
```

#### POST `/api/unfurl`

Extract text content from a social media URL.

```typescript
// Request
{ url: string }

// Response
{
  text: string;
  platform: string;
  author?: string;
  date?: string;
}
```

### Claude API Prompting Strategy

Each Claude call uses structured output (JSON) with explicit schemas. Key prompt design decisions:

- **Claim extraction**: System prompt defines what counts as a claim, opinion, prediction, assumption. Includes 3 few-shot examples of social media posts with correct claim extraction. Requests hedging language detection explicitly.
- **Fact-checking**: Web search tool enabled. System prompt instructs Claude to search for each claim independently, prefer primary sources, and explicitly classify "misleading but technically true" with missing context. Requests structured output with sources.
- **Fallacy detection**: System prompt includes a taxonomy of 20 fallacy types with definitions and examples. Instructs Claude to only flag fallacies it can explain with reference to specific text. Penalizes false positives — "if you're not confident, don't flag it."

---

## Auth & Security

- **API key**: Stored as a Cloudflare Worker secret. Never sent to the browser.
- **Rate limiting**: 20 requests/minute per IP via Worker middleware. Prevents abuse of the Claude API proxy.
- **CORS**: Worker only accepts requests from `claims.anystackdom.dev`.
- **No user accounts**: No stored data, no sessions. Analysis results exist only in the browser tab.
- **Input sanitization**: Worker validates input length (max 5000 chars) and strips HTML/scripts before forwarding to Claude.
- **OCR privacy**: Tesseract.js runs fully client-side. Uploaded screenshots never leave the browser.

---

## Infrastructure & Deployment

| Concern | Approach |
|---|---|
| Static site hosting | Cloudflare Pages (free tier) |
| API proxy | Cloudflare Worker (free tier — 100K requests/day) |
| Build | `vite build` → static HTML/JS/CSS |
| Worker build | `wrangler deploy` from `/worker/` |
| CI/CD | GitHub Actions: lint → test → build → deploy Pages + Worker |
| Custom domain | `claims.anystackdom.dev` — CNAME in Cloudflare DNS |
| Secrets | `ANTHROPIC_API_KEY` stored in Cloudflare Worker secrets |
| Analytics | None, or Plausible/Umami (privacy-respecting) |
| Error tracking | Console logging in Worker; optional Sentry for production |

### Bundle Size Targets

| Asset | Target |
|---|---|
| App JS (gzipped) | < 200KB |
| Model weights (sentiment + intent) | < 500KB |
| Tesseract.js WASM (lazy-loaded) | ~2MB (only loaded if user uploads screenshot) |
| GloVe embeddings subset | < 1MB |
| Total initial load | < 700KB |

---

## Third-Party Dependencies

| Dependency | Purpose | Size | Layer |
|---|---|---|---|
| React + React DOM | UI framework | ~40KB | Frontend |
| Tailwind CSS | Styling | ~10KB | Frontend |
| html2canvas | Report image export | ~40KB | Frontend |
| Tesseract.js | OCR for screenshots | ~2MB (lazy) | Frontend |
| pako | Compression (if URL sharing added) | ~12KB | Frontend |
| @anthropic-ai/sdk | Claude API client | — | Worker |
| wrangler | Worker dev/deploy tooling | — | Dev only |

The local ML models (`/src/models/`) have **zero** dependencies.

---

## Performance & Scalability Notes

### Analysis Pipeline Timing (target)

| Stage | Expected Duration | Runs Where |
|---|---|---|
| Text preprocessing | < 10ms | Browser |
| Sentiment model inference | < 50ms | Browser |
| Intent model inference | < 50ms | Browser |
| Claim extraction (Claude) | 2-4 seconds | Worker → Claude API |
| Fact verification (Claude + search) | 5-10 seconds | Worker → Claude API |
| Reasoning analysis (Claude) | 3-5 seconds | Worker → Claude API |
| Report image generation | < 1 second | Browser |

**Total: ~10-20 seconds for full analysis.** Local models return instantly, giving the user immediate sentiment/intent feedback while Claude layers load progressively.

### Streaming Strategy

- Local models (sentiment, intent): results displayed immediately
- Claim extraction: streamed, claims appear one by one
- Fact-check: streamed per-claim as each verdict returns
- Fallacy detection: waits for claims to be extracted first, then runs

The UI updates progressively — the user sees the analysis build up layer by layer, which is both a UX win (perceived speed) and makes the multi-layer architecture visible.

### Scalability

- **Free tier limits**: Cloudflare Workers free tier allows 100K requests/day. Each full analysis = 3-4 API calls = ~25K-33K full analyses/day. Sufficient for a portfolio project.
- **Claude API costs**: At ~$0.01-0.03 per analysis (3 calls with short social media posts), 1000 analyses/day = $10-30/day. Manageable with the rate limiter.
- **No database**: Nothing to scale. If report URL sharing is added later, use Cloudflare KV (free tier: 100K reads/day).

---

## MVP Scope

### In v1 (ship this)

- Paste-text input
- Sentence-level sentiment/tone classifier (from scratch, inspectable feature weights)
- Intent classifier (from scratch, inspectable confidence distribution)
- Claude API claim extraction with hedging detection
- Claude API fact verification with web search and source links
- Claude API fallacy detection with explanations
- Multi-layer text overlay UI with toggles
- Claim cards sidebar
- Credibility dashboard (manipulation score, rhetorical grade)
- Report image export (Threads-optimized 1080x1350)
- 3 pre-loaded example posts for first-time users
- Cloudflare Worker API proxy with rate limiting
- Dark theme, responsive layout
- Deployed to Cloudflare Pages + Workers

### Out of v1 (future)

- URL unfurling (paste tweet/Threads URL)
- Screenshot OCR input
- Shareable report URLs
- Multi-image carousel export
- Batch analysis
- Browser extension
- Debate mode
- Multi-language support
- Custom model training
- Stated vs detected intent mismatch (requires more training data)
