import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";

export type VoiceInterviewStage =
  | "ready"
  | "connecting"
  | "live"
  | "completed"
  | "failed";

export type VoiceInterviewCitation = {
  label: string;
  source: string;
  href: string;
};

export type VoiceInterviewTranscriptItem = {
  id: string;
  speaker: "assistant" | "user" | "system";
  label: string;
  text: string;
  meta: string;
  tone?: "default" | "search" | "status" | "error";
  status?: "final" | "streaming";
  citations?: VoiceInterviewCitation[];
};

export type VoiceInterviewCompletionSummary = {
  summary: string;
  strengths: string;
  sharpen: string;
  nextDrill: string;
};

export type VoiceInterviewSessionSnapshot = {
  stage: VoiceInterviewStage;
  stageLabel: string;
  title: string;
  description: string;
  stateNote: string;
  stageQuote: string;
  stageSupport: string;
  micLabel: string;
  connectionLabel: string;
  elapsedLabel: string;
  transcriptCountLabel: string;
  recencyModeLabel: string;
  transcript: VoiceInterviewTranscriptItem[];
  completionSummary?: VoiceInterviewCompletionSummary;
  errorMessage?: string;
};

export const DEFAULT_STAGE_ELAPSED_SECONDS: Record<
  VoiceInterviewStage,
  number
> = {
  ready: 0,
  connecting: 8,
  live: 522,
  completed: 734,
  failed: 19,
};

const STAGE_LABELS: Record<VoiceInterviewStage, string> = {
  ready: "Ready",
  connecting: "Connecting",
  live: "Live",
  completed: "Completed",
  failed: "Failed",
};

export function isVoiceInterviewStage(
  value: string | undefined,
): value is VoiceInterviewStage {
  if (!value) {
    return false;
  }

  return value in STAGE_LABELS;
}

export function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
  const seconds = Math.max(totalSeconds, 0) % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildCitations(scope: VoiceInterviewScope): VoiceInterviewCitation[] {
  const citations: VoiceInterviewCitation[] = [
    {
      label: "Topic brief",
      source: scope.title,
      href: `/topics/${scope.slug}`,
    },
  ];

  const firstQuestion = scope.questionSummaries[0];

  if (firstQuestion) {
    citations.push({
      label: "Practice question",
      source: firstQuestion.title,
      href: `/questions/${firstQuestion.slug}`,
    });
  }

  return citations;
}

function countFinalizedTurns(transcript: VoiceInterviewTranscriptItem[]) {
  return transcript.filter((item) => item.status !== "streaming").length;
}

function getOpeningPrompt(scope: VoiceInterviewScope) {
  return (
    scope.questionMap[0] ??
    `What does ${scope.title} mean in practical terms, and why does it matter in an interview?`
  );
}

function getFollowUpPrompt(scope: VoiceInterviewScope) {
  return (
    scope.questionMap[1] ??
    `Give me one production example where ${scope.title} becomes more than a textbook definition.`
  );
}

function buildReadyTranscript(
  scope: VoiceInterviewScope,
): VoiceInterviewTranscriptItem[] {
  return [
    {
      id: "ready-system",
      speaker: "system",
      label: "Session note",
      text: "The interview shell is visible before any microphone request so the learner can review scope, expectations, and transcript treatment first.",
      meta: "Ready state",
      tone: "status",
    },
    {
      id: "ready-assistant",
      speaker: "assistant",
      label: "Interviewer preview",
      text: `When you start, I will open with "${getOpeningPrompt(scope)}" and keep the discussion inside ${scope.title}.`,
      meta: "Preview only",
    },
  ];
}

function buildConnectingTranscript(
  scope: VoiceInterviewScope,
): VoiceInterviewTranscriptItem[] {
  return [
    {
      id: "connecting-system-1",
      speaker: "system",
      label: "Browser",
      text: `Microphone permission accepted. Starting secure session bootstrap for the ${scope.scopeLabel.toLowerCase()} on ${scope.title}.`,
      meta: "00:02",
      tone: "status",
    },
    {
      id: "connecting-system-2",
      speaker: "system",
      label: "Session",
      text: "Preparing the browser voice session through the local adapter. The transcript stays open so setup never feels like a blank screen.",
      meta: "00:07",
      tone: "status",
    },
  ];
}

