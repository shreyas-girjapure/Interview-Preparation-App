import { NextResponse } from "next/server";

import {
  InterviewSessionNotFoundError,
  recordInterviewSessionHeartbeat,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{
  sessionId: string;
}>;

export const dynamic = "force-dynamic";

export async function POST(
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
    const result = await recordInterviewSessionHeartbeat({
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
            : "Unable to update interview heartbeat.",
      },
      { status: 500 },
    );
  }
}
