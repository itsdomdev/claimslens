# ClaimsLens — Claude Code Build Prompts

Paste each phase sequentially into Claude Code CLI. Each prompt is self-contained with enough context to execute independently.

---

## Phase 1: Project Scaffolding

```
Create a new monorepo project called "claimslens" with two packages:

1. `/app` — React + TypeScript + Vite frontend
2. `/worker` — Cloudflare Worker API proxy

Set up the frontend (/app):
- React 18, TypeScript strict mode, Vite
- Tailwind CSS 4 with dark theme as default
- Vitest for testing
- Folder structure:
  /src/models/     — local ML models (zero dependencies)
  /src/api/        — Claude API client
  /src/analysis/   — orchestrator, preprocessor, merger
  /src/viz/        — visualization components
  /src/input/      — input components (paste, URL, screenshot)
  /src/report/     — report image generation
  /src/ui/         — layout, controls, shell
  /src/types/      — shared TypeScript types

Set up the worker (/worker):
- Cloudflare Worker with wrangler
- TypeScript
- Folder structure:
  /src/handlers/   — endpoint handlers
  /src/middleware/  — rate limiting, CORS

Create a minimal App.tsx that renders a dark full-screen layout with "ClaimsLens" title centered. Verify the frontend runs with `pnpm dev`.

Set up a pnpm workspace at the root with both packages.

Initialize git, create .gitignore for node_modules, dist, .wrangler.

Do NOT install any ML libraries. The models in /src/models/ will be hand-written.
```

---

## Phase 2: Shared Types & Text Preprocessor

```
In /app/src/types/, create all the TypeScript types that will be used across the app. These are the data contracts between every module.

Create analysis.ts with these interfaces:
- AnalysisInput: { text, source ('paste'|'url'|'screenshot'), sourceUrl?, metadata? }
- SentenceAnalysis: { id, text, startIndex, endIndex, sentiment, intent, claims, fallacies }
- SentimentResult: { valence (-1 to 1), arousal (0 to 1), dominantTone, toneScores (Record<ToneLabel, number>), featureWeights }
- ToneLabel: union of 'neutral' | 'fear_appeal' | 'urgency' | 'outrage' | 'flattery' | 'false_calm' | 'manufactured_authority' | 'sarcasm' | 'empathy' | 'celebration'
- FeatureWeight: { token, startIndex, endIndex, weight, direction (ToneLabel) }
- IntentResult: { primaryIntent, confidence, distribution (Record<IntentLabel, number>), statedVsDetected?, featureWeights }
- IntentLabel: union of 'inform' | 'persuade' | 'sell' | 'mislead' | 'deflect' | 'provoke' | 'establish_authority' | 'build_trust' | 'create_urgency' | 'virtue_signal' | 'concern_troll' | 'entertain'
- Claim: { id, text, sentenceId, type ('factual'|'opinion'|'prediction'|'assumption'), hedging?, factCheck? }
- FactCheckResult: { verdict ('supported'|'contradicted'|'unverifiable'|'misleading'|'outdated'), confidence, explanation, sources, missingContext? }
- Source: { title, url, relevantQuote, supportType }
- Fallacy: { id, type (FallacyType), name, sentenceIds, claimIds, explanation, severity }
- FallacyType: union of all 20 fallacy types (ad_hominem, straw_man, false_dichotomy, slippery_slope, appeal_to_authority, whataboutism, circular_reasoning, moving_goalposts, cherry_picking, false_equivalence, anecdotal_evidence, burden_of_proof_reversal, red_herring, tu_quoque, hasty_generalization, loaded_question, texas_sharpshooter, unsupported_causal, missing_context, motte_and_bailey)
- AnalysisResult: { id, input, sentences, claims, fallacies, summary }
- AnalysisSummary: { totalClaims, claimsByVerdict, dominantIntent, manipulationScore (0-100), fallacyCount, rhetoricalGrade ('A'-'F'), oneSentenceSummary }

In /app/src/analysis/, create preprocessor.ts:
- splitSentences(text: string) → { id, text, startIndex, endIndex }[]
  - Handle abbreviations (Dr., Mr., Mrs., U.S., etc.) without false splits
  - Handle social media patterns: @mentions, #hashtags, URLs, emojis
  - Handle ellipsis, multiple punctuation (!!!, ???)
  - Assign sequential IDs: "s0", "s1", etc.
- normalizeText(text: string) → string
  - Normalize Unicode (smart quotes → straight quotes, em dashes → hyphens)
  - Collapse multiple whitespace
  - Trim
- extractMetadata(text: string) → { mentions: string[], hashtags: string[], urls: string[] }

Write comprehensive tests for the preprocessor:
- Test sentence splitting on tricky cases: "Dr. Smith went to D.C. He liked it."
- Test social media text with @mentions, #hashtags, URLs
- Test emoji-heavy text
- Test thread-style numbered lists
```

