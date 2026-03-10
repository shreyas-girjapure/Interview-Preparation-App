import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type VoiceInterviewShellProps = {
  backHref: string;
  description: string;
  scopeLabel: string;
  scopeTitle: string;
  transcript: ReactNode;
  stage: ReactNode;
  previewLabel?: string;
  runtimeLabel?: string;
};

export function VoiceInterviewShell({
  backHref,
  description,
  scopeLabel,
  scopeTitle,
  transcript,
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

      <section className="relative z-10 mx-auto w-full max-w-[88rem] px-4 pt-12 pb-6 md:px-8 md:pb-8">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4 z-20 gap-2 text-muted-foreground hover:text-foreground md:left-8 md:top-8"
        >
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Back to topic
          </Link>
        </Button>

        <header className="mb-8 text-center md:mb-12">
          <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            {scopeTitle} mock interview
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        </header>

        <div className="mx-auto max-w-4xl space-y-4">
          <div>{stage}</div>
          <div>{transcript}</div>
        </div>
      </section>
    </main>
  );
}
