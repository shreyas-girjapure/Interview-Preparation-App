import { NextResponse } from "next/server";

import {
  getInterviewSessionDetail,
  updateInterviewSessionState,
} from "@/lib/interview/voice-interview-sessions";
import {
  parseInterviewRequestBody,
  requireAuthenticatedInterviewSessionRequest,
  type InterviewSessionRouteContext,
  toInterviewSessionRouteErrorResponse,
} from "@/app/api/interview/sessions/_lib/route-helpers";
import { updateInterviewSessionSchema } from "@/app/api/interview/sessions/_lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(
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
    const detail = await getInterviewSessionDetail({
      sessionId,
      supabase,
    });
    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to read interview session detail.",
    );
  }
}

export async function PATCH(
  request: Request,
  context: InterviewSessionRouteContext,
) {
  const parsedPayload = await parseInterviewRequestBody(
    request,
    updateInterviewSessionSchema,
    "Invalid interview session update payload.",
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
    await updateInterviewSessionState({
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      sessionId,
      state: payload.state,
      supabase,
    });
  } catch (error) {
    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to update interview session state.",
    );
  }

  return NextResponse.json({ ok: true });
}
