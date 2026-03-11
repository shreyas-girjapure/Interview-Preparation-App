import { NextResponse } from "next/server";

import { completeInterviewSession } from "@/lib/interview/voice-interview-sessions";
import {
  parseInterviewRequestBody,
  requireAuthenticatedInterviewSessionRequest,
  type InterviewSessionRouteContext,
  toInterviewSessionRouteErrorResponse,
} from "@/app/api/interview/sessions/_lib/route-helpers";
import { completeInterviewSessionSchema } from "@/app/api/interview/sessions/_lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: InterviewSessionRouteContext,
) {
  const parsedPayload = await parseInterviewRequestBody(
    request,
    completeInterviewSessionSchema,
    "Invalid complete interview session payload.",
  );

  if ("response" in parsedPayload) {
    return parsedPayload.response;
  }

  const routeAccess =
    await requireAuthenticatedInterviewSessionRequest(context);

  if ("response" in routeAccess) {
    return routeAccess.response;
  }

  const { sessionId, supabase } = routeAccess;
  const payload = parsedPayload.data;

  try {
    const result = await completeInterviewSession({
      completionReason: payload.completionReason,
      finalizedItems: payload.finalizedItems,
      metrics: payload.metrics,
      sessionId,
      supabase,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to complete interview session.",
    );
  }
}
