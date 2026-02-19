import type { ReactNode } from "react";
import {
  Bookmark,
  Check,
  Clock3,
  Ellipsis,
  RotateCcw,
  Undo2,
} from "lucide-react";

import { QuestionProgressSampleOnePreview } from "@/components/design-samples/question-progress-sample-one-preview";
import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getQuestionBySlug,
  listFeaturedQuestions,
} from "@/lib/interview/questions";
import { cn } from "@/lib/utils";

type DemoQuestion = {
  title: string;
  summary: string;
  topic: string;
  status: "unread" | "read" | "review_later";
  readAt: string;
  nextReviewAt: string;
  completionPercent: number;
};

type TrackingSample = {
  id: string;
  name: string;
  summary: string;
  group: "Theme-aligned" | "Exploratory";
  render: (question: DemoQuestion) => ReactNode;
};

const DEMO_QUESTION: DemoQuestion = {
  title: "Explain optimistic locking and when to use it.",
  summary:
    "Interviewers look for concurrency fundamentals, practical conflict handling, and tradeoffs versus pessimistic locking.",
  topic: "Databases",
  status: "review_later",
  readAt: "Today, 10:42 AM",
  nextReviewAt: "Tomorrow, 9:00 AM",
  completionPercent: 100,
};

const MODEL_NOTES = [
  {
    label: "State mapping",
    value:
      "unread = is_read false, read = is_read true + review_status got_it, revisit = is_read true + review_status review_later",
  },
  {
    label: "On Mark as Read",
    value:
      "Set is_read true, read_at now, completion_percent 100, review_status got_it, next_review_at null.",
  },
  {
    label: "On Revisit",
    value:
      "Set is_read true, review_status review_later, next_review_at scheduled timestamp, increment review_count.",
  },
  {
    label: "Due queue",
    value:
      "Fetch by user_id where review_status is review_later and next_review_at <= now() ordered by next_review_at asc.",
  },
];

function QuestionMeta({ question }: { question: DemoQuestion }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Badge variant="outline">{question.topic}</Badge>
      <Badge
        variant={question.status === "review_later" ? "secondary" : "outline"}
        className="capitalize"
      >
        {question.status.replace("_", " ")}
      </Badge>
    </div>
  );
}

function SampleOne({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <QuestionMeta question={question} />
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm">
          <Check className="mr-1.5 size-4" />
          Mark as read
        </Button>
        <Button size="sm" variant="outline">
          <RotateCcw className="mr-1.5 size-4" />
          Revisit later
        </Button>
      </div>
    </div>
  );
}

function SampleTwo({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <QuestionMeta question={question} />
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <div className="mt-4 inline-flex rounded-full border border-border/70 bg-background/60 p-1">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            question.status === "read" ? "bg-foreground text-background" : "",
          )}
        >
          Read
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            question.status === "review_later"
              ? "bg-foreground text-background"
              : "",
          )}
        >
          Revisit
        </button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Last read: {question.readAt}
      </p>
    </div>
  );
}

function SampleThree({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge variant="secondary" className="capitalize">
          {question.status.replace("_", " ")}
        </Badge>
        <Button size="icon-sm" variant="ghost" aria-label="Change status">
          <Ellipsis className="size-4" />
        </Button>
      </div>
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">Mark read</Badge>
        <Badge variant="outline">Move to revisit</Badge>
        <Badge variant="outline">Undo</Badge>
      </div>
    </div>
  );
}

function SampleFour({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 inline-flex size-6 items-center justify-center rounded-md border border-border/70 bg-background/70"
          aria-label="Toggle read"
        >
          <Check className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{question.topic}</p>
        </div>
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-md border border-border/70 bg-background/70"
          aria-label="Move to revisit list"
        >
          <Bookmark className="size-3.5" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
    </div>
  );
}

function SampleFive({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <QuestionMeta question={question} />
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Last read</span>
          <span className="font-medium">{question.readAt}</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Next review</span>
          <span className="font-medium">{question.nextReviewAt}</span>
        </div>
      </div>
      <Button size="sm" className="mt-4">
        <Clock3 className="mr-1.5 size-4" />
        Review now
      </Button>
    </div>
  );
}

function SampleSix({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <QuestionMeta question={question} />
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
      <div className="mt-4 rounded-md border border-border/70 bg-background/50 px-3 py-2">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Completion
        </p>
        <p className="mt-1 text-sm font-medium">
          {question.completionPercent}%
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          <Check className="mr-1.5 size-4" />
          Mark read
        </Button>
        <Button size="sm" variant="ghost">
          <Undo2 className="mr-1.5 size-4" />
          Undo
        </Button>
      </div>
    </div>
  );
}

