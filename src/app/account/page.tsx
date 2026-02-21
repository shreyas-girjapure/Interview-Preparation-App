import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ExperienceLevel } from "@/lib/account/experience-level";
import { FeaturesForm } from "@/app/account/features-form";
import { PreferencesForm } from "@/app/account/preferences-form";

export const dynamic = "force-dynamic";

function isMissingWrapCodeBlocksColumnError(
  error: {
    message?: string | null;
  } | null,
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("wrap_code_blocks_on_mobile") && message.includes("column")
  );
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: preferencesWithFeature, error: preferencesWithFeatureError } =
    await supabase
      .from("user_preferences")
      .select(
        "focus_areas, target_role, experience_level, daily_goal_minutes, wrap_code_blocks_on_mobile",
      )
      .eq("user_id", user.id)
      .maybeSingle<{
        focus_areas: string[] | null;
        target_role: string | null;
        experience_level: ExperienceLevel | null;
        daily_goal_minutes: number | null;
        wrap_code_blocks_on_mobile: boolean | null;
      }>();

  let preferences = preferencesWithFeature;
  let preferencesError = preferencesWithFeatureError;

  if (isMissingWrapCodeBlocksColumnError(preferencesWithFeatureError)) {
    const { data: fallbackPreferences, error: fallbackError } = await supabase
      .from("user_preferences")
      .select("focus_areas, target_role, experience_level, daily_goal_minutes")
      .eq("user_id", user.id)
      .maybeSingle<{
        focus_areas: string[] | null;
        target_role: string | null;
        experience_level: ExperienceLevel | null;
        daily_goal_minutes: number | null;
      }>();

    preferences = fallbackPreferences
      ? {
          ...fallbackPreferences,
          wrap_code_blocks_on_mobile: false,
        }
      : null;
    preferencesError = fallbackError;
  }

  if (preferencesError && preferencesError.code !== "PGRST116") {
    console.warn("Unable to load user preferences.", preferencesError);
  }

  const initialPreferences = {
    focusAreas: preferences?.focus_areas ?? [],
    targetRole: preferences?.target_role ?? null,
    experienceLevel: preferences?.experience_level ?? null,
    dailyGoalMinutes: preferences?.daily_goal_minutes ?? null,
  };
  const initialWrapCodeBlocksOnMobile =
    preferences?.wrap_code_blocks_on_mobile ?? false;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
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
        </header>

        <Separator className="my-6" />

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
            <h2 className="font-serif text-2xl tracking-tight">Preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize your practice defaults.
            </p>
          </div>
          <PreferencesForm initialPreferences={initialPreferences} />
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-border/80 bg-card/70 p-6">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Features</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reader behaviors and toggles. More options will be added here.
            </p>
          </div>
          <FeaturesForm
            initialWrapCodeBlocksOnMobile={initialWrapCodeBlocksOnMobile}
          />
        </div>
      </section>
    </main>
  );
}
