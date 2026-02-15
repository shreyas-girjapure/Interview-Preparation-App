import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RightRailRelatedQuestions,
  type RelatedQuestionMock,
} from "@/app/design/related-questions-samples/right-rail-related-questions";
import { TwoRowRelatedQuestionsCarousel } from "@/app/design/related-questions-samples/two-row-related-questions-carousel";

const PRIMARY_QUESTION = {
  title: "How does the JavaScript event loop handle microtasks and macrotasks?",
  summary:
    "Explain execution order, rendering impact, and how to reason about callback timing in production debugging.",
  estimatedMinutes: 8,
  categories: ["JavaScript", "Runtime", "Performance"],
};

const RELATED_QUESTIONS: RelatedQuestionMock[] = [
  {
    slug: "promise-all-vs-all-settled",
    title: "When to use Promise.all vs Promise.allSettled?",
    summary:
      "Compare fail-fast behavior, partial success handling, and API orchestration tradeoffs.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    reason: "Same async execution model",
    track: "direct",
  },
  {
    slug: "queue-microtask-vs-set-timeout",
    title: "queueMicrotask vs setTimeout(0): what runs first and why?",
    summary:
      "Walk through queue priority and starvation risk with practical interview examples.",
    difficulty: "Medium",
    estimatedMinutes: 5,
    reason: "Timing primitive comparison",
    track: "direct",
  },
  {
    slug: "react-useeffect-race-conditions",
    title: "How do you prevent race conditions in useEffect fetch calls?",
    summary:
      "AbortController, stale closures, and cleanup sequencing in concurrent UI updates.",
    difficulty: "Hard",
    estimatedMinutes: 9,
    reason: "Common async pitfall",
    track: "direct",
  },
  {
    slug: "debounce-vs-throttle-real-use-cases",
    title: "Debounce vs throttle with real interaction scenarios",
    summary:
      "Choose correctly for autocomplete, scroll listeners, and resize handlers.",
    difficulty: "Easy",
    estimatedMinutes: 5,
    reason: "UI responsiveness extension",
    track: "direct",
  },
  {
    slug: "request-animation-frame-best-practices",
    title: "requestAnimationFrame best practices for smooth rendering",
    summary:
      "Sync visual work to frame lifecycle and avoid dropped frames under pressure.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    reason: "Render timing connection",
    track: "direct",
  },
  {
    slug: "node-stream-backpressure-basics",
    title: "What is backpressure in Node.js streams?",
    summary:
      "Understand flow-control guarantees and memory protection in high-throughput systems.",
    difficulty: "Hard",
    estimatedMinutes: 10,
    reason: "Event loop in backend context",
    track: "broader",
  },
  {
    slug: "web-workers-vs-main-thread",
    title: "When should work move to a Web Worker?",
    summary:
      "Identify CPU-heavy tasks and balance overhead versus responsiveness gains.",
    difficulty: "Medium",
    estimatedMinutes: 8,
    reason: "Broader performance strategy",
    track: "broader",
  },
  {
    slug: "react-scheduler-priority-basics",
    title: "How React scheduling priorities affect perceived performance",
    summary:
      "Map urgent/non-urgent updates to user experience and rendering smoothness.",
    difficulty: "Hard",
    estimatedMinutes: 9,
    reason: "Framework-level scheduling",
    track: "broader",
  },
  {
    slug: "browser-render-pipeline-deep-dive",
    title: "Browser rendering pipeline deep dive",
    summary:
      "Style, layout, paint, and compositing decisions tied to runtime event ordering.",
    difficulty: "Medium",
    estimatedMinutes: 7,
    reason: "Runtime + rendering bridge",
    track: "broader",
  },
  {
    slug: "async-await-error-boundaries",
    title: "How should async/await errors be structured in production?",
    summary:
      "Operational error boundaries, retries, and observability-friendly patterns.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    reason: "Reliability follow-up",
    track: "broader",
  },
  {
    slug: "promise-cancellation-patterns",
    title: "Promise cancellation patterns in modern frontends",
    summary:
      "Abort signals, cancellable wrappers, and race-safe user interactions.",
    difficulty: "Hard",
    estimatedMinutes: 8,
    reason: "Concurrency follow-up",
    track: "direct",
  },
  {
    slug: "optimizing-input-latency",
    title: "Optimizing input latency in complex forms",
    summary:
      "Chunking work, prioritizing events, and measuring input responsiveness.",
    difficulty: "Medium",
    estimatedMinutes: 7,
    reason: "User-perceived performance",
    track: "broader",
  },
  {
    slug: "service-worker-background-sync",
    title: "Service Worker background sync interview patterns",
    summary:
      "Queue offline tasks safely and replay network mutations predictably.",
    difficulty: "Hard",
    estimatedMinutes: 9,
    reason: "Async model extension",
    track: "broader",
  },
  {
    slug: "event-delegation-scale-ui",
    title: "Event delegation patterns for large dynamic UIs",
    summary:
      "Reduce listener overhead while preserving clarity and maintainability.",
    difficulty: "Easy",
    estimatedMinutes: 5,
    reason: "Event system expansion",
    track: "direct",
  },
  {
    slug: "understanding-task-priorities",
    title: "Understanding task priorities in web runtimes",
    summary:
      "Differentiate microtask, task, and render work under real user load.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    reason: "Core concept reinforcement",
    track: "direct",
  },
  {
    slug: "monitoring-long-tasks",
    title: "Using Long Tasks API to detect UI blocking",
    summary:
      "Instrument and alert on frame-blocking script work before UX regressions ship.",
    difficulty: "Hard",
    estimatedMinutes: 8,
    reason: "Observability pathway",
    track: "broader",
  },
  {
    slug: "state-update-batching",
    title: "How state update batching impacts callback timing",
    summary:
      "Reason through flush timing in modern frameworks and avoid stale assumptions.",
    difficulty: "Medium",
    estimatedMinutes: 7,
    reason: "Framework timing tie-in",
    track: "direct",
  },
  {
    slug: "measuring-time-to-interactive",
    title: "How to measure and improve Time to Interactive",
    summary:
      "Tie runtime task pressure to startup performance and actionable budgets.",
    difficulty: "Medium",
    estimatedMinutes: 7,
    reason: "Performance systems view",
    track: "broader",
  },
];