---

## Phase 3: Sentiment & Tone Model (From Scratch)

```
In /app/src/models/, build the sentiment and tone classifier from scratch. ZERO external dependencies — pure TypeScript only.

Create tokenizer.ts:
- tokenize(text: string) → string[]
  - Lowercase, split on whitespace and punctuation
  - Keep contractions intact (don't → don't, not don + t)
  - Remove stop words (configurable, default: common English stop words)
  - Return cleaned token array

Create features.ts:
- extractFeatures(tokens: string[], rawText: string) → FeatureVector
  - Unigram presence (is word X present?)
  - Bigram presence (is "not good" present?)
  - Sentiment lexicon scores: use a bundled sentiment lexicon (AFINN-style word→score mapping, create a curated list of ~2000 words in a JSON file at /src/models/data/sentiment-lexicon.json)
  - Emotional manipulation indicators:
    - Fear words (threat, danger, risk, warning, alarming)
    - Urgency words (now, immediately, urgent, breaking, last chance)
    - Outrage words (disgusting, unacceptable, outrageous, shameful)
    - Flattery patterns (smart people know, you're too intelligent to)
    - Authority manufacturing (experts agree, studies show, everyone knows, it's well known)
  - Punctuation features: exclamation count, question count, caps ratio, ellipsis count
  - Hedging score: count of hedging phrases (some say, it's believed, reportedly, allegedly, sources say)
  - Text statistics: avg word length, sentence count, word count

Create sentiment.ts:
- SentimentModel class:
  - constructor: loads pre-computed weights from /src/models/data/sentiment-weights.json
  - predict(features: FeatureVector) → SentimentResult
    - Linear model: dot product of feature vector with weight vector per tone class
    - Softmax over tone scores to get distribution
    - Return dominant tone, all scores, and per-feature contributions (feature value × weight = contribution)
  - getFeatureWeights(tokens: string[], features: FeatureVector) → FeatureWeight[]
    - For each token, compute its contribution to the final classification
    - Map contributions back to character offsets in the original text

For the initial weights file (sentiment-weights.json):
- Hand-craft reasonable starting weights based on the feature design:
  - Fear lexicon words get high weight for fear_appeal
  - Urgency words get high weight for urgency
  - Outrage words get high weight for outrage
  - Exclamation marks boost arousal
  - Caps ratio boosts outrage/urgency
  - Hedging words boost false_calm / manufactured_authority
- These don't need to be perfect — they're a starting point that will be visibly reasonable in demos. The feature weights being inspectable is more important than accuracy.

Write tests:
- "BREAKING: This is URGENT!!!" should score high on urgency
- "Studies show that experts agree this is dangerous" should flag manufactured_authority
- "Have a nice day" should score neutral/low arousal
- Verify feature weights sum correctly and are non-zero for relevant tokens
```

---

## Phase 4: Intent Model (From Scratch)

