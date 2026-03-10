import { NextResponse } from "next/server";
import { z } from "zod";

import type { CancelInterviewSessionRequest } from "@/lib/interview/voice-interview-api";
import {
  cancelInterviewSession,
  InterviewSessionNotFoundError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const transcriptCitationSchema = z
  .object({
    confidence: z.number().nullable().optional(),
    label: z.string().trim().min(1).optional(),
    publishedAt: z.string().datetime().nullable().optional(),
    snippet: z.string().trim().min(1).nullable().optional(),
    source: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    url: z.string().trim().min(1),
  })
  .strict();

const persistedTranscriptItemSchema = z
  .object({
    citations: z.array(transcriptCitationSchema).optional(),
    clientSequence: z.number().int().min(0),
    finalizedAt: z.string().datetime(),
    itemId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    metaLabel: z.string().trim().min(1),
    previousItemId: z.string().trim().min(1).nullable().optional(),
    source: z.enum(["realtime", "system", "search"]),
    speaker: z.enum(["assistant", "user", "system"]),
    text: z.string().trim().min(1),
    tone: z.enum(["default", "search", "status", "error"]).optional(),
  })
  .strict();

const cancelInterviewSessionSchema = z
  .object({
    finalizedItems: z.array(persistedTranscriptItemSchema).optional(),
    reason: z.enum(["user_exit", "page_unload", "retry", "setup_abort"]),
  })
  .strict() satisfies z.ZodType<CancelInterviewSessionRequest>;

type Params = Promise<{
  sessionId: string;
}>;

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: {
    params: Params;
  },
) {
  let payload: z.infer<typeof cancelInterviewSessionSchema>;

  try {
    payload = cancelInterviewSessionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid cancel interview session payload." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;

  try {
    const result = await cancelInterviewSession({
      finalizedItems: payload.finalizedItems,
      reason: payload.reason,
      sessionId,
      supabase,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof InterviewSessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel interview session.",
      },
      { status: 500 },
    );
  }
}
