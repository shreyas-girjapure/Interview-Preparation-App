import { NextResponse } from "next/server";

import { persistInterviewSessionEvents } from "@/lib/interview/voice-interview-sessions";
import {
  parseInterviewRequestBody,
  requireAuthenticatedInterviewSessionRequest,
  type InterviewSessionRouteContext,
  toInterviewSessionRouteErrorResponse,
} from "@/app/api/interview/sessions/_lib/route-helpers";
import { persistInterviewEventsSchema } from "@/app/api/interview/sessions/_lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: InterviewSessionRouteContext,
) {
  const parsedPayload = await parseInterviewRequestBody(
    request,
    persistInterviewEventsSchema,
    "Invalid interview events payload.",
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
    const result = await persistInterviewSessionEvents({
      events: payload.events,
      finalizedItems: payload.finalizedItems,
      sessionId,
      supabase,
      usageEvents: payload.usageEvents,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return toInterviewSessionRouteErrorResponse(
      error,
      "Unable to persist interview events.",
    );
  }
}