```
In /app/src/models/, build the intent classifier. ZERO external dependencies.

Create intent.ts:
- IntentModel class:
  - constructor: loads weights from /src/models/data/intent-weights.json
  - predict(features: FeatureVector, sentimentResult: SentimentResult) → IntentResult
    - Uses the same FeatureVector from the sentiment model PLUS sentiment scores as additional features
    - Two-layer feed-forward network: input → hidden (32 units, ReLU) → output (12 intent classes, softmax)
    - Expose hidden layer activations for inspection
    - Return primary intent, confidence, full distribution, and per-feature contributions

  - getIntentMismatch(tokens: string[], intentResult: IntentResult) → StatedVsDetected | null
    - Detect phrases that signal a stated intent:
      - "I'm just asking" / "just curious" / "honest question" → stated: inform
      - "not trying to sell" / "this isn't an ad" → stated: inform
      - "I don't want to scare anyone but" → stated: inform
    - If stated intent differs from detected intent by >0.3 confidence, flag the mismatch

For the initial weights (intent-weights.json):
- Hand-craft weights for the two-layer network:
  - Input→hidden: designed so relevant feature groups activate specific hidden units
  - Hidden→output: maps hidden representations to intent classes
  - Key patterns:
    - sell: product mentions + urgency + flattery → high sell score
    - persuade: strong sentiment + opinion markers + authority claims
    - provoke: high outrage + question marks + personal attacks
    - concern_troll: hedging + negative sentiment + stated concern ("I'm worried about")
    - virtue_signal: self-reference + moral language + public-facing cues
    - inform: neutral tone + factual claims + source citations

Create vocabulary.ts:
- A lightweight vocabulary helper:
  - wordToIndex: Map<string, number> for looking up feature indices
  - Build from the sentiment lexicon + intent-specific word lists
  - Handle OOV (out-of-vocabulary) words gracefully — hash to a fixed bucket

Write tests:
- "🚨 Use code SAVE50 for 50% off — today only!" should classify as sell + urgency
- "Here's what the data actually shows:" should classify as inform
- "I'm not racist but..." should flag a stated/detected intent mismatch
- "This is absolutely DISGUSTING and everyone should be outraged" should classify as provoke
- Verify all 12 intents can be triggered by appropriate inputs
```

---

## Phase 5: Claude API Prompts & Worker Proxy

```
Build the Cloudflare Worker API proxy and the Claude prompt templates.

In /app/src/api/prompts.ts, create three prompt templates:

1. CLAIM_EXTRACTION_PROMPT:
- System prompt that defines: factual claim, opinion, prediction, assumption
- Instructs Claude to extract all claims from social media text
- Requires structured JSON output matching the Claim[] type
- Detects hedging language and tags it
- Includes 3 few-shot examples:
  - A tweet with mixed facts and opinions
  - A LinkedIn post with predictions disguised as facts
  - A health claim post with hedged authority appeals
- Temperature: 0.2 (we want consistency)

2. FACT_CHECK_PROMPT:
- System prompt instructing Claude to fact-check each claim
- Enables web search tool
- For each claim, return: verdict, confidence, explanation, sources, missing context
- Explicit instruction: classify "misleading but technically true" when a claim is factually accurate but missing critical context
- Explicit instruction: for unverifiable claims (opinions stated as facts, predictions), return "unverifiable" with explanation
- Temperature: 0.1

3. REASONING_ANALYSIS_PROMPT:
- System prompt with a full taxonomy of 20 fallacy types, each with:
  - Definition
  - Example in social media context
  - What to look for
- Instructs Claude to only flag fallacies it can explain with specific textual evidence
- Instructs Claude to avoid false positives — "if confidence is below 70%, do not flag it"
- Returns JSON matching Fallacy[]
- Also detects: unsupported causal claims, missing context, motte-and-bailey
- Temperature: 0.2

In /app/src/api/client.ts:
- ClaimsLensAPI class:
  - constructor(baseUrl: string) — points to the Worker
  - extractClaims(text, sentences) → Promise<Claim[]>
  - factCheck(claims, originalText) → Promise<FactCheckResult[]>
  - analyzeReasoning(text, sentences, claims) → Promise<{ fallacies: Fallacy[], summary: string }>
  - All methods handle streaming responses, retries (max 2), and timeout (30s)
  - Parse JSON from Claude responses with error handling for malformed output

In /app/src/api/parsers.ts:
- parseClaims(raw: string) → Claim[]
- parseFactCheck(raw: string) → FactCheckResult[]
- parseFallacies(raw: string) → Fallacy[]
- All parsers validate against the type schema and fill defaults for missing fields
- Log warnings for unexpected formats without crashing

In /worker/src/index.ts:
- Set up the Worker with 4 routes:
  - POST /api/analyze/claims → call Claude API with CLAIM_EXTRACTION_PROMPT
  - POST /api/analyze/factcheck → call Claude API with FACT_CHECK_PROMPT + web search tool enabled
  - POST /api/analyze/reasoning → call Claude API with REASONING_ANALYSIS_PROMPT
  - POST /api/unfurl → fetch URL and extract text (stub for now, implement in a later phase)

In /worker/src/middleware/rateLimit.ts:
- Simple in-memory rate limiter: 20 requests per minute per IP
- Return 429 with retry-after header when exceeded

In /worker/src/middleware/cors.ts:
- Allow origin: claims.anystackdom.dev and localhost:5173 (dev)
- Allow methods: POST, OPTIONS
- Allow headers: Content-Type

In /worker/wrangler.toml:
- Configure worker name: claimslens-api
- Add placeholder for ANTHROPIC_API_KEY secret
- Set compatibility_date to today

Test the worker locally with `wrangler dev` — send a test POST to /api/analyze/claims with a sample social media post and verify Claude returns structured claims.
```

