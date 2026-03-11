import type { RealtimeItem } from "@openai/agents/realtime";

import type { VoiceInterviewPersistedTranscriptItem } from "@/lib/interview/voice-interview-api";
import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";
import {
  buildVoiceInterviewSessionSnapshot,
  type VoiceInterviewCitation,
  type VoiceInterviewCompletionSummary,
  type VoiceInterviewSessionSnapshot,
  type VoiceInterviewStage,
  type VoiceInterviewTranscriptItem,
} from "@/lib/interview/voice-interview-session";

export function buildVoiceInterviewScopedCitations(
  scope: VoiceInterviewScope,
): VoiceInterviewCitation[] {
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

export function buildVoiceInterviewSystemTranscriptItem({
  citations,
  id,
  label = "Session",
  meta,
  text,
  tone = "status",
}: {
  citations?: VoiceInterviewCitation[];
  id: string;
  label?: string;
  meta: string;
  text: string;
  tone?: "status" | "error" | "search";
}): VoiceInterviewTranscriptItem {
  return {
    citations,
    id,
    label,
    meta,
    source: tone === "search" ? "search" : "system",
    speaker: "system",
    text,
    tone,
  };
}

export function buildVoiceInterviewUserTranscriptItem({
  id,
  meta,
  status = "final",
  text,
}: {
  id: string;
  meta: string;
  status?: "final" | "streaming";
  text: string;
}): VoiceInterviewTranscriptItem | null {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return null;
  }

  return {
    id,
    label: "You",
    meta,
    source: "realtime",
    speaker: "user",
    status,
    text: normalizedText,
  };
}

export function mapPersistedTranscriptItemToRuntimeItem(
  item: VoiceInterviewPersistedTranscriptItem,
): VoiceInterviewTranscriptItem {
  return {
    citations: item.citations?.map((citation) => ({
      href: citation.url,
      label: citation.label ?? citation.title ?? citation.source,
      source: citation.source,
    })),
    id: item.itemId,
    label: item.label,
    meta: item.metaLabel,
    source: item.source,
    speaker: item.speaker,
    text: item.text,
    tone: item.tone,
  };
}

function getMessageText(item: RealtimeItem, assistantDelta?: string) {
  if (item.type !== "message") {
    return "";
  }

  if (item.role === "system") {
    return item.content
      .filter((content) => content.type === "input_text")
      .map((content) => content.text.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  if (item.role === "user") {
    return item.content
      .map((content) => {
        if (content.type === "input_text") {
          return content.text.trim();
        }

        if (content.type === "input_audio") {
          return content.transcript?.trim() ?? "";
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return (
    item.content
      .map((content) => {
        if (content.type === "output_text") {
          return content.text.trim();
        }

        if (content.type === "output_audio") {
          return content.transcript?.trim() ?? "";
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n") ||
    assistantDelta?.trim() ||
    ""
  );
}

export function mapRealtimeItemToTranscriptItem({
  assistantDelta,
  item,
  meta,
}: {
  assistantDelta?: string;
  item: RealtimeItem;
  meta: string;
}): VoiceInterviewTranscriptItem | null {
  if (item.type !== "message") {
    return null;
  }

  const text = getMessageText(item, assistantDelta);

  if (!text) {
    return null;
  }

  return {
    id: item.itemId,
    label:
      item.role === "assistant"
        ? "Interviewer"
        : item.role === "user"
          ? "You"
          : "Session",
    meta,
    source: item.role === "system" ? "system" : "realtime",
    speaker: item.role,
    status:
      item.role !== "system" && item.status === "in_progress"
        ? "streaming"
        : "final",
    text,
  };
}

export function upsertVoiceInterviewTranscriptItem(
  transcript: VoiceInterviewTranscriptItem[],
  item: VoiceInterviewTranscriptItem,
  previousItemId?: string | null,
) {
  const existingIndex = transcript.findIndex((entry) => entry.id === item.id);

  if (existingIndex >= 0 && !previousItemId) {
    const nextTranscript = [...transcript];
    nextTranscript[existingIndex] = item;
    return nextTranscript;
  }

  const baseTranscript =
    existingIndex >= 0
      ? transcript.filter((entry) => entry.id !== item.id)
      : transcript;

  if (previousItemId) {
    const previousIndex = baseTranscript.findIndex(
      (entry) => entry.id === previousItemId,
    );

    if (previousIndex >= 0) {
      return [
        ...baseTranscript.slice(0, previousIndex + 1),
        item,
        ...baseTranscript.slice(previousIndex + 1),
      ];
    }
  }

  if (existingIndex >= 0) {
    return [
      ...baseTranscript.slice(0, existingIndex),
      item,
      ...baseTranscript.slice(existingIndex),
    ];
  }

  return [...baseTranscript, item];
}

export function removeVoiceInterviewTranscriptItem(
  transcript: VoiceInterviewTranscriptItem[],
  itemId: string,
) {
  return transcript.filter((item) => item.id !== itemId);
}

function countFinalizedTurns(transcript: VoiceInterviewTranscriptItem[]) {
  return transcript.filter(
    (item) => item.speaker !== "system" && item.status !== "streaming",
  ).length;
}

const LIVE_RECENCY_LABEL =
  "Topic scope is locked. Recent-changes browsing remains disabled in live mode.";

export function buildVoiceInterviewRuntimeSnapshot({
  completionSummary,
  connectionLabel,
  elapsedSeconds,
  errorMessage,
  isMuted,
  micLabel,
  scope,
  stage,
  transcript,
}: {
  completionSummary?: VoiceInterviewCompletionSummary;
  connectionLabel?: string;
  elapsedSeconds: number;
  errorMessage?: string;
  isMuted: boolean;
  micLabel?: string;
  scope: VoiceInterviewScope;
  stage: VoiceInterviewStage;
  transcript?: VoiceInterviewTranscriptItem[];
}): VoiceInterviewSessionSnapshot {
  const base = buildVoiceInterviewSessionSnapshot({
    elapsedSeconds,
    isMuted,
    scope,
    stage,
  });
  const resolvedTranscript =
    transcript && transcript.length > 0 ? transcript : base.transcript;
  const finalizedTurns = countFinalizedTurns(resolvedTranscript);

  return {
    ...base,
    completionSummary:
      stage === "completed"
        ? (completionSummary ?? base.completionSummary)
        : undefined,
    connectionLabel:
      connectionLabel ??
      (stage === "connecting"
        ? "Preparing interview session"
        : stage === "live"
          ? "Interview session connected"
          : stage === "failed"
            ? "Interview session failed"
            : base.connectionLabel),
    description:
      stage === "connecting"
        ? "This is the short-lived phase for microphone access, secure bootstrap, and the selected runtime connection."
        : stage === "live"
          ? "The live shell keeps the voice stage central while the transcript and controls remain readable."
          : base.description,
    errorMessage:
      stage === "failed" ? (errorMessage ?? base.errorMessage) : undefined,
    micLabel:
      micLabel ??
      (stage === "connecting" ? "Requesting permission" : base.micLabel),
    recencyModeLabel:
      stage === "ready"
        ? "Topic scope armed, browsing disabled"
        : LIVE_RECENCY_LABEL,
    title:
      stage === "connecting"
        ? "The browser is requesting microphone access and opening the interview session."
        : base.title,
    transcript: resolvedTranscript,
    transcriptCountLabel:
      stage === "connecting"
        ? "Handshake in progress"
        : stage === "failed"
          ? finalizedTurns > 0
            ? `${finalizedTurns} finalized turns before disconnect`
            : "No interview turns saved"
          : `${finalizedTurns} finalized turns`,
  };
}
