import type {
  CompleteInterviewSessionMetrics,
  PersistedVoiceInterviewDebrief,
  VoiceInterviewPersistedTranscriptItem,
} from "@/lib/interview/voice-interview-api";

function compactSentence(text: string, fallback: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return fallback;
  }

  if (cleaned.length <= 180) {
    return cleaned;
  }

  return `${cleaned.slice(0, 177)}...`;
}

function pickLongestTurn(
  items: VoiceInterviewPersistedTranscriptItem[],
  speaker: "assistant" | "user",
) {
  const turns = items.filter((item) => item.speaker === speaker);

  if (turns.length === 0) {
    return null;
  }

  return turns.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest,
  );
}

export function buildVoiceInterviewDebrief({
  metrics,
  scopeTitle,
  transcript,
}: {
  metrics: CompleteInterviewSessionMetrics;
  scopeTitle: string;
  transcript: VoiceInterviewPersistedTranscriptItem[];
}): PersistedVoiceInterviewDebrief {
  const userTurn = pickLongestTurn(transcript, "user");
  const assistantTurn = pickLongestTurn(transcript, "assistant");

  const summary =
    userTurn || assistantTurn
      ? compactSentence(
          userTurn?.text ?? assistantTurn?.text ?? "",
          `You completed a focused interview round on ${scopeTitle}.`,
        )
      : `You completed a focused interview round on ${scopeTitle}.`;

  const strengths = userTurn
    ? `Your strongest contribution was this concrete response: "${compactSentence(
        userTurn.text,
        "You stayed on scope and answered directly.",
      )}".`
    : "You stayed in the interview flow and completed the scoped session.";

  const sharpen =
    metrics.userTurnCount <= 1
      ? "Add one more concise follow-up answer next round so your reasoning depth is easier to evaluate."
      : "Tighten one answer into a shorter, higher-signal contrast of tradeoffs and failure modes.";

  const nextDrill = `Run one more timed round on ${scopeTitle} and target ${Math.max(
    metrics.userTurnCount + 1,
    3,
  )} concise user turns with explicit production examples.`;

  const confidenceNotes = `Session metrics: ${metrics.elapsedSeconds}s elapsed, ${metrics.finalizedTurnCount} finalized turns, ${metrics.searchTurnCount} search-backed turns.`;

  return {
    confidenceNotes,
    nextDrill,
    sharpen,
    strengths,
    summary,
  };
}
