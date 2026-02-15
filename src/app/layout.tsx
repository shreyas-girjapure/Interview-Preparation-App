import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { hasAdminAreaAccess, isAppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Prep",
  description:
    "Readable interview preparation with clean explanations and code.",
};

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let isAuthenticated = false;
  let accountInitial = "U";
  let accountLabel = "Account";
  let canAccessAdmin = false;
  let wrapCodeBlocksOnMobile = false;

  if (hasSupabasePublicEnv) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAuthenticated = Boolean(user);

      if (user) {
        const fullName =
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null;
        const email = user.email ?? null;
        const seed = fullName?.trim() || email || "U";
        accountInitial = seed.charAt(0).toUpperCase();
        accountLabel = fullName?.trim() || email || "Account";

        const { data: preferences, error: preferencesError } = await supabase
          .from("user_preferences")
          .select("wrap_code_blocks_on_mobile")
          .eq("user_id", user.id)
          .maybeSingle<{
            wrap_code_blocks_on_mobile: boolean | null;
          }>();

        if (
          preferencesError &&
          !isMissingWrapCodeBlocksColumnError(preferencesError) &&
          preferencesError.code !== "PGRST116"
        ) {
          console.warn("Unable to load wrap-code feature preference.");
        }

        wrapCodeBlocksOnMobile = Boolean(
          preferences?.wrap_code_blocks_on_mobile,
        );

        const { data: userRoleData, error: userRoleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{
            role: string | null;
          }>();

        if (userRoleError && userRoleError.code !== "PGRST116") {
          console.warn("Unable to load account role for admin nav.");
        } else if (isAppRole(userRoleData?.role)) {
          canAccessAdmin = hasAdminAreaAccess(userRoleData.role);
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  return (
    <html lang="en">
      <body
        className={cn(
          "antialiased",
          wrapCodeBlocksOnMobile && "feature-wrap-code-mobile",
        )}
      >
        <div className="min-h-screen">
          <header className="border-b border-border/70 bg-background/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 md:px-10">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-[-0.03em]"
              >
                <BrandLogo className="size-16 text-foreground/80" />
                <span className="leading-none">Interview Prep</span>
              </Link>
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/topics">Topics</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/questions">Questions</Link>
                    </Button>
                    {canAccessAdmin ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/admin">Admin</Link>
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {isAuthenticated ? (
                  <Link
                    href="/account"
                    aria-label={accountLabel}
                    title={accountLabel}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-foreground text-[11px] font-semibold tracking-[0.01em] text-background shadow-xs transition-opacity hover:opacity-90"
                  >
                    {accountInitial}
                  </Link>
                ) : (
                  <Button asChild size="sm">
                    <Link href="/login?next=/account">Get started</Link>
                  </Button>
                )}
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
