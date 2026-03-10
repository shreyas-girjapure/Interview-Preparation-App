import { NextResponse } from "next/server";
import { z } from "zod";

import type { ForceEndInterviewSessionRequest } from "@/lib/interview/voice-interview-api";
import {
  forceEndInterviewSession,
  InterviewSessionNotFoundError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const forceEndInterviewSessionSchema = z
  .object({
    reason: z.enum([
      "duplicate_session",
      "stale_session",
      "policy_update",
      "admin_shutdown",
    ]),
  })
  .strict() satisfies z.ZodType<ForceEndInterviewSessionRequest>;

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
  let payload: z.infer<typeof forceEndInterviewSessionSchema>;

  try {
    payload = forceEndInterviewSessionSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid force end interview session payload." },
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
    const result = await forceEndInterviewSession({
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
            : "Unable to force end interview session.",
      },
      { status: 500 },
    );
  }
}
