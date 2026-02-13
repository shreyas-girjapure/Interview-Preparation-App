import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{
  message?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const message =
    getSingleValue(rawParams.message) ??
    "We could not complete sign-in. Please try again.";

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-3xl px-6 py-14 md:py-20">
        <div className="space-y-5 rounded-xl border border-border/80 bg-card/70 p-6">
          <Badge variant="destructive">Authentication Error</Badge>
          <h1 className="font-serif text-4xl tracking-tight">Sign-in failed</h1>
          <p className="text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Try Google sign-in again</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
