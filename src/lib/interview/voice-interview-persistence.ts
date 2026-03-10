import type {
  VoiceInterviewPersistedTranscriptCitation,
  VoiceInterviewPersistedTranscriptItem,
} from "@/lib/interview/voice-interview-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type InterviewMessageRow = {
  citations_json: VoiceInterviewPersistedTranscriptCitation[] | null;
  client_sequence: number;
  content_text: string;
  created_at: string;
  finalized_at: string;
  id: string;
  item_id: string;
  label: string;
  meta_label: string;
  previous_item_id: string | null;
  session_id: string;
  source: "realtime" | "system" | "search";
  speaker: "assistant" | "user" | "system";
  tone: "default" | "search" | "status" | "error" | null;
  updated_at: string;
};

function normalizeCitation(
  citation: VoiceInterviewPersistedTranscriptCitation,
): VoiceInterviewPersistedTranscriptCitation | null {
  const source = citation.source.trim();
  const url = citation.url.trim();

  if (!source || !url) {
    return null;
  }

  return {
    confidence:
      typeof citation.confidence === "number" ? citation.confidence : undefined,
    label: citation.label?.trim() || undefined,
    publishedAt: citation.publishedAt ?? undefined,
    snippet: citation.snippet?.trim() || undefined,
    source,
    title: citation.title?.trim() || undefined,
    url,
  };
}

function normalizeCitations(
  citations: VoiceInterviewPersistedTranscriptCitation[] | undefined,
) {
  if (!citations || citations.length === 0) {
    return null;
  }

  const normalized = citations
    .map(normalizeCitation)
    .filter((citation): citation is VoiceInterviewPersistedTranscriptCitation =>
      Boolean(citation),
    );

  return normalized.length > 0 ? normalized : null;
}

function normalizeFinalizedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizePersistedTranscriptItem(
  item: VoiceInterviewPersistedTranscriptItem,
): VoiceInterviewPersistedTranscriptItem | null {
  const itemId = item.itemId.trim();
  const label = item.label.trim();
  const metaLabel = item.metaLabel.trim();
  const text = item.text.trim();

  if (!itemId || !label || !metaLabel || !text) {
    return null;
  }

  return {
    ...item,
    citations: normalizeCitations(item.citations) ?? undefined,
    clientSequence: Math.max(0, Math.floor(item.clientSequence)),
    finalizedAt: normalizeFinalizedAt(item.finalizedAt),
    itemId,
    label,
    metaLabel,
    previousItemId: item.previousItemId ?? null,
    text,
  };
}

export function dedupePersistedTranscriptItems(
  finalizedItems: VoiceInterviewPersistedTranscriptItem[],
) {
  const byItemId = new Map<string, VoiceInterviewPersistedTranscriptItem>();

  for (const item of finalizedItems) {
    const normalized = normalizePersistedTranscriptItem(item);

    if (!normalized) {
      continue;
    }

    byItemId.set(normalized.itemId, normalized);
  }

  return [...byItemId.values()].sort(
    (left, right) => left.clientSequence - right.clientSequence,
  );
}

export async function upsertInterviewMessages({
  finalizedItems,
  sessionId,
  supabase,
}: {
  finalizedItems: VoiceInterviewPersistedTranscriptItem[];
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const dedupedItems = dedupePersistedTranscriptItems(finalizedItems);

  if (dedupedItems.length === 0) {
    return 0;
  }

  const rows = dedupedItems.map((item) => ({
    citations_json: item.citations ?? null,
    client_sequence: item.clientSequence,
    content_text: item.text,
    finalized_at: item.finalizedAt,
    item_id: item.itemId,
    label: item.label,
    meta_label: item.metaLabel,
    previous_item_id: item.previousItemId ?? null,
    session_id: sessionId,
    source: item.source,
    speaker: item.speaker,
    tone: item.tone ?? null,
  }));

  const { error } = await supabase.from("interview_messages").upsert(rows, {
    onConflict: "session_id,item_id",
  });

  if (error) {
    throw new Error(
      `Unable to persist interview transcript rows: ${error.message}`,
    );
  }

  return dedupedItems.length;
}

export async function getInterviewMessageCounts({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const [allRows, turnRows] = await Promise.all([
    supabase
      .from("interview_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("session_id", sessionId),
    supabase
      .from("interview_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("session_id", sessionId)
      .neq("speaker", "system"),
  ]);

  if (allRows.error) {
    throw new Error(
      `Unable to count persisted interview messages: ${allRows.error.message}`,
    );
  }

  if (turnRows.error) {
    throw new Error(
      `Unable to count persisted interview turns: ${turnRows.error.message}`,
    );
  }

  return {
    persistedMessageCount: allRows.count ?? 0,
    persistedTurnCount: turnRows.count ?? 0,
  };
}

export async function listInterviewMessages({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const { data, error } = await supabase
    .from("interview_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("client_sequence", { ascending: true })
    .order("updated_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Unable to read interview transcript rows: ${error.message}`,
    );
  }

  return (data ?? []) as InterviewMessageRow[];
}
