import { NextResponse } from "next/server";
import { z } from "zod";

import { QUESTION_DIFFICULTIES } from "@/lib/interview/difficulty";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const savePreferencesSchema = z.object({
  preferredDifficulty: z.enum(QUESTION_DIFFICULTIES).nullable(),
  focusAreas: z.array(z.string()),
  targetRole: z.string().nullable(),
  experienceLevel: z.string().nullable(),
  dailyGoalMinutes: z.number().int().min(0).max(1440).nullable(),
});

function normalizeFocusAreas(focusAreas: string[]) {
  return Array.from(
    new Set(
      focusAreas
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNullableText(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export async function POST(request: Request) {
  let payload: z.infer<typeof savePreferencesSchema>;

  try {
    payload = savePreferencesSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid preferences payload." },
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
      { error: "You must be signed in to save preferences." },
      { status: 401 },
    );
  }

  const metadata = user.user_metadata as
    | {
        name?: string;
        full_name?: string;
        picture?: string;
        avatar_url?: string;
      }
    | undefined;

  // Keep save resilient if callback profile sync was missed.
  const { error: profileSyncError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: metadata?.full_name ?? metadata?.name ?? null,
      avatar_url: metadata?.avatar_url ?? metadata?.picture ?? null,
    },
    { onConflict: "id" },
  );

  if (profileSyncError) {
    return NextResponse.json(
      {
        error: `Unable to sync profile before saving preferences: ${profileSyncError.message}`,
      },
      { status: 500 },
    );
  }

  const { error: saveError } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      preferred_difficulty: payload.preferredDifficulty,
      focus_areas: normalizeFocusAreas(payload.focusAreas),
      target_role: normalizeNullableText(payload.targetRole),
      experience_level: normalizeNullableText(payload.experienceLevel),
      daily_goal_minutes: payload.dailyGoalMinutes,
    },
    { onConflict: "user_id" },
  );

  if (saveError) {
    return NextResponse.json(
      { error: `Unable to save preferences: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