---

## Phase 6: Analysis Orchestrator

```
In /app/src/analysis/, build the orchestrator that coordinates all five analysis layers.

Create orchestrator.ts:
- AnalysisOrchestrator class:
  - constructor(sentimentModel, intentModel, apiClient)
  - analyze(input: AnalysisInput, onProgress: ProgressCallback) → Promise<AnalysisResult>

  The analysis pipeline runs in this order:
  1. Preprocess: normalize text, split sentences, extract metadata
  2. Local models (parallel, instant):
     - Run sentiment model on each sentence
     - Run intent model on each sentence (using sentiment as input)
     - Call onProgress({ stage: 'local_complete', sentences })
  3. Claim extraction (API):
     - Send text + sentences to Claude
     - Parse response into Claim[]
     - Attach claims to their parent sentences
     - Call onProgress({ stage: 'claims_complete', claims })
  4. Fact verification (API):
     - Send extracted claims to Claude with web search
     - Parse verdicts, attach to claims
     - Call onProgress({ stage: 'factcheck_complete', claims })
  5. Reasoning analysis (API):
     - Send text + sentences + claims to Claude
     - Parse fallacies, attach to sentences and claims
     - Call onProgress({ stage: 'reasoning_complete', fallacies })
  6. Scoring:
     - Compute manipulation score and rhetorical grade
     - Call onProgress({ stage: 'complete', result })

- ProgressCallback type:
  type ProgressCallback = (update: {
    stage: 'local_complete' | 'claims_complete' | 'factcheck_complete' | 'reasoning_complete' | 'complete';
    sentences?: SentenceAnalysis[];
    claims?: Claim[];
    fallacies?: Fallacy[];
    result?: AnalysisResult;
  }) => void;

Create merger.ts:
- mergeLayers(sentences, claims, fallacies) → SentenceAnalysis[]
  - Attach each claim to its parent sentence by matching text spans
  - Attach each fallacy to its related sentences and claims by ID
  - Handle edge cases: a claim spanning multiple sentences, a fallacy involving non-adjacent sentences

Create scorer.ts:
- computeManipulationScore(sentences, claims, fallacies) → number (0-100)
  - Weighted formula:
    - Emotional manipulation (high arousal + fear/urgency/outrage tones): 30% weight
    - Intent mismatch (stated vs detected): 15% weight
    - False/misleading claims ratio: 30% weight
    - Fallacy count and severity: 25% weight
  - Normalize to 0-100

- computeRhetoricalGrade(manipulationScore, claims, fallacies) → 'A' | 'B' | 'C' | 'D' | 'F'
  - A: score 0-15, no false claims, no major fallacies
  - B: score 16-35, no false claims
  - C: score 36-55
  - D: score 56-75
  - F: score 76-100 or any contradicted factual claim

Write tests:
- Test the full pipeline with a mock API client (return fixed claim/fallacy data)
- Test the scorer with known inputs (a clean informational post should score A, a manipulative post should score D or F)
- Test the merger correctly links claims to sentences and fallacies to claims
```

