# ClaimsLens — Getting Started

---

## How These Documents Work Together

| File | Purpose |
|---|---|
| `01-idea-outline.md` | The "what and why" — scope, audience, features, differentiators |
| `02-technical-spec.md` | The "how" — architecture, data models, module breakdown, API design |
| `03-app-philosophy.md` | The "spirit" — design principles, what it is and isn't |
| `04-build-prompts.md` | The "do" — 12 sequential Claude Code CLI prompts |
| `05-getting-started.md` | This file — execution plan and tips |

The build prompts in `04` are designed to be executed in order. Each phase produces a testable, committable increment.

---

## Prerequisites

### Tools

- **Node.js 20+** — install via `nvm` or `brew install node`
- **pnpm** — install via `npm install -g pnpm`
- **Claude Code CLI** — your build execution tool
- **wrangler** — Cloudflare Worker CLI (`pnpm add -g wrangler`)
- **Git** — version control

### Accounts & Keys

- **Anthropic API key** — required for the Claude-powered layers (claim extraction, fact-check, fallacy detection). Get one at console.anthropic.com
- **Cloudflare account** — free tier for Pages + Workers
- **GitHub** — for the repo and CI/CD

### Domain Setup (do this early)

Add a CNAME record for `claims.anystackdom.dev` pointing to your Cloudflare Pages project. Propagation takes minutes.

### Cost Estimate

- **Cloudflare Pages + Workers**: Free tier (100K worker requests/day)
- **Claude API**: ~$0.01-0.03 per full analysis (3 API calls on short text). 100 analyses/day ≈ $1-3/day. Set a usage cap on console.anthropic.com to avoid surprises.
- **Total**: Effectively free for portfolio-level traffic.

---

## Recommended Order of Operations

### Week 1: Foundation + Local Models (Phases 1–4)

1. **Phase 1** — Scaffold the monorepo. Verify frontend runs, worker stubs respond. Commit.
2. **Phase 2** — Types and preprocessor. This is the data contract everything else depends on. The sentence splitter needs to handle social media text well — test it thoroughly.
3. **Phase 3** — Sentiment model. Hand-crafted weights won't be perfect, but they should be directionally correct. "BREAKING: URGENT!!!" should score urgency. If it doesn't, adjust weights before moving on.
4. **Phase 4** — Intent model. Similar approach. The stated-vs-detected mismatch feature is the secret weapon — "I'm just asking questions" flagged as `provoke` intent is the kind of insight that makes people share the analysis.

**Checkpoint**: You have two working from-scratch ML models with inspectable feature weights. The models run in <50ms. This alone is a Threads post: "I built a sentiment analysis model from scratch in TypeScript. Here's what it sees in a viral tweet."

### Week 2: Claude Integration + UI (Phases 5–8)

5. **Phase 5** — Worker proxy + Claude prompts. This is where the app gets powerful. The prompts are critical — iterate them against the example posts until they produce clean, structured JSON. Test each endpoint independently with curl before wiring up the frontend.
6. **Phase 6** — Orchestrator. The progressive loading pattern (local → claims → fact-check → reasoning) is both a UX feature and a technical necessity. Test the full pipeline end-to-end.
7. **Phase 7** — Layout and input UI. The app gets a face. Example posts should be pre-loaded and tested against the full pipeline.
8. **Phase 8** — Text overlay system. The hardest UI phase. Get the annotation system right — toggling layers on/off should be instant. Feature inspector is the "inspect element for rhetoric" moment.

**Checkpoint**: The app is fully functional. Paste text, get five-layer analysis with interactive overlays. This is the second major content milestone — screen recording of an analysis in action.

### Week 3: Sidebar + Reports + Ship (Phases 9–12)

9. **Phase 9** — Claim cards and credibility dashboard. These make the analysis digestible. The rhetorical grade (A–F) is the most shareable single data point.
10. **Phase 10** — Report image generator. This is the growth engine. Every exported image has your watermark and a link to the tool. Test the output at actual Threads dimensions.
11. **Phase 11** — Polish, edge cases, accessibility. This is where it goes from "demo" to "portfolio piece."
12. **Phase 12** — Deploy. Set up Cloudflare Pages + Worker, configure the domain, set the API key secret.

