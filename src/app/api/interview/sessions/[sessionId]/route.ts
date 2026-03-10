import { NextResponse } from "next/server";
import { z } from "zod";

import type { UpdateVoiceInterviewSessionRequest } from "@/lib/interview/voice-interview-api";
import {
  getInterviewSessionDetail,
  InterviewSessionNotFoundError,
  updateInterviewSessionState,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateInterviewSessionSchema = z
  .object({
    errorCode: z.string().trim().min(1).nullable().optional(),
    errorMessage: z.string().trim().min(1).nullable().optional(),
    state: z.enum(["active", "completed", "failed", "cancelled"]),
  })
  .strict() satisfies z.ZodType<UpdateVoiceInterviewSessionRequest>;

type Params = Promise<{
  sessionId: string;
}>;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: {
    params: Params;
  },
) {
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
    const detail = await getInterviewSessionDetail({
      sessionId,
      supabase,
    });
    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    if (error instanceof InterviewSessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read interview session detail.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Params;
  },
) {
  let payload: z.infer<typeof updateInterviewSessionSchema>;

  try {
    payload = updateInterviewSessionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid interview session update payload." },
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
    await updateInterviewSessionState({
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      sessionId,
      state: payload.state,
      supabase,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update interview session state.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