function SampleSeven({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <QuestionMeta question={question} />
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
      <div className="mt-5 flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2">
        <p className="text-xs font-medium text-muted-foreground">
          Quick tracking
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Read
          </Button>
          <Button size="sm">Revisit</Button>
        </div>
      </div>
    </div>
  );
}

function SampleEight({ question }: { question: DemoQuestion }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <h3 className="font-serif text-xl leading-snug">{question.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {question.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium">
          {question.status.replace("_", " ")}
        </span>
        <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium">
          Due {question.nextReviewAt}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline">
          Read
        </Button>
        <Button size="sm">Revisit</Button>
      </div>
    </div>
  );
}

const SAMPLES: TrackingSample[] = [
  {
    id: "1",
    name: "Dual Buttons in Header",
    summary: "Clear actions with separate buttons for read and revisit.",
    group: "Theme-aligned",
    render: (question) => <SampleOne question={question} />,
  },
  {
    id: "2",
    name: "Segmented State Switch",
    summary: "Single control for mutually exclusive read/revisit status.",
    group: "Theme-aligned",
    render: (question) => <SampleTwo question={question} />,
  },
  {
    id: "3",
    name: "Status Lozenge + Menu",
    summary: "Compact status indicator with status-change menu affordance.",
    group: "Theme-aligned",
    render: (question) => <SampleThree question={question} />,
  },
  {
    id: "4",
    name: "List Row Quick Actions",
    summary:
      "Fast catalog-level actions using read toggle and revisit shortcut.",
    group: "Theme-aligned",
    render: (question) => <SampleFour question={question} />,
  },
  {
    id: "5",
    name: "Review Timeline Block",
    summary: "Prioritizes spaced repetition by surfacing next review timing.",
    group: "Theme-aligned",
    render: (question) => <SampleFive question={question} />,
  },
  {
    id: "6",
    name: "Action + Undo Pattern",
    summary: "Supports fast marking with immediate undo for error recovery.",
    group: "Exploratory",
    render: (question) => <SampleSix question={question} />,
  },
  {
    id: "7",
    name: "Sticky-style Action Bar",
    summary: "Keeps actions grouped in one predictable location.",
    group: "Exploratory",
    render: (question) => <SampleSeven question={question} />,
  },
  {
    id: "8",
    name: "Compact Mobile Cluster",
    summary: "Dense footprint for small screens while keeping both actions.",
    group: "Exploratory",
    render: (question) => <SampleEight question={question} />,
  },
];

function SamplePreview({ sample }: { sample: TrackingSample }) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="mb-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {sample.group}
          </p>
          <span className="text-xs text-muted-foreground">#{sample.id}</span>
        </div>
        <h2 className="font-serif text-xl tracking-tight">{sample.name}</h2>
        <p className="text-sm text-muted-foreground">{sample.summary}</p>
      </div>
      {sample.render(DEMO_QUESTION)}
    </article>
  );
}

export default async function QuestionProgressDesignSamplesPage() {
  const featuredQuestions = await listFeaturedQuestions(1);
  const previewQuestion = featuredQuestions[0]
    ? await getQuestionBySlug(featuredQuestions[0].slug)
    : undefined;

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Design Samples
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Read / Revisit Tracking Patterns
          </h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Reply with sample number(s), and I will apply your chosen pattern in
            question detail and question list pages.
          </p>
        </header>

        <section className="rounded-2xl border border-border/80 bg-card/60 p-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample #1 In Context (Question + Answer + Toasts)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real question content is loaded from your DB. Buttons simulate the
            exact read/revisit tracking interaction and toast feedback.
          </p>
          {previewQuestion ? (
            <article className="mt-4 rounded-2xl border border-border/80 bg-card/70 p-4 md:p-6">
              <header className="space-y-5">
                <QuestionProgressSampleOnePreview
                  categories={
                    previewQuestion.categories.length
                      ? previewQuestion.categories
                      : [previewQuestion.category]
                  }
                />
                <h3 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">
                  {previewQuestion.title}
                </h3>
                <p className="text-base leading-8 text-foreground/70 md:text-lg">
                  {previewQuestion.summary}
                </p>
              </header>

              <Separator className="my-8" />

              <MarkdownContent source={previewQuestion.answerMarkdown} />
            </article>
          ) : (
            <div className="mt-4 rounded-xl border border-border/80 bg-card/70 p-4 text-sm text-muted-foreground">
              Could not load a published question from the database for preview.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/80 bg-card/60 p-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Recommended Tracking Model
          </h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {MODEL_NOTES.map((entry) => (
              <div
                key={entry.label}
                className="rounded-lg border border-border/70 bg-background/55 p-3"
              >
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {entry.label}
                </p>
                <p className="mt-1 text-sm leading-6">{entry.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {SAMPLES.map((sample) => (
            <SamplePreview key={sample.id} sample={sample} />
          ))}
        </div>
      </section>
    </main>
  );
}
