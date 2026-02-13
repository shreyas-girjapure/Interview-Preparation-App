import { NextResponse } from "next/server";
import { z } from "zod";

import { QUESTION_DIFFICULTIES } from "@/lib/interview/questions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const preferencesSchema = z.object({
  preferredDifficulty: z.enum(QUESTION_DIFFICULTIES).nullable(),
  focusAreas: z.array(z.string().trim().min(1).max(64)).max(20),
  targetRole: z.string().trim().max(120).nullable(),
  experienceLevel: z.string().trim().max(80).nullable(),
  dailyGoalMinutes: z.number().int().min(0).max(1440).nullable(),
});

type UserPreferencesRow = {
  preferred_difficulty: (typeof QUESTION_DIFFICULTIES)[number] | null;
  focus_areas: string[] | null;
  target_role: string | null;
  experience_level: string | null;
  daily_goal_minutes: number | null;
};

function toResponsePayload(row: UserPreferencesRow | null) {
  if (!row) {
    return {
      preferredDifficulty: null,
      focusAreas: [],
      targetRole: null,
      experienceLevel: null,
      dailyGoalMinutes: null,
    };
  }

  return {
    preferredDifficulty: row.preferred_difficulty,
    focusAreas: row.focus_areas ?? [],
    targetRole: row.target_role,
    experienceLevel: row.experience_level,
    dailyGoalMinutes: row.daily_goal_minutes,
  };
}

async function getAuthedClient() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}

export async function GET() {
  const authed = await getAuthedClient();

  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await authed.supabase
    .from("user_preferences")
    .select(
      "preferred_difficulty, focus_areas, target_role, experience_level, daily_goal_minutes",
    )
    .eq("user_id", authed.user.id)
    .maybeSingle<UserPreferencesRow>();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Unable to load user preferences." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: toResponsePayload(data ?? null) });
}

export async function POST(request: Request) {
  const authed = await getAuthedClient();

  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid preferences payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const { data, error } = await authed.supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: authed.user.id,
        preferred_difficulty: payload.preferredDifficulty,
        focus_areas: payload.focusAreas,
        target_role: payload.targetRole,
        experience_level: payload.experienceLevel,
        daily_goal_minutes: payload.dailyGoalMinutes,
      },
      { onConflict: "user_id" },
    )
    .select(
      "preferred_difficulty, focus_areas, target_role, experience_level, daily_goal_minutes",
    )
    .single<UserPreferencesRow>();

  if (error) {
    return NextResponse.json(
      { error: "Unable to save user preferences." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: toResponsePayload(data) });
}
