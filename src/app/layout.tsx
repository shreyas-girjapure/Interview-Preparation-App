import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  if (hasSupabasePublicEnv) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAuthenticated = Boolean(user);
    } catch {
      isAuthenticated = false;
    }
  }

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen">
          <header className="border-b border-border/70 bg-background/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
              <Link href="/" className="font-serif text-xl tracking-tight">
                Interview Prep
              </Link>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/questions">Questions</Link>
                </Button>
                {isAuthenticated ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/account">Account</Link>
                    </Button>
                    <form method="post" action="/auth/sign-out?next=/">
                      <Button type="submit" variant="ghost" size="sm">
                        Sign out
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/login?next=/questions">Sign in</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/login?next=/account">Get started</Link>
                    </Button>
                  </>
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
