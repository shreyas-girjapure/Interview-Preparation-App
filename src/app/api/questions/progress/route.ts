import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// --- Schemas ---

const progressStateSchema = z.enum(["unread", "read", "review_later"]);

// Single item (original shape — backward compatible)
const singleItemSchema = z
  .object({
    questionId: z.string().uuid(),
    state: progressStateSchema,
  })
  .strict();

// Bulk shape: { items: [{ questionId, state }, ...] }
const bulkItemSchema = z
  .object({
    items: z
      .array(
        z.object({
          questionId: z.string().uuid(),
          state: progressStateSchema,
        }),
      )
      .min(1)
      .max(100),
  })
  .strict();

const requestSchema = z.union([singleItemSchema, bulkItemSchema]);

// --- Helpers ---

type ProgressItem = {
  questionId: string;
  state: z.infer<typeof progressStateSchema>;
};

function buildRow(
  userId: string,
  { questionId, state }: ProgressItem,
  now: string,
  tomorrow: string,
) {
  if (state === "unread") {
    return {
      user_id: userId,
      question_id: questionId,
      is_read: false,
      read_at: null,
      completion_percent: 0,
      last_viewed_at: now,
      review_status: null,
      next_review_at: null,
    };
  }
  if (state === "read") {
    return {
      user_id: userId,
      question_id: questionId,
      is_read: true,
      read_at: now,
      completion_percent: 100,
      last_viewed_at: now,
      review_status: "got_it" as const,
      next_review_at: null,
    };
  }
  // review_later
  return {
    user_id: userId,
    question_id: questionId,
    is_read: true,
    read_at: now,
    completion_percent: 100,
    last_viewed_at: now,
    review_status: "review_later" as const,
    next_review_at: tomorrow,
  };
}

// --- Route handler ---

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;

  try {
    parsed = requestSchema.parse(await request.json());
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

  // Normalise to an array regardless of single vs bulk input
  const items: ProgressItem[] = "items" in parsed ? parsed.items : [parsed];

  const rows = items.map((item) => buildRow(user.id, item, now, tomorrow));

  const { error: saveError } = await supabase
    .from("user_question_progress")
    .upsert(rows, { onConflict: "user_id,question_id" });

  if (saveError) {
    return NextResponse.json(
      { error: `Unable to save question progress: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