---

## Phase 7: Layout & Input UI

```
Build the main app layout and input components. No visualizations yet — just structure.

Create Layout.tsx:
- Full-viewport dark layout using CSS Grid
- Three main areas:
  1. Top bar: logo ("ClaimsLens"), subtitle ("Rhetorical Analysis Engine"), layer toggle controls
  2. Center: split into text analysis area (65%) and sidebar (35%)
  3. Bottom: credibility dashboard strip
- Responsive: on mobile (<768px), sidebar collapses below the text area

Create InputRouter.tsx:
- Tab interface with three modes: "Paste Text" (default), "Paste URL" (grayed out, "coming soon"), "Screenshot" (grayed out, "coming soon")
- Only Paste Text is functional in MVP

Create TextInput.tsx:
- Large dark textarea with placeholder: "Paste any social media post..."
- Character count in bottom-right corner (max 5000)
- "Analyze" button — prominent, blue/indigo accent
- When analysis is running, button shows progress state
- Below the textarea: a row of 3 example post buttons:
  - "Political tweet" — a fabricated example with claims and fallacies
  - "LinkedIn hustle post" — a fabricated motivational/sales post
  - "Health claim" — a fabricated health misinformation post
  Clicking one populates the textarea with that example text

Create ExamplePosts.ts:
- Three carefully crafted example posts (200-400 chars each) that exercise all five analysis layers:
  1. Political: contains 2 factual claims (one true, one misleading), a false dichotomy, appeal to fear, and urgency
  2. LinkedIn: contains flattery, manufactured authority, selling disguised as informing, anecdotal evidence
  3. Health: contains hedged claims ("studies show"), appeal to nature fallacy, one contradicted claim, one unverifiable claim

Create AnalysisProgress.tsx:
- Horizontal progress bar with 5 stage markers:
  1. Sentiment & Intent (local) — instant, always first to complete
  2. Extracting Claims — waiting/streaming
  3. Fact-Checking — waiting/streaming
  4. Analyzing Reasoning — waiting/streaming
  5. Complete — all done
- Each stage shows a checkmark when complete, spinner when active, dimmed when pending
- Estimated time remaining based on average API response times

Create LayerToggles.tsx:
- Row of 5 toggle buttons, one per analysis layer:
  - Sentiment (orange)
  - Intent (purple)
  - Claims (blue)
  - Fact-Check (green/red)
  - Fallacies (yellow)
- Each toggle enables/disables its overlay on the text
- All start enabled
- Visual: pill-shaped buttons with the layer's accent color when active, dimmed when off

Wire everything in App.tsx:
- State management via useReducer:
  - inputText: string
  - analysisState: 'idle' | 'analyzing' | 'complete'
  - analysisResult: AnalysisResult | null
  - progressStage: current stage
  - activeLayers: Set<LayerName>
- On "Analyze" click: instantiate orchestrator, run analysis, update state via onProgress callback
- Show TextInput when idle, show TextInput (readonly) + analysis overlay when complete

Dark palette: bg-gray-950 base, gray-900 panels, gray-800 borders. Accent colors per layer. Monospace for numbers. Inter or system font for text.
```

---

## Phase 8: Text Overlay & Annotation System