function buildLiveTranscript(
  scope: VoiceInterviewScope,
): VoiceInterviewTranscriptItem[] {
  return [
    {
      id: "live-assistant-1",
      speaker: "assistant",
      label: "Interviewer",
      text: `We are staying inside ${scope.title} today. Start simple: ${getOpeningPrompt(scope)}`,
      meta: "00:04",
    },
    {
      id: "live-user-1",
      speaker: "user",
      label: "You",
      text: `I would explain ${scope.title} in plain language first, then anchor it in a concrete example so the answer is useful instead of abstract.`,
      meta: "00:17",
    },
    {
      id: "live-assistant-2",
      speaker: "assistant",
      label: "Interviewer",
      text: `Good baseline. Now make it practical: ${getFollowUpPrompt(scope)}`,
      meta: "00:26",
    },
    {
      id: "live-user-2",
      speaker: "user",
      label: "You",
      text: "I would point to one real bug, design tradeoff, or debugging story so the explanation shows judgment rather than recall.",
      meta: "00:42",
    },
    {
      id: "live-assistant-search",
      speaker: "assistant",
      label: "Interviewer",
      text: "If you ask for recent changes, the answer stays inside the active scope and keeps visible citations attached in this transcript panel.",
      meta: "Scoped citations",
      tone: "search",
      citations: buildCitations(scope),
    },
    {
      id: "live-assistant-stream",
      speaker: "assistant",
      label: "Interviewer",
      text: "Now tighten that answer into thirty seconds and connect it to the tradeoffs that matter most in production.",
      meta: "Streaming delta",
      status: "streaming",
    },
  ];
}

function buildCompletedTranscript(
  scope: VoiceInterviewScope,
): VoiceInterviewTranscriptItem[] {
  return [
    {
      id: "completed-assistant-1",
      speaker: "assistant",
      label: "Interviewer",
      text: `Your strongest moment was when you tied ${scope.title} to a concrete example instead of staying purely theoretical.`,
      meta: "11:31",
    },
    {
      id: "completed-user-1",
      speaker: "user",
      label: "You",
      text: "The weaker part was compressing the tradeoff answer. I knew the idea, but I took too long to make it sharp.",
      meta: "11:52",
    },
    {
      id: "completed-assistant-2",
      speaker: "assistant",
      label: "Interviewer",
      text: `That is the right area to sharpen next. Practice one compact contrast that shows when ${scope.title} helps and where it introduces risk or cost.`,
      meta: "12:08",
    },
    {
      id: "completed-assistant-search",
      speaker: "assistant",
      label: "Interviewer",
      text: "The citation row stayed visible during the session, which is the behavior we want before the real search tool is wired in.",
      meta: "Completion note",
      tone: "search",
      citations: buildCitations(scope).slice(0, 1),
    },
  ];
}

function buildFailedTranscript(
  scope: VoiceInterviewScope,
): VoiceInterviewTranscriptItem[] {
  return [
    {
      id: "failed-system-1",
      speaker: "system",
      label: "Session error",
      text: `The secure interview session for ${scope.title} could not be created in time. No live voice session was opened, and the microphone was released immediately.`,
      meta: "00:19",
      tone: "error",
    },
    {
      id: "failed-assistant-1",
      speaker: "assistant",
      label: "Recovery hint",
      text: `Retry the same ${scope.scopeLabel.toLowerCase()}, or return to the topic page if you want to review ${scope.title} before starting again.`,
      meta: "Recovery path",
    },
  ];
}

