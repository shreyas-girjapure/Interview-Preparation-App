import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{
  reason?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(reason: string | undefined) {
  if (reason === "admin") {
    return "You need an admin or editor role to access this page.";
  }

  return "You do not have permission to view this page.";
}

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const reason = getSingleValue(params.reason);

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
        <div className="space-y-5 rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            Unauthorized
          </Badge>
          <h1 className="font-serif text-4xl tracking-tight">Access denied</h1>
          <p className="text-base leading-8 text-muted-foreground">
            {getMessage(reason)}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link href="/account">Go to account</Link>
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