```
Build the core text overlay visualization — this is the centerpiece of the UI.

The original text is displayed in a readable format, and each analysis layer renders as a visual annotation on top of it. Layers can be toggled independently and should not clash visually when stacked.

Create TextOverlay.tsx:
- Renders the original text as a series of <span> elements, one per sentence
- Each sentence span has data attributes for its sentence ID
- Supports multiple annotation layers simultaneously via CSS classes and pseudo-elements

Annotation layer implementations:

1. SentimentRibbon.tsx:
- A thin colored strip (4px) on the left border of each sentence
- Color mapping:
  - neutral → gray-500
  - fear_appeal → red-500
  - urgency → amber-500
  - outrage → red-600
  - flattery → pink-400
  - false_calm → teal-400
  - manufactured_authority → purple-500
  - sarcasm → lime-400
  - empathy → blue-400
  - celebration → green-400
- On hover: tooltip showing tone label, valence, arousal, and top 3 contributing words
- On click: open FeatureInspector for that sentence

2. IntentBadge.tsx:
- Small pill badge at the end of each sentence showing the detected intent
- Color matches the intent (inform → blue, persuade → indigo, sell → green, mislead → red, etc.)
- Opacity proportional to confidence (low confidence = more transparent)
- On hover: show full intent distribution as a mini horizontal bar chart
- If intent mismatch detected: badge has a warning icon and dashed border

3. ClaimHighlight.tsx:
- Underline on claim text spans within sentences
- Color by claim type: factual → blue, opinion → gray, prediction → purple, assumption → amber
- When fact-check results are available, override color by verdict:
  - supported → green underline
  - contradicted → red underline with strikethrough effect
  - misleading → orange underline with wavy pattern
  - unverifiable → gray dashed underline
  - outdated → yellow underline
- On hover: show claim card preview (type, verdict, one-line explanation)
- On click: scroll to and highlight the full claim card in the sidebar

4. FallacyAnnotation.tsx:
- Margin annotation (right side) connected to the relevant text span by a thin line
- Shows fallacy name in a small label (e.g., "False Dichotomy")
- Color by severity: minor → yellow, moderate → orange, major → red
- If a fallacy involves multiple sentences, draw a bracket spanning them
- On hover: show the full fallacy explanation
- On click: expand inline with the explanation text

Create FeatureInspector.tsx:
- A modal or slide-out panel that shows the per-word analysis for a selected sentence
- Displays the sentence with each word colored by its feature weight contribution
- Shows a ranked list of features and their weights for both sentiment and intent
- This is the "why did it classify this way" view — the transparency feature
- Include a legend explaining what each feature means

Implementation notes:
- Use a single container div with position: relative
- Each annotation layer is an absolutely positioned overlay
- Sentence spans use data-sentence-id for targeting
- Use CSS custom properties for layer colors so toggling is instant
- Performance: only render visible annotations (use IntersectionObserver for long texts)
```

---

## Phase 9: Claim Cards & Credibility Dashboard

```
Build the sidebar claim cards and the bottom credibility dashboard.

Create ClaimCard.tsx:
- A card component for each extracted claim, displayed in the sidebar
- Card contents:
  - Claim text (quoted from the original)
  - Type badge: factual | opinion | prediction | assumption
  - Hedging indicator: if hedging detected, show the hedge phrase with an explanation ("'Studies show' is used here without citing specific studies")
  - Fact-check verdict (when available):
    - Color-coded verdict badge (green/red/orange/gray/yellow)
    - Confidence percentage
    - Explanation paragraph
    - Sources list: clickable links with source title and how it supports/contradicts
    - Missing context note (for "misleading" verdict)
  - Related fallacies: if any fallacy references this claim, show a link to it
- States:
  - Loading: skeleton placeholder while waiting for API
  - Fact-check pending: claim visible, verdict area shows spinner
  - Complete: full card with all data
- On click: highlight the corresponding text span in the overlay
- On hover over source links: show source preview

Create ClaimCardList.tsx:
- Scrollable sidebar list of all ClaimCards
- Grouped by sentence order (claims appear in the order they occur in the text)
- Filter buttons at top: All | Factual | Opinion | Prediction
- Sort: by order (default) or by verdict severity (false first)
- Count badge: "4 claims (2 verified, 1 false, 1 unverifiable)"

Create CredibilityDashboard.tsx:
- Horizontal strip at the bottom of the layout
- Contains 5 summary metrics:
  1. Rhetorical Grade: large letter (A–F) with color (A=green, F=red), with a brief label ("Clean" / "Minor issues" / "Misleading" / "Manipulative" / "Deceptive")
  2. Claims breakdown: mini donut chart — supported/contradicted/misleading/unverifiable counts
  3. Manipulation Score: 0-100 gauge with color gradient
  4. Dominant Intent: icon + label for the primary detected intent across all sentences
  5. Fallacy Count: number + severity breakdown (minor/moderate/major)
- Each metric is clickable — scrolls to the relevant section or toggles the relevant layer
- Animate in as each analysis stage completes

Create FallacyCard.tsx:
- Similar to ClaimCard but for fallacies
- Shows: fallacy name, type, severity badge, involved sentence(s) quoted, explanation
- "Learn more" expandable section with the general definition of this fallacy type
- Links back to the text overlay to highlight involved sentences

Create FallacyCardList.tsx:
- Separate tab or section in the sidebar (tabs: "Claims" | "Fallacies")
- Sorted by severity (major first)
- Count badge with severity breakdown

Wire the sidebar into Layout.tsx as a tabbed panel: Claims tab (default) and Fallacies tab.
```

