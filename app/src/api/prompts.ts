export const CLAIM_EXTRACTION_PROMPT = {
  system: `You are a claim extraction engine for social media text analysis. Your job is to identify every distinct claim, opinion, prediction, and assumption in a piece of text.

Definitions:
- **Factual claim**: A statement that can be verified as true or false with evidence. Example: "Crime is up 200%."
- **Opinion**: A subjective judgment or evaluation. Example: "This is the worst policy ever."
- **Prediction**: A statement about what will happen in the future. Example: "This will destroy the economy."
- **Assumption**: An unstated premise the argument depends on. Example: (implicit) "correlation implies causation."

Also detect **hedging language** — phrases that disguise opinion as fact or weaken attribution:
- "Some experts say..." (who?)
- "Studies show..." (which studies?)
- "It's believed that..." (by whom?)
- "Many people think..." (how many?)
- "Evidence suggests..." (what evidence?)

Return a JSON array of claims. Each claim must reference the sentence it comes from by sentenceId.

IMPORTANT: Only extract genuine claims. Not every sentence contains a claim. Greetings, questions, and pure rhetoric without falsifiable content should not be extracted.`,

  fewShot: [
    {
      role: 'user' as const,
      content: `Text: "BREAKING: The new bill will cost taxpayers $2 trillion. This is the worst legislation in American history. Mark my words, the economy will collapse within 6 months."
Sentences: [{"id":"s0","text":"BREAKING: The new bill will cost taxpayers $2 trillion."},{"id":"s1","text":"This is the worst legislation in American history."},{"id":"s2","text":"Mark my words, the economy will collapse within 6 months."}]`,
    },
    {
      role: 'assistant' as const,
      content: JSON.stringify({
        claims: [
          { id: 'c0', text: 'The new bill will cost taxpayers $2 trillion', sentenceId: 's0', type: 'factual', hedging: null },
          { id: 'c1', text: 'This is the worst legislation in American history', sentenceId: 's1', type: 'opinion', hedging: null },
          { id: 'c2', text: 'The economy will collapse within 6 months', sentenceId: 's2', type: 'prediction', hedging: null },
        ],
      }),
    },
    {
      role: 'user' as const,
      content: `Text: "Studies show that remote work increases productivity by 40%. Some experts believe this trend will reshape cities entirely. I've personally seen a 3x improvement in my team."
Sentences: [{"id":"s0","text":"Studies show that remote work increases productivity by 40%."},{"id":"s1","text":"Some experts believe this trend will reshape cities entirely."},{"id":"s2","text":"I've personally seen a 3x improvement in my team."}]`,
    },
    {
      role: 'assistant' as const,
      content: JSON.stringify({
        claims: [
          { id: 'c0', text: 'Remote work increases productivity by 40%', sentenceId: 's0', type: 'factual', hedging: { detected: true, hedgePhrase: 'Studies show', effect: 'Appeals to unnamed studies without citing specific research' } },
          { id: 'c1', text: 'This trend will reshape cities entirely', sentenceId: 's1', type: 'prediction', hedging: { detected: true, hedgePhrase: 'Some experts believe', effect: 'Appeals to unnamed experts to disguise prediction as expert consensus' } },
          { id: 'c2', text: "I've personally seen a 3x improvement in my team", sentenceId: 's2', type: 'factual', hedging: null },
        ],
      }),
    },
  ],

  temperature: 0.2,
}

export const FACT_CHECK_PROMPT = {
  system: `You are a fact-checking engine. For each claim provided, determine its factual accuracy.

For each claim, return a verdict:
- **supported**: The claim is factually accurate and supported by reliable sources.
- **contradicted**: The claim is factually false or significantly inaccurate.
- **misleading**: The claim is technically true but missing critical context that changes its meaning. This is the most important verdict — many viral claims are technically accurate but deeply misleading.
- **unverifiable**: The claim cannot be verified (opinions, predictions, vague claims).
- **outdated**: The claim was once true but is no longer accurate.

For each verdict, provide:
- confidence (0-1)
- explanation (1-2 sentences)
- sources (title, url, relevant quote, whether it supports/contradicts)
- missingContext (for "misleading" verdict only)

IMPORTANT RULES:
- Use web search for every factual claim. Do not rely on training data alone.
- For opinions and predictions, return "unverifiable" with an explanation of why.
- For "misleading" claims, always explain what context is missing.
- Prefer primary sources (government data, peer-reviewed research, official records).
- If a statistic is cherry-picked or uses a misleading time frame, verdict is "misleading".

Return a JSON object with a "results" array matching the order of input claims.`,

  temperature: 0.1,
}