export function buildVoiceInterviewSessionSnapshot({
  scope,
  stage,
  elapsedSeconds,
  isMuted,
}: {
  scope: VoiceInterviewScope;
  stage: VoiceInterviewStage;
  elapsedSeconds: number;
  isMuted: boolean;
}): VoiceInterviewSessionSnapshot {
  const liveTranscript = buildLiveTranscript(scope);
  const completedTranscript = buildCompletedTranscript(scope);

  const transcript =
    stage === "ready"
      ? buildReadyTranscript(scope)
      : stage === "connecting"
        ? buildConnectingTranscript(scope)
        : stage === "live"
          ? liveTranscript
          : stage === "completed"
            ? completedTranscript
            : buildFailedTranscript(scope);

  return {
    stage,
    stageLabel: STAGE_LABELS[stage],
    title:
      stage === "ready"
        ? "The route is staged, but nothing starts until the learner does."
        : stage === "connecting"
          ? "The browser is asking for mic access and creating the scoped session."
          : stage === "live"
            ? "The coach is speaking, the transcript is readable, and the session stays on scope."
            : stage === "completed"
              ? "The interview is over, and the learner gets a short wrap-up."
              : "Setup failed, but the route still explains what happened and how to recover.",
    description:
      stage === "ready"
        ? `This state keeps ${scope.title} visible before microphone access or browser session setup begins.`
        : stage === "connecting"
          ? "This is the short-lived connection phase for permission, secure bootstrap, and adapter setup."
          : stage === "live"
            ? "The live shell keeps the voice stage central while the transcript and controls remain readable."
            : stage === "completed"
              ? "Completion keeps the shell intact so review and persistence can plug into the same structure later."
              : "Failure preserves context, explains the problem, and keeps a retry path visible.",
    stateNote:
      stage === "ready"
        ? "Ready to begin."
        : stage === "connecting"
          ? "Connection copy reassures the learner without exposing transport details."
          : stage === "live"
            ? "Transcript and controls stay readable under streaming updates."
            : stage === "completed"
              ? "Completion should feel calm and actionable, not like a scoring dashboard."
              : "Failure copy stays short, specific, and recoverable.",
    stageQuote:
      stage === "ready"
        ? `Start when you are ready. We will stay inside ${scope.title}.`
        : stage === "connecting"
          ? `Securing microphone access and preparing the interviewer for ${scope.title}.`
          : stage === "live"
            ? "Make it practical, not theoretical."
            : stage === "completed"
              ? `You were strongest when you made ${scope.title} concrete.`
              : "The interview did not start, but your topic context is still intact.",
    stageSupport:
      stage === "ready"
        ? "This is the calm waiting state before any live transport or audio work begins."
        : stage === "connecting"
          ? "The route should feel alive during setup, but not noisy or technical."
          : stage === "live"
            ? "The transcript and scope context remain visible so the UI never collapses into an orb-only view."
            : stage === "completed"
              ? "This is where the experience pivots from live coaching into review."
              : "Reliability problems are easier to reason about when the failure layout preserves all relevant context.",
    micLabel:
      stage === "ready"
        ? "Idle until start"
        : stage === "connecting"
          ? "Permission granted"
          : stage === "live"
            ? isMuted
              ? "Live and muted"
              : "Live and unmuted"
            : stage === "completed"
              ? "Released"
              : "Released after failure",
    connectionLabel:
      stage === "ready"
        ? "No session requested"
        : stage === "connecting"
          ? "Creating scoped browser session"
          : stage === "live"
            ? "Local adapter healthy"
            : stage === "completed"
              ? "Session closed cleanly"
              : "Bootstrap timed out",
    elapsedLabel:
      stage === "ready" ? "Not started" : formatElapsedTime(elapsedSeconds),
    transcriptCountLabel:
      stage === "connecting"
        ? "Handshake in progress"
        : stage === "failed"
          ? "No interview turns saved"
          : `${countFinalizedTurns(transcript)} finalized turns`,
    recencyModeLabel:
      stage === "ready"
        ? "Scoped citations armed, inactive"
        : stage === "connecting"
          ? "Scope locked before connect"
          : stage === "live"
            ? `${buildCitations(scope).length} visible citations`
            : stage === "completed"
              ? "Citation treatment preserved"
              : "Search stayed off",
    transcript,
    completionSummary:
      stage === "completed"
        ? {
            summary: `Accurate and practical, especially when you tied ${scope.title} to one believable real-world example.`,
            strengths:
              "You stayed on scope, answered directly, and used examples instead of drifting into generic interview advice.",
            sharpen:
              "Tighten the tradeoff answer and make your strongest comparison in one shorter pass.",
            nextDrill: `Run a timed round on ${scope.title} with one scoped recency prompt at the end.`,
          }
        : undefined,
    errorMessage:
      stage === "failed"
        ? `We could not finish interview setup for ${scope.title}. Retry the same topic scope or return to the topic page without losing context.`
        : undefined,
  };
}
