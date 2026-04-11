# ClaimsLens — App Philosophy

---

## Core Goal

Show people exactly how a piece of text is trying to influence them — what it claims, whether those claims are true, what emotional levers it pulls, what it wants from them, and whether the logic holds — all in one view, all explainable, all shareable.

---

## Problem Context

The internet's persuasion infrastructure has outpaced people's ability to see through it. A well-crafted tweet can contain a factually true statistic deployed inside a false dichotomy, wrapped in manufactured urgency, with a concern-troll framing. Each layer is a distinct technique. No human catches all of them in real time while also having an emotional reaction to the content.

The tools that exist today are single-dimensional. Fact-checkers check facts. Sentiment analyzers report sentiment. Fallacy databases are reference material you read *after* the argument is over. Nobody has stacked these layers into one tool and said: "here's everything this text is doing to you, all at once, with receipts."

That's the gap. Not more fact-checking. Not more media literacy education. A tool that does the work *for you*, instantly, and shows its reasoning.

---

## User Experience Principles

**Instant local, progressive remote.** The moment you hit "Analyze," sentiment and intent results appear within milliseconds — they run locally, no API call. Then claims start streaming in. Then fact-check verdicts populate one by one. Then fallacies appear. The analysis builds itself in front of you like a developing photograph. You never stare at a spinner.

**Every classification is explainable.** The sentiment model doesn't just say "fear appeal." It highlights the specific words that triggered that classification and shows their weights. The fallacy detector doesn't just say "straw man." It quotes the original argument, shows the misrepresented version, and explains why it's a distortion. Nothing is a black box. If the tool can't explain why, it shouldn't flag it.

**The output is the content.** Every analysis should be screenshot-worthy. The report image isn't an afterthought — it's a first-class deliverable. The visual design of the analysis overlay should be striking enough that someone seeing it on Threads wants to know what tool made it. The tool markets itself through its output.

**Social media native.** This tool isn't built for dissertations or legal briefs. It's built for the 280-character hot take, the LinkedIn hustle sermon, the Instagram health claim, the Threads dunk. The interface, the analysis speed, the export dimensions, the example posts — everything assumes short, punchy, emotionally loaded text. That focus makes it better at what it does.

**Skepticism, not cynicism.** The tool should help people think more clearly, not make them paranoid. Not every post is manipulative. Not every claim is false. A good analysis that finds nothing wrong should feel satisfying, not disappointing. The rhetorical grade should be able to return an A.

---

## What Success Looks Like

- Someone pastes a viral tweet and says "I *knew* something was off about this" — and now they can articulate exactly what.
- Analysis screenshots get shared on Threads/Twitter with the ClaimsLens watermark visible, driving organic discovery.
- A hiring manager or founder sees the project and recognizes: custom ML models + LLM orchestration + multi-layer UI + polished export = serious engineering.
- The from-scratch sentiment and intent models are clean enough to be extracted and used in other projects as standalone modules.

---

## What This App Is NOT

- **Not a truth oracle.** The fact-checker uses web search and Claude's reasoning, not divine knowledge. It can be wrong. Verdicts include confidence scores and source links so the user can verify.
- **Not a political weapon.** The tool analyzes rhetoric, not ideology. It should be equally capable of flagging manipulation in a left-wing tweet and a right-wing op-ed. If the analysis starts feeling partisan, the prompts are broken.
- **Not a replacement for critical thinking.** It's a microscope, not a judge. It shows you what's in the text. You still decide what to do with that information.
- **Not a general NLP platform.** It does five specific things on short social media text. It's not an essay grader, a plagiarism checker, or a writing assistant.

---

## Design & Technical Philosophy

**Two tiers of AI, clearly separated.** The local models (sentiment, intent) are the "I built this from scratch" flex. They're small, fast, inspectable, and zero-dependency. The Claude API layers (claims, fact-check, fallacies) are the "I know how to orchestrate LLMs" flex. Both are impressive for different reasons. Neither should pretend to be the other.

**Dark, dense, editorial.** The UI should feel like a newsroom analysis tool, not a consumer app. Dark background, tight typography, information-dense panels. The text overlay is the center of gravity — everything else orbits it. Think Bloomberg terminal meets Hypothesis (the annotation tool).

**Progressive disclosure everywhere.** Surface level: colored highlights on text + a letter grade. One click deeper: claim cards with verdicts and sources. Another click: feature weight inspection, fallacy explanations, full evidence chains. The casual user gets value in 5 seconds. The deep diver gets value for 15 minutes.

**Prompts are product.** The Claude prompts for claim extraction, fact-checking, and fallacy detection are as important as any code in the repo. They should be versioned, tested against a set of known-good inputs, and iterated like any other critical module. A prompt regression is a product regression.

**Ship the image, not the app.** Most people will encounter ClaimsLens through a screenshot on Threads, not by visiting the site. The report image *is* the product for 90% of the audience. It needs to be self-contained, branded, and compelling enough to drive the remaining 10% to actually visit and try it themselves.
