# ClaimsLens — Rhetorical Analysis Engine

## Concept Summary

A browser-based tool that takes any social media post — tweet, Threads post, LinkedIn essay, Instagram caption, Reddit comment — and runs five layers of rhetorical analysis on it: claim extraction, sentiment/tone mapping, intent classification, fact verification, and logical fallacy detection. Each layer renders as a toggleable overlay on the original text, like X-ray vision for rhetoric. Sentiment and intent models are built from scratch and inspectable. Claim extraction, fallacy detection, and fact-checking use Claude API with web search. Every analysis can be exported as a shareable report image.

## Problem Statement

Social media is an arms race between increasingly sophisticated persuasion and people who have no tools to see through it. Everyone has a gut reaction to a post — "this feels manipulative" — but can't articulate *why*. The techniques are well-documented (logical fallacies, emotional manipulation, misleading framing) but recognizing them in the wild, in real time, on content you're emotionally reacting to, is a skill most people don't have. There's no tool that takes a post and says: "Here are the 3 factual claims, here's what's actually true, here's the fear appeal in sentence 2, and here's the false dichotomy in the conclusion." ClaimsLens makes rhetoric visible.

## Target Audience

- **Primary**: Chronically-online critical thinkers who already care about media literacy but want a tool to validate and sharpen their instincts — the "let me check this" crowd.
- **Secondary**: The tech/AI Threads and Twitter audience who will share analysis screenshots of trending posts — the tool becomes content about content.
- **Tertiary**: Students, journalists, researchers who need structured rhetorical analysis for academic or professional work.
- **Portfolio audience**: Founders and hiring managers who see the multi-model orchestration, from-scratch classifiers, and Claude API integration as evidence of deep full-stack + AI engineering skill.

## Core Features

### From-Scratch Models (inspectable, browser-trainable)

- **Sentiment & Tone Classifier** — Per-sentence analysis that goes beyond positive/negative. Detects emotional manipulation tactics: appeal to fear, urgency, outrage, flattery, false calm, manufactured authority. Built as a fine-tuned small model with attention weights exposed — users can see *which words* triggered each classification. Color-coded ribbon alongside the text.
- **Intent Classifier** — What does this text want from you? Categories: inform, persuade, sell, mislead, deflect, provoke, establish authority, build trust, create urgency, virtue signal, concern troll. Shows confidence distribution across intents. Highlights the mismatch between stated intent and detected intent ("I'm just asking questions" + detected intent: seeding doubt).

### Claude API Layers

- **Claim Extractor** — Identifies every factual claim, opinion, prediction, and assumption in the text. Tags each with a type label. Detects hedging language ("some say," "it's believed," "studies show") that disguises opinion as fact or weakens attribution. Extracts claims as structured data for downstream layers.
- **Fact Verifier** — Each extracted claim is checked via Claude API with web search enabled. Returns a verdict per claim: supported (with source), contradicted (with counter-evidence), unverifiable, misleading-but-technically-true (with explanation of what's missing), or outdated. Links to primary sources.
- **Reasoning Analyzer** — Detects logical fallacies and reasoning defects in context: ad hominem, straw man, false dichotomy, slippery slope, appeal to authority, whataboutism, circular reasoning, moving the goalposts, cherry-picking, false equivalence, anecdotal evidence, burden of proof reversal, red herring, tu quoque, hasty generalization, loaded question, Texas sharpshooter. Each detection explains *why* it's a fallacy with reference to the specific claim/argument, not just a label. Also flags unsupported causal claims ("X happened, therefore Y"), missing context, and motte-and-bailey arguments.

### Analysis UI

- **Multi-layer overlay** — All five layers render as toggleable overlays on the original text. Turn on one at a time or stack them. Each layer uses a distinct visual language (color ribbons, inline badges, underlines, margin annotations) so they don't clash when stacked.
- **Claim cards** — Each extracted claim gets a card in a sidebar showing: claim text, type, fact-check verdict, associated fallacies, and the evidence chain. Cards are interactive — click to highlight the claim in the original text.
- **Analysis summary** — A top-level "credibility dashboard" showing: total claims (verified/unverified/false), dominant intent, emotional manipulation score, fallacy count, overall rhetorical health grade (A–F).

### Shareability

- **Report image generator** — One-click export of the full analysis as a designed, branded image (or multi-image carousel for complex analyses). Optimized for Threads/Twitter/Instagram dimensions. Includes the original text, layer overlays, credibility score, and key findings. Watermarked with ClaimsLens branding.
- **Report URL** — Shareable link to a static HTML report (stored as a generated page on Cloudflare, or encoded in URL if small enough).

### Input Methods

- **Paste text** — The default. Paste any social media post.
- **Paste URL** — Paste a tweet/Threads/LinkedIn URL; the app fetches the text content via web fetch or unfurling.
- **Screenshot OCR** — Upload a screenshot of a post; extract text via OCR before analysis. Handles the "I saw this on Instagram" use case.

## Nice-to-Haves / Future Scope (v2)

- **Batch analysis** — Analyze an entire account's recent posts for patterns (escalating emotional manipulation, increasing claim frequency, shifting intent).
- **Historical comparison** — "This person said X in January and Y in March" — detect contradictions across posts.
- **Browser extension** — Inline analysis overlays on Twitter/Threads/LinkedIn without leaving the platform.
- **Custom fallacy training** — Let users label new examples to improve the from-scratch classifiers over time.
- **Debate mode** — Paste two opposing posts, analyze both, identify where they're actually disagreeing vs talking past each other.
- **Manipulation playbook detector** — Pattern-match against known influence operation tactics (firehose of falsehood, coordinated amplification signals, DARVO).
- **API access** — Let other tools call ClaimsLens as a service.
- **Multi-language support** — Analyze posts in Spanish, Portuguese, etc.

## Differentiators

1. **Multi-layer analysis, not single-dimension** — Every other tool does one thing (sentiment OR fact-check OR fallacy). ClaimsLens stacks all five and shows how they interact. A claim can be factually true but deployed inside a straw man — only a multi-layer tool catches that.
2. **From-scratch inspectable models** — The sentiment and intent classifiers aren't black boxes. Users can see the attention weights, the feature contributions, and *why* the model made each classification. This is the technical portfolio flex.
3. **Designed for social media** — Not academic papers, not news articles. Optimized for the short, punchy, emotionally-loaded format of social posts. Handles thread syntax, quote-tweets, reply context.
4. **Shareable report images** — The output is designed to be posted *back* to social media. Every analysis is content. The tool feeds itself.
5. **"Misleading but technically true" as a first-class verdict** — Most fact-checkers binary: true or false. The most dangerous misinformation is technically accurate but missing context. ClaimsLens catches this explicitly.

## Monetization

None for MVP. This is a portfolio piece, content engine, and credibility builder. The analysis screenshots posted to Threads *are* the marketing. If it gets traction, API access or a browser extension could be monetized later, but that's not the goal now.
