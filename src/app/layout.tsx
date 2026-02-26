import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { ScrollToTop } from "@/components/scroll-to-top";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { hasAdminAreaAccess, isAppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Prep",
  description:
    "Readable interview preparation with clean explanations and code.",
};

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
  let accountAvatarUrl: string | null = null;
  let canAccessAdminArea = false;

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

        const { data: userProfile } = await supabase
          .from("users")
          .select("role, avatar_url")
          .eq("id", user.id)
          .maybeSingle<{ role: string | null; avatar_url: string | null }>();

        accountAvatarUrl =
          userProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
        const role = isAppRole(userProfile?.role) ? userProfile.role : null;
        canAccessAdminArea = hasAdminAreaAccess(role);
      }
    } catch {
      isAuthenticated = false;
    }
  }

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <ScrollToTop />
          <div className="flex min-h-screen flex-col pb-16 md:pb-24">
            <header className="border-b border-border/70 bg-background/95 backdrop-blur">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2 sm:px-6 md:px-10 md:py-3">
                <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
                  <BrandLogo className="size-12 shrink-0 text-foreground/80 sm:size-16" />
                  <span className="font-serif text-[1.85rem] leading-[1.18] tracking-tight sm:text-[2.15rem]">
                    Interview Prep
                  </span>
                </Link>
                <div className="md:hidden">
                  <MobileNav
                    isAuthenticated={isAuthenticated}
                    canAccessAdminArea={canAccessAdminArea}
                    accountInitial={accountInitial}
                    accountLabel={accountLabel}
                    accountAvatarUrl={accountAvatarUrl}
                  />
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  {isAuthenticated ? (
                    <>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/topics">Topics</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/questions">Questions</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/playlists">Playlists</Link>
                      </Button>
                      {canAccessAdminArea ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/admin/playlists">Admin</Link>
                        </Button>
                      ) : null}
                      <Link
                        href="/account"
                        aria-label={accountLabel}
                        title={accountLabel}
                        className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-foreground text-[11px] font-semibold tracking-[0.01em] text-background shadow-xs transition-opacity hover:opacity-90"
                      >
                        {accountAvatarUrl ? (
                          <img
                            src={accountAvatarUrl}
                            alt={accountLabel}
                            className="size-full object-cover"
                          />
                        ) : (
                          accountInitial
                        )}
                      </Link>
                    </>
                  ) : (
                    <Button asChild size="sm">
                      <Link href="/login?next=/account">Get started</Link>
                    </Button>
                  )}
                </div>
              </div>
            </header>
            <div className="flex-1">{children}</div>
          </div>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
