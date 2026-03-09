import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  Clock3,
  ExternalLink,
  Flame,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  ShieldCheck,
  Sparkles,
  User,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Voice Interview Mock | Interview Prep",
  description: "Static mock page for the immersive voice interview concept.",
};

type TranscriptItem = {
  id: string;
  speaker: "assistant" | "user" | "system";
  label: string;
  text: string;
  meta: string;
};

const starterPrompts = [
  "Start with a quick warm-up question",
  "Push deeper into tradeoffs and edge cases",
  "Ask one recent-changes follow-up with sources",
];

const questionMap = [
  "Explain what a closure captures and when it is created.",
  "Compare closure-based privacy with class private fields.",
  "Describe a stale closure bug in React and how to avoid it.",
  "Talk through performance costs and memory retention risks.",
];

const transcript: TranscriptItem[] = [
  {
    id: "intro",
    speaker: "assistant",
    label: "Interviewer",
    text: "We are staying inside JavaScript closures today. Start simple: what is a closure, and why do interviewers care about it beyond the textbook definition?",
    meta: "00:04",
  },
  {
    id: "user-1",
    speaker: "user",
    label: "You",
    text: "A closure is when a function keeps access to variables from the lexical scope where it was created, even after that outer function has returned.",
    meta: "00:17",
  },
  {
    id: "assistant-1",
    speaker: "assistant",
    label: "Interviewer",
    text: "Good baseline. Now make it practical. Give me a production example where that behavior is useful, and then tell me how the same mechanism can accidentally keep memory alive longer than expected.",
    meta: "00:26",
  },
  {
    id: "system-1",
    speaker: "system",
    label: "Recent changes result",
    text: "When asked for recent framework changes, the coach responds with a short grounded summary and visible sources instead of drifting into general browsing.",
    meta: "Scoped recency rule",
  },
  {
    id: "user-2",
    speaker: "user",
    label: "You",
    text: "A stale closure in a React effect is a good example. The callback captures an old value, then the UI behaves correctly sometimes and incorrectly under updates.",
    meta: "00:42",
  },
];

const citations = [
  {
    label: "React docs",
    source: "Synchronizing with Effects",
    href: "https://react.dev/learn/synchronizing-with-effects",
  },
  {
    label: "MDN",
    source: "Closures",
    href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
  },
];