const ANSWER_PARAGRAPHS = [
  "The event loop executes one macrotask at a time. After each macrotask, the runtime drains the microtask queue before the browser gets a chance to render the next frame.",
  "That means `Promise.then` callbacks and `queueMicrotask` run before `setTimeout` callbacks scheduled in the same cycle. In interviews, this distinction usually decides whether an answer sounds theoretical or practical.",
  "A frequent production issue is accidentally chaining too many microtasks, which delays rendering and creates visible jank. Mentioning this tradeoff demonstrates real debugging depth.",
];

function QuestionAnswerMock() {
  return (
    <article className="rounded-2xl border border-border/80 bg-card/70 p-6 md:p-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRIMARY_QUESTION.categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
        <h3 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">
          {PRIMARY_QUESTION.title}
        </h3>
        <p className="text-base leading-8 text-muted-foreground md:text-lg">
          {PRIMARY_QUESTION.summary}
        </p>
      </header>

      <Separator className="my-6" />

      <section className="space-y-5">
        <h4 className="font-serif text-2xl tracking-tight">Interview answer</h4>
        {ANSWER_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph} className="text-[15px] leading-8 md:text-base">
            {paragraph}
          </p>
        ))}
        <pre className="overflow-x-auto rounded-xl border border-border/80 bg-background p-4 text-sm leading-7">
          <code>{`console.log("A");
setTimeout(() => console.log("B timeout"), 0);
Promise.resolve().then(() => console.log("C microtask"));
console.log("D");

// Output:
// A
// D
// C microtask
// B timeout`}</code>
        </pre>
        <p className="text-[15px] leading-8 md:text-base">
          A strong close is to tie ordering rules to user impact: callback
          order affects perceived responsiveness, loading states, and whether UI
          updates feel immediate.
        </p>
      </section>
    </article>
  );
}

export default function RelatedQuestionsSamplesPage() {
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
            Question detail layouts with right-side related questions
          </h1>
          <p className="max-w-4xl text-base leading-8 text-muted-foreground md:text-lg">
            Three mocks: right rail with vertical infinite scroll, right rail
            with load more, and bottom replacement with a two-row horizontal
            related-question carousel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/design/related-topics-samples">
                Related topics samples
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/questions/salesforce-lwc-lifecycle-vs-react">
                Open current question page
              </Link>
            </Button>
          </div>
        </header>

        <Separator className="my-8" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample A: Right rail tab + vertical infinite scroll
          </h2>
          <p className="text-sm text-muted-foreground">
            Related topics section is removed from bottom. Related questions live
            in a right-side tabbed rail with incremental infinite loading.
          </p>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <QuestionAnswerMock />
            <RightRailRelatedQuestions
              questions={RELATED_QUESTIONS}
              mode="infinite"
            />
          </div>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample B: Right rail tab + Load more button
          </h2>
          <p className="text-sm text-muted-foreground">
            Same right-side structure, but with deterministic pagination via
            load-more for better control and analytics tracking.
          </p>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <QuestionAnswerMock />
            <RightRailRelatedQuestions
              questions={RELATED_QUESTIONS}
              mode="load-more"
            />
          </div>
        </section>

        <Separator className="my-10" />

        <section className="space-y-4">
          <h2 className="font-serif text-2xl tracking-tight">
            Sample C: Bottom replacement with 2-row horizontal carousel
          </h2>
          <p className="text-sm text-muted-foreground">
            Right side is removed. The old bottom related-topics area is
            replaced with related questions in a horizontal carousel where each
            slide stacks two cards vertically.
          </p>
          <div className="space-y-6">
            <QuestionAnswerMock />
            <div className="rounded-2xl border border-border/80 bg-card/60 p-4 md:p-5">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Related questions
              </p>
              <TwoRowRelatedQuestionsCarousel questions={RELATED_QUESTIONS} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