---

## Phase 10: Report Image Generator

```
Build the shareable report image export system.

Create ReportTemplate.tsx:
- A React component that renders the full analysis as a self-contained, branded card
- NOT displayed in the main UI — rendered off-screen for capture
- Dimensions:
  - Threads/Instagram: 1080 x 1350px (4:5 portrait)
  - Twitter: 1200 x 675px (16:9 landscape)
  - Square: 1080 x 1080px
- Dark background (#0a0a0f) with subtle grain texture

Layout of the report card:
  - Header: "ClaimsLens Analysis" logo + watermark
  - Original text: displayed in a quote-style block (max ~300 chars, truncated with ellipsis for longer posts)
  - Rhetorical Grade: large, color-coded letter grade prominently displayed
  - Manipulation Score: gauge visualization
  - Key findings section (3-4 bullet points):
    - Number of claims and their verdicts
    - Dominant detected intent
    - Most severe fallacy (if any)
    - One-sentence summary from Claude
  - Sentiment ribbon: miniature version of the per-sentence tone strip
  - Footer: "claims.anystackdom.dev" + "Analyze any post at" call to action

Design it to be visually striking — this is marketing material:
- Use Inter for body text, a monospace font for data points
- Indigo/violet gradient accents
- Subtle glow effects on the grade letter
- Clean data visualization for the claims breakdown

Create ImageExporter.ts:
- Uses html2canvas to capture the ReportTemplate as a PNG
- Install html2canvas: `pnpm add html2canvas`
- exportReport(analysisResult, format: 'threads' | 'twitter' | 'square') → Promise<Blob>
  - Renders ReportTemplate off-screen at the target resolution
  - Captures to canvas
  - Converts to PNG blob
  - Returns blob for download or sharing

Create CarouselExporter.ts (stretch goal, keep simple for MVP):
- For complex analyses, split into multiple images:
  1. Overview card (grade + score + summary)
  2. Claims card (each claim with verdict)
  3. Fallacies card (each fallacy with explanation)
- Same visual style as the single report
- For MVP, just implement the single-card export — carousel can be v2

Create ShareMenu.tsx:
- Button in the top bar: "Export Report"
- Dropdown with options:
  - Download as PNG (Threads format) — default
  - Download as PNG (Twitter format)
  - Download as PNG (Square format)
  - Copy to clipboard (uses navigator.clipboard.write with ClipboardItem)
- Show a preview of the report before exporting
- Loading state while html2canvas renders

Wire ShareMenu into the layout, visible only after analysis is complete.
```

---

## Phase 11: Polish, Performance & Examples