**Checkpoint**: Live at claims.anystackdom.dev. Third major post: "I built a tool that X-rays any social media post for manipulation. Try it."

---

## How to Work Through the Build Phases

1. Open Claude Code CLI in the project root.
2. Paste the Phase N prompt from `04-build-prompts.md`.
3. Let Claude Code execute. Review the output.
4. Test manually: `pnpm dev` (frontend), `wrangler dev` (worker), `pnpm test`.
5. Fix anything that's off — manually or with a follow-up prompt.
6. Commit with: `feat(phase-N): [description]`
7. Move to the next phase.

**Don't batch phases.** Each one is designed to produce a testable increment.

---

## Tips for Customizing Prompts

- **Prompt engineering is the product.** The Claude prompts in Phase 5 are the most important code in the project. If the fact-checker returns "unverifiable" for everything, or the fallacy detector flags every sentence, the tool is useless. Budget time for prompt iteration.
- **Start with the examples.** The 3 example posts are your integration test suite. Run them through every pipeline change. If the political tweet doesn't produce at least one "contradicted" verdict and one fallacy, something is wrong.
- **Weight tuning.** The hand-crafted sentiment and intent weights are a starting point. After the full pipeline works, analyze 20-30 real social media posts and adjust weights based on where the models are obviously wrong. Document your changes.
- **Report design matters.** The exported image is how most people encounter your tool. Spend real time on the visual design of ReportTemplate.tsx. Screenshot it, post it to Threads, and see if it looks good in a feed before calling it done.

---

## Prompt Engineering Guide for the Claude Layers

Since the Claude prompts are central to the product, here's guidance for iterating them:

### Claim Extraction
- **Common failure**: Claude over-extracts, turning every sentence into a "claim." Fix by tightening the definition in the system prompt — a claim must be falsifiable or attributable.
- **Common failure**: Missing hedging detection. Add explicit examples of hedging phrases to the few-shot examples.
- **Test case**: "Some experts believe vaccines cause autism, though the evidence is mixed." Should extract one claim (vaccines cause autism), tag it as factual, and flag "some experts" and "evidence is mixed" as hedging.

### Fact-Checking
- **Common failure**: Claude says "supported" without actually searching. Ensure the system prompt instructs it to always use the web search tool for factual claims.
- **Common failure**: Everything is "unverifiable." Tighten the prompt — only opinions and predictions are unverifiable. Factual claims about verifiable events should get a real verdict.
- **The "misleading" verdict is the hardest.** Test with: "Crime is up 200% in [city]." It might be technically true for one specific crime type in one specific quarter, but misleading as a blanket statement. The prompt needs to instruct Claude to check for cherry-picking and missing context.

### Fallacy Detection
- **Common failure**: Over-detection. The prompt must emphasize precision over recall — "if you're not confident, don't flag it."
- **Common failure**: Labeling disagreements as fallacies. "I think X" is not a fallacy. The prompt needs to distinguish between argumentation errors and subjective positions.
- **Test case**: "Either we ban all cars or we accept road deaths." Should flag false_dichotomy. "I prefer walking" should flag nothing.

---

## Content Strategy Notes

| Milestone | Post Idea |
|---|---|
| Phase 3 complete | "I built a sentiment model from scratch in TypeScript. Here's what it sees in [viral tweet]." + screenshot of feature weights |
| Phase 4 complete | "My from-scratch intent classifier detected 'concern trolling' in a LinkedIn post. Here's how." |
| Phase 8 working | Screen recording of typing/pasting a post and watching analysis layers appear |
| Phase 9 dashboard | Screenshot of the credibility dashboard showing an F grade on a famous misleading tweet |
| Phase 10 report | The actual exported report image IS the post — "I ran [public post] through my rhetorical analysis engine." |
| Live deploy | "Paste any social media post. See every claim, fallacy, and manipulation tactic. claims.anystackdom.dev" |
| Ongoing | Weekly "ClaimsLens Report" series analyzing trending/viral posts — the tool generates your content forever |

The "weekly ClaimsLens Report" format is the long-term play. Each week you analyze a viral or controversial post, export the report image, and post it with commentary. The tool *is* the content engine. The content *is* the marketing for the tool.
