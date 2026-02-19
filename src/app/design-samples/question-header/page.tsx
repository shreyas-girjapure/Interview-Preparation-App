import Link from "next/link";
import {
  Bookmark,
  Check,
  CircleDot,
  Clock3,
  Dot,
  Flag,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getQuestionBySlug,
  listFeaturedQuestions,
} from "@/lib/interview/questions";
import { cn } from "@/lib/utils";

type SampleContext = {
  title: string;
  summary: string;
  categories: string[];
  stateLabel: string;
};

type HeaderSample = {
  id: string;
  name: string;
  summary: string;
  render: (context: SampleContext) => React.ReactNode;
};

const FALLBACK_CONTEXT: SampleContext = {
  title:
    "A Batch Apex job processes 1M records but skips some records without exception. How would you investigate?",
  summary:
    "Tests debugging skills for batch processing issues including query scope, state management, and silent failure patterns.",
  categories: ["Salesforce"],
  stateLabel: "Unread",
};

const ACTION_BASE =
  "h-8 rounded-lg border border-border/70 bg-background/85 px-2.5 text-sm font-medium text-foreground/88 shadow-none hover:bg-accent/65";
const ACTION_ACTIVE =
  "h-8 rounded-lg border border-border/70 bg-muted/55 px-2.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/75";

function metaRow(context: SampleContext) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {context.categories.map((category) => (
        <Badge key={category} variant="outline">
          {category}
        </Badge>
      ))}
      <Badge variant="secondary">{context.stateLabel}</Badge>
    </div>
  );
}

function titleBlock(context: SampleContext, className?: string) {
  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-serif text-[2rem] leading-[1.06] tracking-tight">
        {context.title}
      </h3>
      <p className="max-w-[62ch] text-base leading-8 text-foreground/72">
        {context.summary}
      </p>
    </div>
  );
}

