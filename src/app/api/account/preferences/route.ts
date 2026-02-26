import { NextResponse } from "next/server";
import { z } from "zod";

import {
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
} from "@/lib/account/experience-level";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const experienceLevelSchema = z.enum(EXPERIENCE_LEVELS);

const savePreferencesSchema = z
  .object({
    focusAreas: z.array(z.string()).optional(),
    targetRole: z.string().nullable().optional(),
    experienceLevel: experienceLevelSchema.nullable().optional(),
    dailyGoalMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one preference field is required.",
  });

function normalizeFocusAreas(focusAreas: string[]) {
  return Array.from(
    new Set(focusAreas.map((item) => item.trim()).filter(Boolean)),
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

  const upsertPayload: {
    user_id: string;
    focus_areas?: string[];
    target_role?: string | null;
    experience_level?: ExperienceLevel | null;
    daily_goal_minutes?: number | null;
  } = {
    user_id: user.id,
  };

  if (payload.focusAreas !== undefined) {
    upsertPayload.focus_areas = normalizeFocusAreas(payload.focusAreas);
  }

  if (payload.targetRole !== undefined) {
    upsertPayload.target_role = normalizeNullableText(payload.targetRole);
  }

  if (payload.experienceLevel !== undefined) {
    upsertPayload.experience_level = payload.experienceLevel;
  }

  if (payload.dailyGoalMinutes !== undefined) {
    upsertPayload.daily_goal_minutes = payload.dailyGoalMinutes;
  }

  const { error: saveError } = await supabase
    .from("user_preferences")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (saveError) {
    return NextResponse.json(
      { error: `Unable to save preferences: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
