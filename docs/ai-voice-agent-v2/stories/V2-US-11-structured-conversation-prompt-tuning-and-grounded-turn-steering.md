# V2-US-11: Structured Conversation Prompt Tuning and Grounded Turn Steering

## Story

As a learner, I want the AI voice interviewer to run a more structured but
flexible conversation that understands the shape of my answer, uses grounding
data, and chooses the right next probe so the interview feels like a real
interviewer instead of a script waiting for one narrow response pattern.

## Status

- `Status`: Ready for implementation; net-new conversation-quality work (as of 2026-03-12)
- `Why this exists`: the current interviewer prompt is compact and guardrailed,
  but it can still overfit to one expected answer shape, miss partially
  correct responses, and ask awkward follow-ups when the learner answers
  indirectly, asks for clarification, or gives a valid alternative framing.
- `Current baseline`: scope snapshots, question maps, transcript persistence,
  citation rendering, and prompt-version tracking already exist, but the live
  runtime still depends on one mostly static interviewer prompt with very
  little server-owned per-turn conversation state.
- `Current implementation approach`: add a server-owned turn-brief and
  answer-interpretation layer that combines scope grounding, recent transcript
  state, and optional documentation grounding before each assistant turn.
- `Priority note`: this story is intentionally paired with `V2-US-08` and
  `V2-US-10`. The first implementation target should be the chained runtime so
  text generation is explicit and easier to steer.
- `Handoff note`: this is conversation-quality and prompt-policy work, not raw
  audio-quality work. Keep it separate from the Realtime hardening follow-up in
  `V2-US-07`.

### Implemented now (2026-03-12)

- `buildVoiceInterviewPrompt` already establishes the interviewer persona,
  one-question-at-a-time structure, scope guardrails, and some behavior
  examples for weak, off-topic, and rambling answers.
- The resolved scope snapshot already carries useful grounding fields such as
  `summary`, `expectations`, `questionMap`, `evaluationDimensions`, and
  `stayInScope`.
- Transcript persistence, session detail reads, and citation rendering already
  provide the app with the recent turn history and evidence surfaces needed for
  grounded follow-ups.
- Runtime telemetry already tracks prompt version metadata, which can be
  extended for conversation-policy or turn-brief versioning.

### Still pending

- No explicit `conversation state` model exists yet for interview phase,
  current target question, answer quality, or next follow-up goal.
- No turn-level answer-interpretation step exists to distinguish direct,
  partial, clarifying, uncertain, off-topic, rambling, or alternative-valid
  learner responses.
- No structured turn brief exists that combines active scope, transcript
  digest, evaluation target, and optional grounded evidence before generation.
- The current prompt does not explicitly teach the interviewer how to handle
  partially correct answers, valid alternate framings, or clarification
  requests without sounding rigid.
- No prompt regression harness exists yet for conversation-shape quality across
  varied answer styles.
- No structured turn-move telemetry exists yet for actions such as `open`,
  `clarify`, `deepen`, `correct`, `redirect`, or `wrap`.

## Acceptance Criteria

1. The voice interviewer uses a server-owned grounded turn brief before each
   assistant turn instead of relying only on one static prompt.
2. The turn brief can include:
   active scope summary, current interview phase, target question or concept,
   recent transcript digest, learner answer interpretation, and any supporting
   citations or snippets from documentation grounding when available.
3. The interviewer correctly distinguishes between at least these learner
   response shapes:
   direct answer, partially correct answer, clarifying question, explicit
   uncertainty, off-topic drift, and rambling answer.
4. Partially correct or alternate-valid answers are not treated as fully wrong
   by default. The interviewer acknowledges what is correct, names the missing
   point, and then asks one sharper follow-up.
5. When the learner asks for clarification, the interviewer briefly reframes
   the question or narrows the target instead of repeating the same demand.
6. The interviewer stays structured:
   one active question at a time, one primary follow-up move at a time, and a
   clear progression through open, probe, clarify or correct, and wrap-up
   phases.
7. When grounding data from `V2-US-10` exists, follow-ups and corrections use
   that evidence. When grounding is unavailable, the interviewer falls back to
   scope-owned expectations and question maps instead of hallucinating.
8. Prompt policy and turn-brief templates remain server-owned and versioned so
   regressions can be traced without storing hidden reasoning or chain-of-
   thought.
9. The first shipping path works with `chained_voice` from `V2-US-08`, and the
   design remains adaptable to the `realtime_sts` lane later.
10. Automated tests cover varied answer styles and confirm the interviewer no
    longer collapses too aggressively into one narrow expected response
    template.

## Low-Level Solution Design

### Conversation State Model

