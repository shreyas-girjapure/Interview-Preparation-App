import Link from "next/link";

import { QuestionProgressSampleOnePreview } from "@/components/design-samples/question-progress-sample-one-preview";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getQuestionBySlug,
  listFeaturedQuestions,
  listTopicsForQuestion,
} from "@/lib/interview/questions";

const FALLBACK_TITLE =
  "Batch jobs sometimes skip records without exception. How would you investigate?";
const FALLBACK_SUMMARY =
  "Tests debugging skills for batch processing issues including query scope, state management, and silent failure patterns.";
const FALLBACK_CATEGORIES = ["Salesforce"];
const FALLBACK_ANSWER = `
## Key Points

- Batch jobs can skip records for several reasons: query scope changes, try-catch swallowing exceptions, stateful vs stateless confusion, or \`Database.update(records, false)\`.
- The \`start()\` method QueryLocator captures a snapshot, so later record changes may be excluded.
- If \`execute()\` catches broad exceptions and never logs/rethrows, failures look "silent".
- Validate whether \`finish()\` sends notifications that indicate partial success vs complete success.

## Investigation Checklist

1. Reproduce with a smaller controlled dataset and add deterministic logging.
2. Compare record count from \`start()\` against each \`execute()\` chunk processed.
3. Check \`AsyncApexJob\` plus debug logs for unhandled failures and governor pressure.
4. Inspect DML statements using partial success to identify skipped row-level errors.
`;

export default async function QuestionDetailMobileDesignSamplePage() {
  const featuredQuestions = await listFeaturedQuestions(1);
  const previewQuestion = featuredQuestions[0]
    ? await getQuestionBySlug(featuredQuestions[0].slug)
    : undefined;
  const linkedTopics = previewQuestion
    ? await listTopicsForQuestion(previewQuestion)
    : [];

  const categories = previewQuestion
    ? previewQuestion.categories.length
      ? previewQuestion.categories
      : [previewQuestion.category]
    : FALLBACK_CATEGORIES;

  const title = previewQuestion?.title ?? FALLBACK_TITLE;
  const summary = previewQuestion?.summary ?? FALLBACK_SUMMARY;
  const answerMarkdown = previewQuestion?.answerMarkdown ?? FALLBACK_ANSWER;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Design Sample
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Question Detail Mobile Polish
          </h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Mock of the real question detail page with updated phone action
            buttons and markdown typography.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
          <article className="mx-auto w-full max-w-[430px] rounded-[2rem] border border-border/70 bg-card/70 p-3 shadow-2xl">
            <div className="rounded-[1.45rem] border border-border/75 bg-background px-4 py-5 sm:px-5">
              <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
                <Link href="/questions">Back to catalog</Link>
              </Button>

              <header className="space-y-5">
                <QuestionProgressSampleOnePreview categories={categories} />
                <h2 className="font-serif text-[2.1rem] leading-[1.03] tracking-tight sm:text-[2.35rem]">
                  {title}
                </h2>
                <p className="text-base leading-8 text-foreground/74">
                  {summary}
                </p>

                {linkedTopics.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      Linked topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedTopics.slice(0, 3).map((topic) => (
                        <Button
                          key={topic.slug}
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <Link href={`/topics/${topic.slug}`}>
                            {topic.name}
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </header>

              <Separator className="my-7" />

              <MarkdownContent
                source={answerMarkdown}
                className="mobile-wrap-code"
              />
            </div>
          </article>

          <aside className="space-y-3 rounded-2xl border border-border/80 bg-card/60 p-4 md:p-5">
            <h2 className="font-serif text-2xl tracking-tight">
              What changed in this mock
            </h2>
            <ul className="space-y-2 text-sm leading-6 text-foreground/82">
              <li>
                Progress actions now use a compact, less intrusive footprint on
                phones.
              </li>
              <li>
                Active states are softer and less visually heavy while still
                clearly selected.
              </li>
              <li>
                Markdown body copy now uses UI sans typography for sharper
                mobile rendering.
              </li>
              <li>
                Heading hierarchy keeps the serif display style to match the
                existing brand direction.
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
