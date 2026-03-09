"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  defaultVoiceInterviewScenarioId,
  type VoiceInterviewMockStage,
  voiceInterviewMockScenarios,
} from "./mock-data";
import { TranscriptMockPanel } from "./transcript-mock-panel";
import { VoiceStageMock } from "./voice-stage-mock";

export function VoiceInterviewMockShowcase() {
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<VoiceInterviewMockStage>(defaultVoiceInterviewScenarioId);

  const scenario =
    voiceInterviewMockScenarios.find(
      (candidate) => candidate.id === selectedScenarioId,
    ) ?? voiceInterviewMockScenarios[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.983_0.004_95)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,oklch(0.93_0.045_83)_0%,transparent_58%)] opacity-70" />
        <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-[oklch(0.91_0.05_62/.5)] blur-3xl" />
        <div className="absolute left-[-6rem] top-72 size-[18rem] rounded-full bg-[oklch(0.94_0.03_150/.42)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.983_0.004_95)_80%)]" />
      </div>

      <section className="relative mx-auto w-full max-w-[92rem] px-4 py-6 md:px-8 md:py-8">
        <header className="page-copy-enter rounded-[2rem] border border-border/70 bg-background/88 p-5 shadow-[0_24px_80px_-40px_rgba(67,53,32,0.45)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">US-04 approval gate</Badge>
                <Badge variant="secondary">Mock route only</Badge>
                <Badge variant="outline">Topic-scoped interview</Badge>
              </div>

              <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-6xl">
                Review the voice stage first, then we wire the real UI later.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                This gate is intentionally simple. It uses local fixtures to
                review the core voice stage, compact controls, readable
                transcript support, and state changes before we start the real
                UI stories.
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

          <div className="mt-6 rounded-[1.8rem] border border-border/70 bg-card/80 p-4 md:p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              Review states
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {voiceInterviewMockScenarios.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={candidate.id === scenario.id}
                  onClick={() => setSelectedScenarioId(candidate.id)}
                  className={cn(
                    "rounded-[1.4rem] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    candidate.id === scenario.id
                      ? "border-primary/30 bg-primary/[0.07] shadow-sm"
                      : "border-border/70 bg-background/78 hover:bg-accent",
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {candidate.eyebrow}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight">
                    {candidate.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {candidate.stateNote}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">
              Focus this review on the stage itself: explicit start behavior,
              live-state clarity, supported prompts, compact controls, and the
              transcript staying visible as supporting context.
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_24rem]">
          <VoiceStageMock scenario={scenario} />
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <TranscriptMockPanel scenario={scenario} />
          </aside>
        </div>
      </section>
    </main>
  );
}
