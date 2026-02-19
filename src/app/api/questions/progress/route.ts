import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const saveQuestionProgressSchema = z
  .object({
    questionId: z.string().uuid(),
    state: z.enum(["unread", "read", "review_later"]),
  })
  .strict();

export async function POST(request: Request) {
  let payload: z.infer<typeof saveQuestionProgressSchema>;

  try {
    payload = saveQuestionProgressSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid question progress payload." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to track question progress." },
      { status: 401 },
    );
  }

  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const row =
    payload.state === "unread"
      ? {
          user_id: user.id,
          question_id: payload.questionId,
          is_read: false,
          read_at: null,
          completion_percent: 0,
          last_viewed_at: now,
          review_status: null,
          next_review_at: null,
        }
      : payload.state === "read"
        ? {
            user_id: user.id,
            question_id: payload.questionId,
            is_read: true,
            read_at: now,
            completion_percent: 100,
            last_viewed_at: now,
            review_status: "got_it" as const,
            next_review_at: null,
          }
        : {
            user_id: user.id,
            question_id: payload.questionId,
            is_read: true,
            read_at: now,
            completion_percent: 100,
            last_viewed_at: now,
            review_status: "review_later" as const,
            next_review_at: tomorrow,
          };

  const { error: saveError } = await supabase
    .from("user_question_progress")
    .upsert(row, { onConflict: "user_id,question_id" });

  if (saveError) {
    return NextResponse.json(
      { error: `Unable to save question progress: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    state: payload.state,
  });
}
