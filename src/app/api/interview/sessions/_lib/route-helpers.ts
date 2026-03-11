import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InterviewSessionNotFoundError,
  InterviewSessionTerminalStateConflictError,
} from "@/lib/interview/voice-interview-sessions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { interviewSessionParamsSchema } from "./schemas";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

type RouteGuardResult<T> = T | { response: NextResponse };

export type InterviewSessionRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function parseInterviewRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  invalidMessage: string,
): Promise<RouteGuardResult<{ data: T }>> {
  try {
    return {
      data: schema.parse(await request.json()),
    };
  } catch {
    return {
      response: NextResponse.json({ error: invalidMessage }, { status: 400 }),
    };
  }
}

export async function requireAuthenticatedInterviewRequest(
  createUnauthorizedResponse: () => NextResponse = () =>
    NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
): Promise<RouteGuardResult<{ supabase: SupabaseServerClient; user: User }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response: createUnauthorizedResponse(),
    };
  }

  return {
    supabase,
    user,
  };
}

export async function requireAuthenticatedInterviewSessionRequest(
  context: InterviewSessionRouteContext,
  createUnauthorizedResponse?: () => NextResponse,
): Promise<
  RouteGuardResult<{
    sessionId: string;
    supabase: SupabaseServerClient;
    user: User;
  }>
> {
  const [authResult, params] = await Promise.all([
    requireAuthenticatedInterviewRequest(createUnauthorizedResponse),
    context.params,
  ]);

  if ("response" in authResult) {
    return authResult;
  }

  const parsedParams = interviewSessionParamsSchema.safeParse(params);

  if (!parsedParams.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid interview session id." },
        { status: 400 },
      ),
    };
  }

  return {
    ...authResult,
    sessionId: parsedParams.data.sessionId,
  };
}

export function toInterviewSessionRouteErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof InterviewSessionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof InterviewSessionTerminalStateConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status: 500 },
  );
}
