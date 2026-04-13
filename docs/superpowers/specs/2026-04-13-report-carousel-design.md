# Report Carousel — Design Spec

## Overview

Expand the exported report from a single overview image to a 3-page carousel with per-claim verdicts, fallacy details, and intent breakdown. Each page is independently exportable. The share menu lets the user pick which page(s) to download.

## Page Designs

### Page 1: Overview (existing, enhanced)

Current content, plus:
- Page indicator in top-right corner ("1/3", "1/2", or "1/1" depending on which pages are applicable)
- No other changes to layout

### Page 2: Claims & Fact-Check

- **Header**: compact — logo left, "Claims Analysis" center, page indicator right ("2/3")
- **Claims list**: each claim rendered as a mini card:
  - Claim text in quotes (truncated at 120 chars)
  - Left border color-coded by verdict (green supported, red contradicted, amber misleading, gray unverifiable, yellow outdated)
  - Type badge: factual / opinion / prediction / assumption
  - Verdict badge: color-coded pill with verdict text
  - One-line explanation (truncated at 100 chars)
  - If hedging detected: small amber "hedging" label
- Max 5 claims shown. If more, show "+N more claims" at bottom.
- **Footer**: watermark "claims.anystackdom.dev"
- **Skip condition**: if zero claims extracted, this page is omitted

### Page 3: Fallacies & Intent

- **Header**: compact — logo left, "Reasoning Analysis" center, page indicator right ("3/3")
- **Fallacies section** (top half):
  - Section label "Logical Fallacies"
  - Each fallacy as a row: severity badge (color-coded pill: minor yellow, moderate orange, major red), fallacy name in bold, explanation text (truncated at 120 chars)
  - Max 4 fallacies shown
  - If zero fallacies: show "No logical fallacies detected" with a green checkmark
- **Intent section** (bottom half):
  - Section label "Detected Intent"
  - Dominant intent name + confidence percentage (large)
  - Horizontal bar chart of top 4 intents from the distribution, each bar labeled with intent name and percentage
  - If stated-vs-detected mismatch exists on any sentence: show a warning row with mismatch explanation (truncated)
- **Footer**: watermark
- **Skip condition**: if zero fallacies AND dominant intent is "inform" with >80% confidence, this page is omitted

## Page Indicator Logic

Count applicable pages (skip page 2 if no claims, skip page 3 if no fallacies + boring intent). Page indicators reflect actual count:
- All 3 applicable: "1/3", "2/3", "3/3"
- Only 2 applicable: "1/2", "2/2"
- Only 1 applicable: no indicator shown

## Share Menu Changes

The share menu dropdown has two sections:

**Content selection** (radio buttons):
- Overview only (default)
- Claims detail
- Reasoning detail
- Full carousel (all applicable pages)

**Format selection** (radio buttons, same as current):
- Threads / Instagram (1080x1350)
- Twitter / X (1200x675)
- Square (1080x1080)

**Actions**:
- "Download PNG" — downloads selected content. For single page: one PNG. For full carousel: downloads each page as a separate file (`claimslens-overview.png`, `claimslens-claims.png`, `claimslens-reasoning.png`).
- "Copy to Clipboard" — copies the selected single page. For carousel, copies page 1 only.

## File Changes

### Modify: `app/src/report/ReportTemplate.tsx`
- Split into 3 page components: `OverviewPage`, `ClaimsPage`, `ReasoningPage`
- Each accepts `result`, `format`, `pageIndicator` props
- Each renders at the target dimensions with the shared visual style (dark gradient, indigo accents, same header/footer pattern)
- Export a `ReportPages` component that renders all applicable pages as separate offscreen divs, each with its own ref

### Modify: `app/src/report/ImageExporter.ts`
- `exportReport` signature changes: accepts an array of elements, returns `Blob[]`
- Add `exportSinglePage(element, format)` for single-page export
- Download helper handles single file or multiple sequential downloads

### Modify: `app/src/ui/ShareMenu.tsx`
- Add content selection (overview / claims / reasoning / carousel)
- Wire to the correct page ref(s)
- Multi-download for carousel mode
- Preview thumbnails not needed for MVP — just labels

## Visual Consistency

All 3 pages share:
- Same dark gradient background (`#0a0a0f` → `#0f0f1a` → `#0a0a0f`)
- Same header pattern (logo left, title center, indicator right)
- Same footer (watermark + CTA)
- Same font sizes and spacing scaled by format (twitter more compact)
- Same indigo accent color for section headers and dividers

## What Doesn't Change
- Analysis pipeline, models, orchestrator
- In-app visualization (sidebar, overlay, dashboard)
- Existing report format dimensions
- ImageExporter's html2canvas approach (still 2x scale, lazy-loaded)
