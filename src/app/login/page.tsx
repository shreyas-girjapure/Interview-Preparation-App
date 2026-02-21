import Link from "next/link";

import { normalizeNextPath } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SearchParams = Promise<{
  next?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v4.1h5.7c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.5-.2-2.2H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.4-4l-3.3 2.5A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.6 14.2c-.2-.6-.4-1.4-.4-2.2s.1-1.5.4-2.2L3.3 7.3A10 10 0 0 0 2 12c0 1.7.4 3.3 1.3 4.7l3.3-2.5Z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.8 2.8 14.6 2 12 2a10 10 0 0 0-8.7 5.3l3.3 2.5c.7-2.3 2.9-4 5.4-4Z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const nextPath = normalizeNextPath(getSingleValue(rawParams.next));
  const signInHref = `/auth/sign-in?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-lg px-6 py-12 md:py-14">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">
            Welcome back.
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Continue with Google to access your account preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full justify-center gap-2"
          >
            <a href={signInHref}>
              <GoogleIcon />
              Continue with Google
            </a>
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            You will be redirected to Google and then returned to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {nextPath}
            </code>
            .
          </p>

          <Separator className="my-6" />

          <div className="flex items-center justify-between gap-3">
            <Button asChild variant="link" className="h-auto p-0">
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild variant="link" className="h-auto p-0">
              <Link href="/questions">Browse questions</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
