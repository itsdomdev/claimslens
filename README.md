# ClaimsLens — Rhetorical Analysis Engine

Paste any social media post. See every claim, fact-check, fallacy, and manipulation tactic — instantly.

**Live demo**: [claims.anystackdom.dev](https://claims.anystackdom.dev)

## What is this?

ClaimsLens runs five layers of rhetorical analysis on any social media post: claim extraction, sentiment/tone mapping, intent classification, fact verification, and logical fallacy detection. Each layer renders as a toggleable overlay on the original text, like X-ray vision for rhetoric. Every analysis can be exported as a shareable report image.

## How it works

1. **Sentiment & Tone** (local, instant) — From-scratch TypeScript classifier detecting fear appeal, urgency, outrage, flattery, manufactured authority, and more. Every classification is explainable: see which words triggered each label.

2. **Intent** (local, instant) — From-scratch intent classifier: inform, persuade, sell, mislead, provoke, concern troll, virtue signal, and more. Detects stated-vs-detected intent mismatches ("I'm just asking questions" → detected: provoke).

3. **Claim Extraction** (Claude API) — Identifies factual claims, opinions, predictions, and assumptions. Detects hedging language ("studies show", "some experts believe").

4. **Fact Verification** (Claude API + web search) — Each claim is checked: supported, contradicted, misleading-but-technically-true, unverifiable, or outdated. Sources linked.

5. **Reasoning Analysis** (Claude API) — Detects 20 types of logical fallacies with specific textual evidence. Each detection explains *why* it's a fallacy.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Type safety across models and API |
| Framework | React 19 + Vite | Fast builds, static output |
| Styling | Tailwind CSS 4 | Dark theme, rapid iteration |
| Local ML | Pure TypeScript, zero deps | The from-scratch models import nothing |
| Claude API | Anthropic SDK | Claim extraction, fact-check, fallacy detection |
| API proxy | Cloudflare Worker | Secrets management, rate limiting |
| Image export | html2canvas | Client-side report PNG generation |
| Testing | Vitest | Fast, Vite-native |
| Deploy | Cloudflare Pages + Workers | Static site + API on same platform |

## Run locally

```bash
# Install dependencies
pnpm install

# Start frontend (mock mode — no API key needed)
pnpm dev

# Start worker (requires ANTHROPIC_API_KEY)
cd worker && pnpm dev
```

The app works fully in mock mode (`VITE_USE_MOCKS=true` in `.env`) without an API key. Mock responses use heuristic-based analysis for realistic outputs.

To use real Claude API:
1. Set `ANTHROPIC_API_KEY` in worker: `cd worker && wrangler secret put ANTHROPIC_API_KEY`
2. Set `VITE_USE_MOCKS=false` in `app/.env`

## Architecture

See [context/02-technical-spec.md](context/02-technical-spec.md) for the full technical specification.

```
Browser:  Input → Preprocessor → [Sentiment + Intent (local)] → [Claims → Fact-Check → Reasoning (API)] → Overlay UI → Report Export
Worker:   POST /api/analyze/{claims,factcheck,reasoning} → Claude API proxy with rate limiting
```

## Built by

[@anystack.dev](https://anystackdom.dev)
