import Link from "next/link";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SAMPLE_MARKDOWN = `# TypeScript Type Narrowing

Apply control-flow narrowing, discriminated unions, and custom type guards.

Narrowing turns broad unions into safe concrete branches.

## Interview-ready points

- Use \`typeof\`, \`instanceof\`, and \`in\` checks
- Prefer discriminated unions for exhaustive logic
- Add user-defined type predicates for reusable guards
`;

export default function InlineCodeSamplesPage() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
        <header className="space-y-4">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs tracking-wide uppercase"
          >
            UX Mock Samples
          </Badge>
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
            Inline code readability samples
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Same content, two inline-code styles. Token previews are shown below
            as block-style chips.
          </p>
          <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-card/70 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Black token blocks
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <code className="rounded-md border border-white/20 bg-[oklch(0.18_0.01_80)] px-2 py-1 font-mono text-sm text-[oklch(0.97_0.003_95)]">
                  typeof
                </code>
                <code className="rounded-md border border-white/20 bg-[oklch(0.18_0.01_80)] px-2 py-1 font-mono text-sm text-[oklch(0.97_0.003_95)]">
                  instanceof
                </code>
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/70 p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Grey token blocks
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <code className="rounded-md border border-[oklch(0.86_0.008_88)] bg-[oklch(0.93_0.005_95)] px-2 py-1 font-mono text-sm text-[oklch(0.26_0.01_84)]">
                  typeof
                </code>
                <code className="rounded-md border border-[oklch(0.86_0.008_88)] bg-[oklch(0.93_0.005_95)] px-2 py-1 font-mono text-sm text-[oklch(0.26_0.01_84)]">
                  instanceof
                </code>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/questions/typescript-type-narrowing">
                Open question page
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/design/related-questions-samples">
                Related-question mocks
              </Link>
            </Button>
          </div>
        </header>

        <Separator className="my-8" />

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-border/80 bg-card/70 p-6 md:p-8">
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sample A
            </p>
            <h2 className="font-serif text-2xl tracking-tight">
              Black inline code
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              High contrast, strong visual anchor.
            </p>
            <Separator className="my-5" />
            <MarkdownContent
              source={SAMPLE_MARKDOWN}
              className="inline-code-black"
            />
          </article>

          <article className="rounded-2xl border border-border/80 bg-card/70 p-6 md:p-8">
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Sample B
            </p>
            <h2 className="font-serif text-2xl tracking-tight">
              Soft grey inline code
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Lower visual weight, keeps prose calmer.
            </p>
            <Separator className="my-5" />
            <MarkdownContent
              source={SAMPLE_MARKDOWN}
              className="inline-code-grey"
            />
          </article>
        </section>
      </div>
    </main>
  );
}