function TranscriptBubble({ item }: { item: TranscriptItem }) {
  const isAssistant = item.speaker === "assistant";
  const isSystem = item.speaker === "system";

  return (
    <article
      className={[
        "rounded-[1.4rem] border p-4 shadow-sm",
        isSystem
          ? "border-amber-200/80 bg-amber-50/90"
          : isAssistant
            ? "border-border/70 bg-card/95"
            : "border-primary/15 bg-primary/[0.06]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={[
              "inline-flex size-8 items-center justify-center rounded-full border",
              isSystem
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : isAssistant
                  ? "border-border bg-muted text-foreground"
                  : "border-primary/20 bg-primary/10 text-primary",
            ].join(" ")}
          >
            {isSystem ? (
              <Sparkles className="size-4" />
            ) : isAssistant ? (
              <Bot className="size-4" />
            ) : (
              <User className="size-4" />
            )}
          </span>
          <span>{item.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{item.meta}</span>
      </div>
      <p className="mt-3 text-sm leading-7 text-foreground/90 md:text-[15px]">
        {item.text}
      </p>
    </article>
  );
}

export default function VoiceInterviewMockPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.983_0.004_95)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle_at_top,oklch(0.93_0.045_83)_0%,transparent_58%)] opacity-70" />
        <div className="absolute right-[-8rem] top-28 size-[22rem] rounded-full bg-[oklch(0.91_0.05_62/.55)] blur-3xl" />
        <div className="absolute left-[-6rem] top-64 size-[18rem] rounded-full bg-[oklch(0.94_0.03_150/.45)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.983_0.004_95)_80%)]" />
      </div>

      <section className="relative mx-auto w-full max-w-[92rem] px-4 py-6 md:px-8 md:py-8">
        <header className="page-copy-enter rounded-[2rem] border border-border/70 bg-background/88 p-5 shadow-[0_24px_80px_-40px_rgba(67,53,32,0.45)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Mock concept</Badge>
                <Badge variant="secondary">Topic scope</Badge>
                <Badge variant="outline">JavaScript Closures</Badge>
              </div>

              <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-6xl">
                Immersive voice interview with a visible transcript and grounded
                coaching.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                This is a static mock of the topic interview route. The goal is
                to preview the feel of a focused speaking environment without
                wiring any SDK or persistence yet.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button asChild variant="ghost" size="lg">
                <Link href="/home-mocks">
                  <ArrowLeft className="size-4" />
                  All mocks
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/topics">
                  Real app
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Radio className="size-4" />
                Current state
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex size-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                <p className="text-lg font-semibold tracking-tight">Live</p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                Elapsed
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight">08:42</p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AudioLines className="size-4" />
                Transcript
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                12 turns captured
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-card/80 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="size-4" />
                Focus score
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                92% on-topic
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)_24rem]">
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[1.8rem] border border-border/70 bg-background/90 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                Session briefing
              </div>
              <h2 className="mt-3 font-serif text-3xl tracking-tight">
                Closures under interview pressure
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The interviewer is focused on conceptual accuracy, practical
                examples, stale closure bugs, and how confidently you navigate
                follow-up tradeoffs.
              </p>

              <Separator className="my-5" />

              <div>
                <p className="text-sm font-medium">Question map</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  {questionMap.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 size-1.5 rounded-full bg-primary/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-border/70 bg-card/85 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                Starter prompts
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-border/70 bg-background px-3 py-2 text-left text-sm leading-5 text-foreground transition-colors hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(160deg,rgba(255,252,248,0.96),rgba(249,244,236,0.96))] shadow-[0_26px_90px_-50px_rgba(70,45,26,0.5)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 md:px-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Voice stage</Badge>
                    <Badge variant="outline">Assistant speaking</Badge>
                  </div>
                  <h2 className="mt-2 font-serif text-3xl tracking-tight">
                    Focused, oral, and visibly alive
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-900">
                  Microphone connected
                </div>
              </div>

              <div className="grid gap-8 px-5 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex min-h-[25rem] flex-col items-center justify-center rounded-[1.8rem] border border-border/60 bg-background/75 px-6 py-8 text-center">
                  <div className="relative flex size-64 items-center justify-center md:size-72">
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(205,143,82,0.22)_0%,rgba(205,143,82,0)_68%)] blur-xl" />
                    <div className="absolute size-[92%] rounded-full border border-[oklch(0.81_0.035_72/.55)] animate-pulse" />
                    <div className="absolute size-[74%] rounded-full border border-[oklch(0.76_0.05_62/.45)] animate-pulse [animation-delay:220ms]" />
                    <div className="absolute size-[56%] rounded-full border border-[oklch(0.71_0.07_58/.35)] animate-pulse [animation-delay:380ms]" />
                    <div className="relative flex size-[42%] items-center justify-center rounded-full bg-[linear-gradient(180deg,oklch(0.31_0.03_68),oklch(0.25_0.025_72))] text-white shadow-[0_18px_50px_-20px_rgba(46,32,18,0.85)]">
                      <Waves className="size-14" />
                    </div>
                  </div>

                  <p className="mt-6 font-serif text-3xl tracking-tight">
                    &ldquo;Make it practical, not theoretical.&rdquo;
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    The mock stage keeps the voice interaction central while
                    still surfacing state, scope, and transcript context around
                    it.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">
                      Active scope
                    </p>
                    <p className="mt-2 font-semibold tracking-tight">
                      Topic: JavaScript Closures
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Follow-ups stay inside closures, stale callbacks,
                      component effects, and interview-grade tradeoffs.
                    </p>
                  </div>

                  <div className="rounded-[1.6rem] border border-border/60 bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">
                      Interviewer style
                    </p>
                    <p className="mt-2 font-semibold tracking-tight">
                      Calm, precise, mildly challenging
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button size="lg" className="min-w-[8rem] rounded-full">
                      <MicOff className="size-4" />
                      Mute
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="min-w-[8rem] rounded-full"
                    >
                      <Mic className="size-4" />
                      Push to speak
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="min-w-[8rem] rounded-full border-destructive/25 text-destructive hover:text-destructive"
                    >
                      <PhoneOff className="size-4" />
                      End
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-border/70 bg-background/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="size-4" />
                    Recent-changes answer treatment
                  </div>
                  <h2 className="mt-2 font-serif text-3xl tracking-tight">
                    Scoped answer with visible sources
                  </h2>
                </div>
                <Badge variant="outline">Mock citation card</Badge>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground md:text-base">
                If the user asks what changed recently in React around stale
                closure pitfalls, the answer can stay concise and grounded, then
                drop back into the interview without turning into a general
                assistant.
              </p>

              <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-card/80 p-4">
                <p className="text-sm leading-7 text-foreground/90">
                  React guidance increasingly emphasizes effect dependencies,
                  event separation, and avoiding stale reads by structuring
                  logic so callbacks always see current state. The interviewer
                  would summarize that briefly, cite the source, and then ask
                  you to connect it back to closures in production code.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {citations.map((citation) => (
                    <a
                      key={citation.href}
                      href={citation.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{citation.label}</span>
                      <span className="text-muted-foreground">
                        {citation.source}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,241,234,0.96))] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Flame className="size-4" />
                    Debrief preview
                  </div>
                  <h2 className="mt-2 font-serif text-3xl tracking-tight">
                    Short, useful, and immediately actionable
                  </h2>
                </div>
                <Badge variant="secondary">Post-session mock</Badge>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="rounded-[1.5rem] border border-border/70 bg-background/85 p-4">
                  <p className="text-sm font-medium">What went well</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Your explanation was accurate, concise, and strongest when
                    you tied closures to stale effect bugs instead of staying at
                    the lexical-scope definition level.
                  </p>

                  <p className="mt-5 text-sm font-medium">What to sharpen</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Add one tighter example comparing closure-based module
                    privacy with class private fields, then practice answering
                    memory-retention follow-ups in under 30 seconds.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[1.5rem] border border-border/70 bg-card/85 p-4">
                    <p className="text-sm text-muted-foreground">
                      Strength signal
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      4 / 5
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/70 bg-card/85 p-4">
                    <p className="text-sm text-muted-foreground">Best moment</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      &ldquo;A stale closure in a React effect...&rdquo;
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-border/70 bg-card/85 p-4">
                    <p className="text-sm text-muted-foreground">Next drill</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      Timed follow-ups on hooks and event handlers.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </section>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[1.8rem] border border-border/70 bg-background/92 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AudioLines className="size-4" />
                    Live transcript
                  </div>
                  <h2 className="mt-2 font-serif text-3xl tracking-tight">
                    Always readable
                  </h2>
                </div>
                <Badge variant="outline">Auto-scroll on</Badge>
              </div>

              <div className="mt-5 space-y-4">
                {transcript.map((item) => (
                  <TranscriptBubble key={item.id} item={item} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
