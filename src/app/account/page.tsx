import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type QuestionDifficulty } from "@/lib/interview/questions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PreferencesForm } from "@/app/account/preferences-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select(
      "preferred_difficulty, focus_areas, target_role, experience_level, daily_goal_minutes",
    )
    .eq("user_id", user.id)
    .maybeSingle<{
      preferred_difficulty: QuestionDifficulty | null;
      focus_areas: string[] | null;
      target_role: string | null;
      experience_level: string | null;
      daily_goal_minutes: number | null;
    }>();

  if (preferencesError && preferencesError.code !== "PGRST116") {
    console.error("Unable to load user preferences.", preferencesError);
  }

  const initialPreferences = {
    preferredDifficulty: preferences?.preferred_difficulty ?? null,
    focusAreas: preferences?.focus_areas ?? [],
    targetRole: preferences?.target_role ?? null,
    experienceLevel: preferences?.experience_level ?? null,
    dailyGoalMinutes: preferences?.daily_goal_minutes ?? null,
  };

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-14 md:py-20">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Account
          </Badge>
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
            Signed in successfully
          </h1>
          <p className="text-base leading-8 text-muted-foreground md:text-lg">
            You are authenticated through Supabase Auth.
          </p>
        </header>

        <Separator className="my-8" />

        <div className="space-y-4 rounded-xl border border-border/80 bg-card/70 p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </p>
            <p className="text-base font-medium">{user.email ?? "Unknown"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              User ID
            </p>
            <p className="break-all text-sm">{user.id}</p>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <form method="post" action="/auth/sign-out?next=/">
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
            <Button asChild>
              <Link href="/questions">Browse questions</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-border/80 bg-card/70 p-6">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">
              Interview Preferences
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize difficulty and focus areas to shape your practice
              flow.
            </p>
          </div>
          <PreferencesForm initialPreferences={initialPreferences} />
        </div>
      </section>
    </main>
  );
}