- Introduce a server-owned conversation-state shape such as:
  `interviewPhase`, `currentQuestionId`, `currentQuestionText`,
  `lastUserTurnDigest`, `answerInterpretation`, `followUpGoal`, and
  `groundingMode`.
- Keep the state lightweight and supportable. It should guide the next turn,
  not become a hidden planner with opaque internal reasoning.
- Persist only the metadata needed for support or regression analysis, such as
  prompt version, turn-brief version, chosen turn move, and whether grounding
  was used.

### Answer Interpretation Layer

- Add a bounded interpretation pass before the final interviewer turn.
- The output should be structured and concise, for example:
  `responseShape`, `coveredPoints`, `missingPoints`, `needsClarification`,
  `shouldRedirect`, and `recommendedMove`.
- Start with schema-constrained model output or deterministic heuristics. Avoid
  free-form hidden analysis blobs.
- The interpretation step should recognize that an answer can be incomplete but
  still directionally correct.

### Grounded Turn Brief

- Compose a per-turn brief from:
  - resolved scope snapshot
  - selected question or concept focus
  - recent transcript digest
  - answer-interpretation result
  - optional documentation citations or snippets from `V2-US-10`
- Keep the brief dense and bounded so it improves steering without inflating
  latency or token cost.
- The brief should tell the interviewer what move to make next, not just dump
  more raw context.

### Prompt Architecture

- Split prompt construction into:
  - stable interviewer policy
  - dynamic turn brief
  - bounded behavior examples
- Expand behavior examples to cover:
  - partially correct answer
  - valid alternative framing
  - clarification request
  - uncertainty or "I am not sure"
  - concise redirect after drift
- Keep spoken output natural. The model should not read rubric labels or
  internal move names aloud.

### Runtime Integration

- First target `src/lib/ai/voice-runtimes/chained-voice.ts` from `V2-US-08`
  because the text-generation step is explicit there.
- Feed the finalized transcript from STT into the answer-interpretation step,
  then compose the grounded turn brief, then generate the assistant text, then
  synthesize audio.
- Keep the runtime contract compatible with Realtime so the same conversation
  policy can later inform `realtime_sts` prompt shaping.

### Observability and Regression Safety

- Extend session or turn telemetry with fields such as:
  `conversationPolicyVersion`, `turnBriefVersion`, `turnMove`,
  `answerResponseShape`, and `groundingMode`.
- Do not log raw hidden prompts, chain-of-thought, or excessive transcript
  content.
- Add prompt-quality tests that exercise multiple user answer styles for the
  same question and assert the selected next move stays reasonable.

### Implementation Targets

- `src/lib/interview/voice-interview-prompt.ts`
- `src/lib/interview/voice-interview-conversation-state.ts`
- `src/lib/interview/voice-interview-turn-brief.ts`
- `src/lib/interview/voice-interview-grounding.ts`
- `src/lib/ai/voice-runtimes/chained-voice.ts`
- `src/lib/interview/voice-interview-runtime.ts`
- `src/lib/interview/voice-interview-observability.ts`
- `src/lib/interview/voice-interview-prompt.test.ts`
- `src/lib/interview/voice-interview-runtime.test.ts`

## Best Practices

- Tune for flexible interpretation, not for a single canonical answer key.
- Ground each turn with the smallest useful evidence set instead of dumping raw
  search results or full transcript history into the prompt.
- Separate answer interpretation from final spoken phrasing so the interviewer
  stays natural and concise.
- Version prompt policy and turn-brief logic independently so regressions are
  diagnosable.
- Do not expose internal turn-move labels, rubric terms, or chain-of-thought
  to the learner.

## Required Testing

- Prompt tests cover direct, partial, clarifying, uncertain, rambling, and
  off-topic learner responses.
- The turn-brief builder remains bounded and deterministic for the same input
  transcript and grounding packet.
- When grounded citations are present, the generated follow-up or correction is
  aligned with the evidence instead of generic fallback language.
- The chained runtime can execute interpretation -> brief assembly -> final
  response generation without breaking transcript persistence or TTS playback.
- Telemetry records turn-move metadata and version identifiers without storing
  hidden reasoning.

## Dependencies

- First shipping target depends on the explicit text-generation lane from
  `V2-US-08`.
- Strongly benefits from `V2-US-10`, which supplies higher-signal grounding
  data for corrections and follow-ups.
- Reuses transcript persistence from `V2-US-03`.
- Reuses session policy and runtime versioning patterns from `V2-US-04`.
- Reuses observability patterns from `V2-US-05`.
- Can later be backported to the `realtime_sts` lane after the deferred
  follow-up work in `V2-US-07`.