```
Final polish pass across the entire app.

Performance:
- Profile the analysis pipeline end-to-end
- Ensure local model inference is <50ms per sentence (should be trivially fast)
- Add a loading skeleton for the sidebar while API calls are in flight
- Debounce the textarea input (don't re-render on every keystroke)
- Lazy-load html2canvas (only import when user clicks export)

Visual polish:
- Smooth fade-in animations as each analysis layer completes
- Hover transitions on claim cards and fallacy cards (subtle lift + shadow)
- Pulse animation on the "Analyze" button when idle
- Progress bar should animate smoothly between stages, not jump
- Add subtle backdrop blur to the FeatureInspector modal
- Monospace numerals for all live-updating numbers
- Ensure claim underlines don't clash with hyperlink styles

Refine the 3 example posts:
- Political example: Test it against the full pipeline. Ensure it produces at least 2 claims (1 supported, 1 contradicted), 1 fallacy, a fear_appeal or urgency tone, and a persuade or mislead intent.
- LinkedIn example: Should produce sell or virtue_signal intent, flattery or manufactured_authority tone, anecdotal_evidence fallacy.
- Health example: Should produce misleading or contradicted fact-check, hedging detection, appeal_to_authority or appeal_to_nature fallacy.
- Iterate the example text until they reliably produce interesting analyses.

Edge cases:
- Empty text → disabled analyze button
- Text under 10 characters → "Text too short for analysis"
- Text over 5000 characters → truncation warning
- API error → graceful fallback with error message, local models still show results
- Rate limit hit → user-friendly "Too many requests, try again in X seconds"
- Claude returns malformed JSON → parsers log warning, skip that layer, show partial results

Accessibility:
- Keyboard navigation: Tab through claim cards, Enter to expand
- Screen reader labels on all toggle buttons, badges, and interactive elements
- Color is never the only indicator — all color-coded elements also have text labels or icons
- Focus indicators on all interactive elements

Responsive:
- Test at 1440px, 1280px, 1024px, 768px
- At 768px: sidebar moves below text overlay, dashboard becomes vertical
- At 1024px: sidebar narrows to 30%
- Touch targets are minimum 44px on mobile

Meta:
- Add Open Graph meta tags with a static preview image
- Title: "ClaimsLens — Rhetorical Analysis Engine"
- Description: "Paste any social media post. See every claim, fact-check, fallacy, and manipulation tactic — instantly."
- Favicon: a lens icon in indigo
- "Built by @anystack.dev" watermark in the bottom-right corner, linking to anystackdom.dev
```

---

## Phase 12: Deploy to Cloudflare

```
Set up deployment for both the static frontend and the Worker API proxy.

1. Frontend — Cloudflare Pages:
   - Connect to the GitHub repo
   - Build command: cd app && pnpm build
   - Output directory: app/dist
   - Node.js version: 20
   - Configure custom domain: claims.anystackdom.dev
   - Add CNAME record in Cloudflare DNS

2. Worker — Cloudflare Workers:
   - From /worker directory: wrangler deploy
   - Worker name: claimslens-api
   - Route: api.claims.anystackdom.dev/* (or claims.anystackdom.dev/api/*)
   - Set secret: wrangler secret put ANTHROPIC_API_KEY
   - Verify the worker responds to POST /api/analyze/claims

3. Connect frontend to worker:
   - In /app, set the API base URL via environment variable
   - VITE_API_URL=https://claims.anystackdom.dev/api (production)
   - VITE_API_URL=http://localhost:8787/api (development)

4. GitHub Actions workflow (.github/workflows/deploy.yml):
   - Trigger on push to main
   - Jobs:
     a. Lint + test (app): pnpm install → tsc --noEmit → vitest run
     b. Build + deploy frontend: pnpm build → deploy to Cloudflare Pages
     c. Deploy worker: cd worker → wrangler deploy
   - Use Cloudflare API token stored as GitHub secret

5. Add _headers file in /app/public/:
   - Cache static assets: 1 year for hashed JS/CSS
   - Security: X-Content-Type-Options, X-Frame-Options: DENY, CSP
   - No cache for index.html

6. Worker wrangler.toml final config:
   - Rate limiting: 20 req/min per IP
   - CORS: only allow claims.anystackdom.dev origin
   - Max request body: 10KB

7. Create README.md at the repo root:
   - Screenshot of the app analyzing a post (add after first deploy)
   - "What is this" — one paragraph
   - "How it works" — the 5 layers explained briefly
   - "Tech stack" — list with rationale
   - "Run locally" — pnpm install, set up API key, pnpm dev
   - "Architecture" — link to 02-technical-spec.md
   - Link to live demo: claims.anystackdom.dev
   - "Built by" section with links to anystackdom.dev and @anystack.dev

8. Verify end-to-end:
   - Visit claims.anystackdom.dev
   - Click the "Political tweet" example
   - Hit analyze
   - Confirm all 5 layers render correctly
   - Export a report image
   - Verify it looks good when shared on Threads (correct dimensions, readable text, watermark visible)

9. Do NOT actually deploy — just set up all configuration files and verify locally. Deployment requires the ANTHROPIC_API_KEY to be set as a secret, which should be done manually.
```
