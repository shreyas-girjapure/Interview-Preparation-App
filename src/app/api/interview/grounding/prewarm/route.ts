import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parseInterviewRequestBody,
  requireAuthenticatedInterviewRequest,
} from "@/app/api/interview/sessions/_lib/route-helpers";
import { prewarmScopedDocumentationGrounding } from "@/lib/interview/scoped-documentation-search";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";

export const dynamic = "force-dynamic";

const prewarmRequestSchema = z.object({
  scopeSlug: z.string().trim().min(1),
  scopeType: z.enum(["topic", "playlist", "question"]),
});

export async function POST(request: Request) {
  const parsedPayload = await parseInterviewRequestBody(
    request,
    prewarmRequestSchema,
    "Invalid grounding prewarm payload.",
  );

  if ("response" in parsedPayload) {
    return parsedPayload.response;
  }

  const authResult = await requireAuthenticatedInterviewRequest(() =>
    NextResponse.json(
      {
        error: "You must be signed in to prewarm interview grounding.",
        errorCode: "unauthorized",
      },
      { status: 401 },
    ),
  );

  if ("response" in authResult) {
    return authResult.response;
  }

  const scope = await resolveVoiceInterviewScope(parsedPayload.data);

  if (!scope) {
    return NextResponse.json(
      {
        error: "The interview scope could not be found.",
        errorCode: "invalid_scope",
      },
      { status: 404 },
    );
  }

  try {
    await prewarmScopedDocumentationGrounding(scope);
  } catch (error) {
    console.error("Unable to prewarm scoped documentation grounding", error);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
