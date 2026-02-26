import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ExperienceLevel } from "@/lib/account/experience-level";
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

  const { data: userProfile } = await supabase
    .from("users")
    .select("avatar_url, full_name")
    .eq("id", user.id)
    .maybeSingle<{ avatar_url: string | null; full_name: string | null }>();

  const avatarUrl =
    userProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
  const fullName =
    userProfile?.full_name ?? user.user_metadata?.full_name ?? null;
  const initial = (fullName || user.email || "U").charAt(0).toUpperCase();

  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("focus_areas, target_role, experience_level, daily_goal_minutes")
    .eq("user_id", user.id)
    .maybeSingle<{
      focus_areas: string[] | null;
      target_role: string | null;
      experience_level: ExperienceLevel | null;
      daily_goal_minutes: number | null;
    }>();

  if (preferencesError && preferencesError.code !== "PGRST116") {
    console.warn("Unable to load user preferences.", preferencesError);
  }

  const initialPreferences = {
    focusAreas: preferences?.focus_areas ?? [],
    targetRole: preferences?.target_role ?? null,
    experienceLevel: preferences?.experience_level ?? null,
    dailyGoalMinutes: preferences?.daily_goal_minutes ?? null,
  };

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
        <header className="page-copy-enter space-y-2">
          <h1 className="font-serif text-3xl tracking-tight md:text-5xl">
            Account Settings
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your profile, preferences, and account security.
          </p>
        </header>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm transition-all hover:bg-card/70 hover:shadow-md">
          <div className="flex items-center gap-5">
            <div className="inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-3xl font-semibold text-foreground shadow-sm ring-1 ring-border/40 hover:ring-border/60 transition-all">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName ?? "Profile"}
                  className="size-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                initial
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight capitalize">
                {fullName || "User Profile"}
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                {user.email ?? "No email provided"}
              </p>
            </div>
          </div>

          <form
            method="post"
            action="/auth/sign-out?next=/"
            className="shrink-0 w-full sm:w-auto"
          >
            <Button
              type="submit"
              className="w-full sm:w-auto rounded-full px-6 font-medium shadow-sm transition-transform hover:scale-105"
            >
              Sign out
            </Button>
          </form>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize your practice defaults.
            </p>
          </div>
          <PreferencesForm initialPreferences={initialPreferences} />
        </div>
      </section>
    </main>
  );
}
