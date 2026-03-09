import type { User } from "@supabase/supabase-js";

import type { VoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type InterviewSessionRow = {
  id: string;
  user_id: string;
  scope_type: VoiceInterviewScope["scopeType"];
  scope_slug: string;
  scope_title: string;
  scope_snapshot: VoiceInterviewScope;
  state:
    | "bootstrapping"
    | "ready"
    | "active"
    | "completed"
    | "failed"
    | "cancelled";
  openai_session_id: string | null;
  openai_model: string | null;
  openai_voice: string | null;
  openai_transcription_model: string | null;
  openai_client_secret_expires_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

function getUserProfileSeed(user: User) {
  const metadata = user.user_metadata as
    | {
        name?: string;
        full_name?: string;
        picture?: string;
        avatar_url?: string;
      }
    | undefined;

  return {
    avatarUrl: metadata?.avatar_url ?? metadata?.picture ?? null,
    fullName: metadata?.full_name ?? metadata?.name ?? null,
  };
}

export async function ensureInterviewSessionUserProfile(
  supabase: SupabaseServerClient,
  user: User,
) {
  const profileSeed = getUserProfileSeed(user);

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: profileSeed.fullName,
      avatar_url: profileSeed.avatarUrl,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(
      `Unable to sync profile before creating the interview session: ${error.message}`,
    );
  }
}

export async function createInterviewSessionRecord({
  scope,
  supabase,
  userId,
}: {
  scope: VoiceInterviewScope;
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: userId,
      scope_type: scope.scopeType,
      scope_slug: scope.slug,
      scope_title: scope.title,
      scope_snapshot: scope,
      state: "bootstrapping",
    })
    .select("*")
    .single<InterviewSessionRow>();

  if (error || !data) {
    throw new Error(
      `Unable to create the interview session record: ${error?.message ?? "Unknown error"}`,
    );
  }

  return data;
}

export async function markInterviewSessionReady({
  clientSecretExpiresAt,
  model,
  openAiSessionId,
  sessionId,
  supabase,
  transcriptionModel,
  voice,
}: {
  clientSecretExpiresAt: string;
  model: string;
  openAiSessionId: string | null;
  sessionId: string;
  supabase: SupabaseServerClient;
  transcriptionModel: string;
  voice: string;
}) {
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      state: "ready",
      openai_session_id: openAiSessionId,
      openai_model: model,
      openai_voice: voice,
      openai_transcription_model: transcriptionModel,
      openai_client_secret_expires_at: clientSecretExpiresAt,
      started_at: new Date().toISOString(),
      ended_at: null,
      last_error_code: null,
      last_error_message: null,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to update the interview session record: ${error.message}`,
    );
  }
}

export async function markInterviewSessionFailed({
  errorCode,
  errorMessage,
  sessionId,
  supabase,
}: {
  errorCode: string;
  errorMessage: string;
  sessionId: string;
  supabase: SupabaseServerClient;
}) {
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      state: "failed",
      last_error_code: errorCode,
      last_error_message: errorMessage,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to mark the interview session as failed: ${error.message}`,
    );
  }
}

export async function updateInterviewSessionState({
  errorCode,
  errorMessage,
  sessionId,
  state,
  supabase,
}: {
  errorCode?: string | null;
  errorMessage?: string | null;
  sessionId: string;
  state: "active" | "completed" | "failed" | "cancelled";
  supabase: SupabaseServerClient;
}) {
  const { error } = await supabase
    .from("interview_sessions")
    .update({
      state,
      last_error_code: errorCode ?? null,
      last_error_message: errorMessage ?? null,
      ended_at: state === "active" ? null : new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Unable to update the interview session state: ${error.message}`,
    );
  }
}