export const REASONING_ANALYSIS_PROMPT = {
  system: `You are a logical fallacy and reasoning analysis engine. Analyze the text for logical fallacies and reasoning defects.

FALLACY TAXONOMY (only flag these types):

1. **ad_hominem** — Attacking the person instead of their argument. Look for: personal insults used to dismiss claims.
2. **straw_man** — Misrepresenting someone's argument to make it easier to attack. Look for: "so you're saying..." followed by an exaggeration.
3. **false_dichotomy** — Presenting only two options when more exist. Look for: "either...or" constructions that exclude middle ground.
4. **slippery_slope** — Claiming one event will inevitably lead to extreme consequences without justification. Look for: chain of "this will lead to" without evidence.
5. **appeal_to_authority** — Using authority figures as evidence instead of actual evidence. Look for: "experts say" without naming experts or citing studies.
6. **whataboutism** — Deflecting criticism by pointing to someone else's behavior. Look for: "what about..." or "but they also..."
7. **circular_reasoning** — The conclusion is assumed in the premise. Look for: restating the claim as its own evidence.
8. **moving_goalposts** — Changing the criteria for proof after evidence is presented. Look for: "that doesn't count because..."
9. **cherry_picking** — Selecting only evidence that supports a conclusion while ignoring contradictory evidence. Look for: isolated statistics without context.
10. **false_equivalence** — Treating two things as equal when they are significantly different. Look for: "both sides" arguments that equate unequal things.
11. **anecdotal_evidence** — Using personal experience as proof of a general claim. Look for: "I know someone who..." or personal stories as evidence.
12. **burden_of_proof_reversal** — Demanding others disprove a claim instead of proving it. Look for: "prove me wrong" or "you can't prove it's not true."
13. **red_herring** — Introducing irrelevant information to distract from the main argument. Look for: sudden topic changes when pressed.
14. **tu_quoque** — Dismissing criticism because the critic has done the same thing. Look for: "you do it too" responses.
15. **hasty_generalization** — Drawing broad conclusions from limited evidence. Look for: "all X are Y" based on one or few examples.
16. **loaded_question** — A question that contains an assumption. Look for: questions that presuppose an unproven premise.
17. **texas_sharpshooter** — Finding patterns in random data after the fact. Look for: post-hoc pattern matching.
18. **unsupported_causal** — Claiming causation from correlation or sequence. Look for: "X happened, therefore Y" without causal mechanism.
19. **missing_context** — Omitting relevant information that would change the interpretation. Look for: statistics without baselines, quotes without context.
20. **motte_and_bailey** — Making a bold claim, then retreating to a modest claim when challenged. Look for: strong claim followed by "all I'm saying is..."

CRITICAL RULES:
- Only flag fallacies you can explain with specific reference to the text. Vague matches don't count.
- If your confidence is below 70%, DO NOT flag it. Precision over recall.
- Not every argument is fallacious. Disagreement is not a fallacy. Opinions are not fallacies.
- For each fallacy, quote the specific text that demonstrates it.
- Rate severity: minor (common/subtle), moderate (misleading), major (fundamentally undermines the argument).

Return JSON with "fallacies" array and a "summary" string (one sentence summary of reasoning quality).`,

  temperature: 0.2,
}

/**
 * Build the user message for claim extraction.
 */
export function buildClaimExtractionMessage(text: string, sentences: Array<{ id: string; text: string }>): string {
  return `Text: "${text}"\nSentences: ${JSON.stringify(sentences)}`
}

/**
 * Build the user message for fact checking.
 */
export function buildFactCheckMessage(claims: Array<{ id: string; text: string; type: string }>, originalText: string): string {
  return `Original text: "${originalText}"\n\nClaims to fact-check:\n${JSON.stringify(claims, null, 2)}`
}

/**
 * Build the user message for reasoning analysis.
 */
export function buildReasoningMessage(
  text: string,
  sentences: Array<{ id: string; text: string }>,
  claims: Array<{ id: string; text: string; sentenceId: string }>,
): string {
  return `Text: "${text}"\n\nSentences: ${JSON.stringify(sentences)}\n\nExtracted claims: ${JSON.stringify(claims)}`
}
