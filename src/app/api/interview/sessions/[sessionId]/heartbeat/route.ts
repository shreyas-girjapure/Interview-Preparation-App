import { NextResponse } from "next/server";

import { recordInterviewSessionHeartbeat } from "@/lib/interview/voice-interview-sessions";
import {
  requireAuthenticatedInterviewSessionRequest,
  type InterviewSessionRouteContext,
  toInterviewSessionRouteErrorResponse,
} from "@/app/api/interview/sessions/_lib/route-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: InterviewSessionRouteContext,
) {
  const routeAccess =
    await requireAuthenticatedInterviewSessionRequest(context);

  if ("response" in routeAccess) {
    return routeAccess.response;
  }

  const { sessionId, supabase } = routeAccess;

  try {
    const result = await recordInterviewSessionHeartbeat({
      sessionId,
      supabase,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to update interview heartbeat.",
    );
  }
}
