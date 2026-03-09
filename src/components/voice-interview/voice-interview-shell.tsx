import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type VoiceInterviewShellProps = {
  backHref: string;
  description: string;
  scopeLabel: string;
  scopeTitle: string;
  stageLabel: string;
  transcript: ReactNode;
  briefing: ReactNode;
  stage: ReactNode;
  previewLabel?: string;
  runtimeLabel?: string;
};

export function VoiceInterviewShell({
  backHref,
  description,
  scopeLabel,
  scopeTitle,
  stageLabel,
  transcript,
  briefing,
  stage,
  previewLabel,
  runtimeLabel = "Local voice-state adapter",
}: VoiceInterviewShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.983_0.004_95)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,oklch(0.93_0.045_83)_0%,transparent_58%)] opacity-70" />
        <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-[oklch(0.91_0.05_62/.5)] blur-3xl" />
        <div className="absolute left-[-6rem] top-72 size-[18rem] rounded-full bg-[oklch(0.94_0.03_150/.42)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.983_0.004_95)_80%)]" />
      </div>

      <section className="relative mx-auto w-full max-w-[96rem] px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-[2rem] border border-border/70 bg-background/88 p-5 shadow-[0_24px_80px_-40px_rgba(67,53,32,0.45)] backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Immersive route</Badge>
                <Badge variant="secondary">{scopeLabel}</Badge>
                <Badge variant="outline">{stageLabel}</Badge>
                {previewLabel ? (
                  <Badge variant="outline">{previewLabel}</Badge>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-tight tracking-tight md:text-6xl">
                {scopeTitle} mock interview
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                {description}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Button asChild variant="ghost" size="lg">
                <Link href={backHref}>
                  <ArrowLeft className="size-4" />
                  Back to topic
                </Link>
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/75 px-4 py-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                {runtimeLabel}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[18.5rem_minmax(0,1fr)_24rem]">
          <aside className="order-3 xl:order-1 xl:sticky xl:top-6 xl:self-start">
            {briefing}
          </aside>
          <div className="order-1 xl:order-2">{stage}</div>
          <aside className="order-2 xl:order-3 xl:sticky xl:top-6 xl:self-start">
            {transcript}
          </aside>
        </div>
      </section>
    </main>
  );
}