function SampleOne(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      {metaRow(context)}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className={ACTION_BASE}>
          <Check className="size-4" />
          Mark as read
        </Button>
        <Button size="sm" variant="outline" className={ACTION_BASE}>
          <RotateCcw className="size-4" />
          Revisit later
        </Button>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleTwo(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {metaRow(context)}
        <div className="inline-flex rounded-full border border-border/70 bg-background/80 p-1">
          <button
            type="button"
            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold"
          >
            Read
          </button>
          <button
            type="button"
            className="rounded-full px-3 py-1 text-xs font-semibold text-foreground/70"
          >
            Revisit
          </button>
        </div>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleThree(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
        <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2 py-1">
          <Dot className="size-4" />
          Unread
        </span>
        <button type="button" className="underline-offset-4 hover:underline">
          Mark read
        </button>
        <span className="text-foreground/35">/</span>
        <button type="button" className="underline-offset-4 hover:underline">
          Revisit
        </button>
      </div>
      {metaRow(context)}
      {titleBlock(context)}
    </header>
  );
}

function SampleFourBookmarkLine(context: SampleContext) {
  return (
    <header className="relative space-y-5 rounded-2xl border border-border/70 bg-card/45 p-4 pr-12">
      <div className="pointer-events-none absolute top-0 right-4 flex h-24 w-6 flex-col items-center">
        <span className="h-14 w-px bg-border/80" />
        <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-background">
          <Bookmark className="size-3.5" />
        </span>
      </div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      {metaRow(context)}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className={ACTION_ACTIVE}>
          <Check className="size-4" />
          Mark unread
        </Button>
        <Button size="sm" variant="outline" className={ACTION_BASE}>
          <RotateCcw className="size-4" />
          Revisit later
        </Button>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleFive(context: SampleContext) {
  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/45 px-3 py-2">
        <Button asChild variant="ghost" size="sm" className="-ml-1 w-fit">
          <Link href="/questions">Back to catalog</Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className={ACTION_BASE}>
            <Check className="size-4" />
            Read
          </Button>
          <Button size="sm" variant="outline" className={ACTION_BASE}>
            <Clock3 className="size-4" />
            Revisit
          </Button>
        </div>
      </div>
      {metaRow(context)}
      {titleBlock(context)}
    </header>
  );
}

function SampleSix(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {metaRow(context)}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className={ACTION_ACTIVE}>
            <Check className="size-4" />
            Mark read
          </Button>
          <Button size="sm" variant="outline" className={ACTION_BASE}>
            <RotateCcw className="size-4" />
            Revisit
          </Button>
        </div>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleSeven(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {metaRow(context)}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className={ACTION_ACTIVE}>
            <Check className="size-4" />
            Read
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2.5 text-sm">
            <Undo2 className="size-4" />
            Undo
          </Button>
        </div>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleEight(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="rounded-xl border border-border/70 bg-card/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {metaRow(context)}
          <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-2 py-1 text-xs font-medium">
            <Flag className="size-3" />
            Due tomorrow
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className={ACTION_BASE}>
            <Check className="size-4" />
            Mark read
          </Button>
          <Button size="sm" variant="outline" className={ACTION_ACTIVE}>
            <RotateCcw className="size-4" />
            Remove revisit
          </Button>
        </div>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleNine(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        {metaRow(context)}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/65 px-2.5 py-1 text-xs font-semibold tracking-wide">
          <CircleDot className="size-3.5" />
          Tracking on
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className={ACTION_BASE}>
          <Check className="size-4" />
          Mark as read
        </Button>
        <Button size="sm" variant="outline" className={ACTION_BASE}>
          <RotateCcw className="size-4" />
          Revisit
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2.5 text-sm">
          Skip
        </Button>
      </div>
      {titleBlock(context)}
    </header>
  );
}

function SampleTen(context: SampleContext) {
  return (
    <header className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/questions">Back to catalog</Link>
      </Button>
      <div className="rounded-xl border border-border/70 bg-background/80 p-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {metaRow(context)}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Suggested
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" className={ACTION_ACTIVE}>
            <Check className="size-4" />
            Mark unread
          </Button>
          <Button size="sm" variant="outline" className={ACTION_BASE}>
            <RotateCcw className="size-4" />
            Revisit later
          </Button>
        </div>
      </div>
      {titleBlock(context)}
    </header>
  );
}

const HEADER_SAMPLES: HeaderSample[] = [
  {
    id: "1",
    name: "Compact Dual Buttons",
    summary: "Small neutral actions below metadata.",
    render: SampleOne,
  },
  {
    id: "2",
    name: "Segmented Toggle",
    summary: "Single compact control for read vs revisit.",
    render: SampleTwo,
  },
  {
    id: "3",
    name: "Inline Text Actions",
    summary: "Very subtle action treatment with links.",
    render: SampleThree,
  },
  {
    id: "4",
    name: "Top-right Bookmark Line",
    summary: "Includes bookmark line element on upper-right.",
    render: SampleFourBookmarkLine,
  },
  {
    id: "5",
    name: "Top Rail Actions",
    summary: "Back + actions live in one compact rail.",
    render: SampleFive,
  },
  {
    id: "6",
    name: "Stacked Meta Panel",
    summary: "Actions contained in a small meta panel.",
    render: SampleSix,
  },
  {
    id: "7",
    name: "Read + Undo Header",
    summary: "Fast read action with undo affordance.",
    render: SampleSeven,
  },
  {
    id: "8",
    name: "Revisit Emphasis",
    summary: "Highlights revisit state as primary follow-up.",
    render: SampleEight,
  },
  {
    id: "9",
    name: "Three-action Compact",
    summary: "Read, revisit, and skip in one row.",
    render: SampleNine,
  },
  {
    id: "10",
    name: "Suggested Action Block",
    summary: "Soft recommendation style with muted emphasis.",
    render: SampleTen,
  },
];

function SampleCard({
  sample,
  context,
}: {
  sample: HeaderSample;
  context: SampleContext;
}) {
  return (
    <article className="rounded-2xl border border-border/75 bg-card/60 p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Header #{sample.id}
        </p>
        <h2 className="font-serif text-2xl tracking-tight">{sample.name}</h2>
        <p className="text-sm text-muted-foreground">{sample.summary}</p>
      </div>
      <div className="rounded-xl border border-border/70 bg-background px-4 py-4">
        {sample.render(context)}
      </div>
    </article>
  );
}

export default async function QuestionHeaderDesignSamplesPage() {
  const featuredQuestions = await listFeaturedQuestions(1);
  const previewQuestion = featuredQuestions[0]
    ? await getQuestionBySlug(featuredQuestions[0].slug)
    : undefined;

  const context: SampleContext = previewQuestion
    ? {
        title: previewQuestion.title,
        summary: previewQuestion.summary,
        categories: previewQuestion.categories.length
          ? previewQuestion.categories
          : [previewQuestion.category],
        stateLabel: "Unread",
      }
    : FALLBACK_CONTEXT;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Design Samples
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Question Header Variants
          </h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Pick the sample number(s) you want, and I will apply that exact
            header style to the real question detail page.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          {HEADER_SAMPLES.map((sample) => (
            <SampleCard key={sample.id} sample={sample} context={context} />
          ))}
        </section>

        <Separator />
      </section>
    </main>
  );
}
