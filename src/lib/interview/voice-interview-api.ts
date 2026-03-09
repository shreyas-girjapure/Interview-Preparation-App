import type { VoiceInterviewScopeType } from "@/lib/interview/voice-scope";

export type CreateVoiceInterviewSessionRequest = {
  scopeSlug: string;
  scopeType: VoiceInterviewScopeType;
};

export type VoiceInterviewBootstrapTimingsMs = {
  localSessionCreate?: number;
  markReady?: number;
  openAiBootstrap: number;
  profileSync?: number;
  total: number;
};

export type CreateVoiceInterviewSessionResponse = {
  clientSecret: {
    expiresAt: number;
    value: string;
  };
  localSession: {
    id: string;
    scopeSlug: string;
    scopeTitle: string;
    scopeType: VoiceInterviewScopeType;
  };
  realtime: {
    model: string;
    openAiSessionId: string | null;
    transcriptionModel: string;
    voice: string;
  };
  timingsMs?: VoiceInterviewBootstrapTimingsMs;
};

export type UpdateVoiceInterviewSessionRequest = {
  errorCode?: string | null;
  errorMessage?: string | null;
  state: "active" | "completed" | "failed" | "cancelled";
};
