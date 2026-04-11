import type { Fallacy } from '../types/analysis'

const FALLACY_DESCRIPTIONS: Record<string, string> = {
  ad_hominem: 'Attacking the person making the argument rather than the argument itself.',
  straw_man: 'Misrepresenting someone\'s argument to make it easier to attack.',
  false_dichotomy: 'Presenting only two options when more alternatives exist.',
  slippery_slope: 'Claiming one event will inevitably lead to extreme consequences.',
  appeal_to_authority: 'Using authority figures as evidence instead of actual evidence.',
  whataboutism: 'Deflecting criticism by pointing to someone else\'s behavior.',
  circular_reasoning: 'Using the conclusion as a premise in the argument.',
  moving_goalposts: 'Changing the criteria for proof after evidence is presented.',
  cherry_picking: 'Selecting only evidence that supports a conclusion.',
  false_equivalence: 'Treating two significantly different things as equal.',
  anecdotal_evidence: 'Using personal experience as proof of a general claim.',
  burden_of_proof_reversal: 'Demanding others disprove a claim instead of proving it.',
  red_herring: 'Introducing irrelevant information to distract.',
  tu_quoque: 'Dismissing criticism because the critic has done the same.',
  hasty_generalization: 'Drawing broad conclusions from limited evidence.',
  loaded_question: 'A question that contains an unproven assumption.',
  texas_sharpshooter: 'Finding patterns in random data after the fact.',
  unsupported_causal: 'Claiming causation from correlation or sequence.',
  missing_context: 'Omitting relevant information that would change interpretation.',
  motte_and_bailey: 'Making a bold claim, then retreating to a modest one when challenged.',
}

interface FallacyCardProps {
  fallacy: Fallacy
  onClick?: () => void
}

export default function FallacyCard({ fallacy, onClick }: FallacyCardProps) {
  const severityColor = {
    minor: 'border-yellow-800/30 bg-yellow-950/20',
    moderate: 'border-orange-800/30 bg-orange-950/20',
    major: 'border-red-800/30 bg-red-950/20',
  }[fallacy.severity]

  const severityBadge = {
    minor: 'bg-yellow-500/20 text-yellow-300',
    moderate: 'bg-orange-500/20 text-orange-300',
    major: 'bg-red-500/20 text-red-300',
  }[fallacy.severity]

  return (
    <div
      className={`rounded-lg border ${severityColor} p-3 space-y-2 transition-all hover:shadow-md hover:shadow-black/20 cursor-pointer`}
      onClick={onClick}
      role="button"
      aria-label={`Fallacy: ${fallacy.name}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-200">{fallacy.name}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severityBadge}`}>
          {fallacy.severity}
        </span>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">{fallacy.explanation}</p>

      {FALLACY_DESCRIPTIONS[fallacy.type] && (
        <details className="text-[10px] text-gray-600">
          <summary className="cursor-pointer hover:text-gray-400 transition-colors">
            What is {fallacy.name}?
          </summary>
          <p className="mt-1 text-gray-500">{FALLACY_DESCRIPTIONS[fallacy.type]}</p>
        </details>
      )}
    </div>
  )
}
