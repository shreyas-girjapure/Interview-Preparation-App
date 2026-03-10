"use client";

import { AudioLines, Clock3, Mic, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mockSession = {
  connectionLabel: "Connected and listening",
  micLabel: "Unmuted",
  elapsedLabel: "04:20",
  transcriptCountLabel: "12 messages",
};

type StatusRowProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

function StatusRow({
  icon: Icon,
  label,
  value,
  className,
  iconClassName,
  textClassName,
}: StatusRowProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground",
          iconClassName,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-sm leading-6 text-foreground",
            textClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function Sample1Glassmorphism() {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-serif">1. Glassmorphism</h2>
      <section className="overflow-hidden rounded-[2rem] border border-white/40 bg-white/10 p-1 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl">
        <div className="grid gap-5 rounded-[1.8rem] bg-white/40 px-5 py-6 md:px-6 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-[1.8rem] border border-white/50 bg-white/30 px-6 py-7 text-center shadow-sm backdrop-blur-md md:px-8 md:py-8 border-b-white/20 border-r-white/20">
            <div className="flex justify-end relative z-10">
              <Button
                size="icon-sm"
                variant="outline"
                className="rounded-full border-rose-500/30 bg-white/20 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute inset-0 rounded-full bg-blue-400/10 blur-2xl" />
              <div className="absolute size-[92%] rounded-full border border-white/60 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] motion-safe:animate-pulse" />
              <div className="absolute size-[74%] rounded-full border border-white/70 shadow-[inset_0_0_15px_rgba(255,255,255,0.6)] motion-safe:animate-pulse [animation-delay:180ms]" />
              <div className="absolute size-[56%] rounded-full border border-white/80 shadow-[inset_0_0_10px_rgba(255,255,255,0.7)] motion-safe:animate-pulse [animation-delay:320ms]" />
              <button className="relative flex size-[42%] items-center justify-center rounded-full border border-white/50 bg-white/40 text-blue-900 shadow-[0_8px_32px_0_rgba(31,38,135,0.15),inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-lg transition-transform hover:scale-[1.03]">
                <Mic className="size-14 opacity-80" />
              </button>
            </div>
          </div>
          <div className="rounded-[1.55rem] border border-white/50 bg-white/30 p-4 shadow-sm backdrop-blur-md border-b-white/20 border-r-white/20">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Session status
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-white/40 border-white/60 text-slate-700"
                textClassName="text-slate-800"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-white/40 border-white/60 text-slate-700"
                textClassName="text-slate-800"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-white/40 border-white/60 text-slate-700"
                textClassName="text-slate-800"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample2NeoBrutalism() {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-serif font-bold tracking-tight text-neutral-900">
        2. Neo-Brutalism
      </h2>
      <section className="overflow-hidden rounded-[1rem] border-4 border-black bg-yellow-100 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-[1rem] border-4 border-black bg-white px-6 py-7 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:px-8 md:py-8">
            <div className="flex justify-end">
              <Button
                size="icon-sm"
                className="rounded-none border-2 border-black bg-red-400 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-red-500 hover:translate-y-px hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-[92%] rounded-full border-4 border-black motion-safe:animate-pulse" />
              <div className="absolute size-[74%] rounded-full border-4 border-black motion-safe:animate-pulse [animation-delay:180ms]" />
              <div className="absolute size-[56%] rounded-full border-4 border-black motion-safe:animate-pulse [animation-delay:320ms]" />
              <button className="relative flex size-[42%] items-center justify-center rounded-full border-4 border-black bg-indigo-400 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                <Mic className="size-14" />
              </button>
            </div>
          </div>
          <div className="rounded-[1rem] border-4 border-black bg-pink-200 p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <div>
              <p className="text-sm font-bold uppercase text-black">
                Session status
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-black">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-white border-2 border-black rounded-none text-black"
                textClassName="font-bold text-black"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-white border-2 border-black rounded-none text-black"
                textClassName="font-bold text-black"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-white border-2 border-black rounded-none text-black"
                textClassName="font-bold text-black"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample3MinimalistWireframe() {
  return (
    <div className="mb-16 border-b border-border/40 pb-16">
      <h2 className="mb-4 text-2xl font-serif text-neutral-600">
        3. Minimalist Wireframe
      </h2>
      <section className="overflow-hidden bg-transparent">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-3xl border border-neutral-300 bg-white/40 px-6 py-7 text-center backdrop-blur-sm md:px-8 md:py-8">
            <div className="flex justify-end text-neutral-400">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-full border border-neutral-200 text-neutral-500 hover:text-neutral-900"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-[92%] rounded-full border border-neutral-200 motion-safe:animate-ping [animation-duration:4s]" />
              <div className="absolute size-[74%] rounded-full border border-neutral-200 motion-safe:animate-ping [animation-delay:1000ms] [animation-duration:4s]" />
              <div className="absolute size-[56%] rounded-full border border-neutral-200 motion-safe:animate-ping [animation-delay:2000ms] [animation-duration:4s]" />
              <button className="relative flex size-[42%] items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition-transform hover:scale-105 hover:border-neutral-400 hover:text-neutral-900">
                <Mic className="size-14 stroke-[1.5px]" />
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-neutral-300 bg-white/40 p-6 backdrop-blur-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                Session status
              </p>
              <p className="text-sm font-medium leading-6 text-neutral-800">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-transparent border-neutral-300 text-neutral-600"
                textClassName="text-neutral-800 font-medium"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-transparent border-neutral-300 text-neutral-600"
                textClassName="text-neutral-800 font-medium"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-transparent border-neutral-300 text-neutral-600"
                textClassName="text-neutral-800 font-medium"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample4SoftNeumorphism() {
  return (
    <div className="mb-16 overflow-hidden rounded-[3rem] bg-[#e0e5ec] p-6 pb-8 shadow-[inset_0_0_20px_rgba(163,177,198,0.2)]">
      <h2 className="mb-4 pl-4 text-2xl font-serif text-[#4a5568]">
        4. Soft Neumorphism
      </h2>
      <section className="overflow-hidden">
        <div className="grid gap-8 xl:gap-10 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-[2.5rem] bg-[#e0e5ec] px-6 py-7 text-center shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.7)] md:px-8 md:py-8 xl:m-2">
            <div className="flex justify-end">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-full text-rose-500 shadow-[inset_4px_4px_8px_rgb(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] hover:bg-transparent hover:text-rose-600 active:shadow-[inset_6px_6px_12px_rgb(163,177,198,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-[92%] rounded-full shadow-[4px_4px_10px_rgb(163,177,198,0.3),-4px_-4px_10px_rgba(255,255,255,0.6)] motion-safe:animate-pulse" />
              <div className="absolute size-[74%] rounded-full shadow-[4px_4px_10px_rgb(163,177,198,0.3),-4px_-4px_10px_rgba(255,255,255,0.6)] motion-safe:animate-pulse [animation-delay:180ms]" />
              <div className="absolute size-[56%] rounded-full shadow-[4px_4px_10px_rgb(163,177,198,0.3),-4px_-4px_10px_rgba(255,255,255,0.6)] motion-safe:animate-pulse [animation-delay:320ms]" />
              <button className="relative flex size-[42%] items-center justify-center rounded-full bg-[#e0e5ec] text-[#4a5568] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.7)] transition-all hover:shadow-[6px_6px_12px_rgb(163,177,198,0.6),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:text-blue-500 active:shadow-[inset_6px_6px_10px_rgb(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.9)]">
                <Mic className="size-14" />
              </button>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#e0e5ec] p-6 shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.7)] xl:my-2 xl:mr-2">
            <div>
              <p className="text-sm font-medium text-[#4a5568]">
                Session status
              </p>
              <p className="mt-1 text-sm leading-6 text-[#718096]">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-6 space-y-5">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-[#e0e5ec] border-none shadow-[4px_4px_8px_rgb(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)] text-[#4a5568]"
                textClassName="text-[#2d3748]"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-[#e0e5ec] border-none shadow-[4px_4px_8px_rgb(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)] text-[#4a5568]"
                textClassName="text-[#2d3748]"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-[#e0e5ec] border-none shadow-[4px_4px_8px_rgb(163,177,198,0.5),-4px_-4px_8px_rgba(255,255,255,0.8)] text-[#4a5568]"
                textClassName="text-[#2d3748]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample5DarkCyberpunk() {
  return (
    <div className="mb-16 overflow-hidden rounded-[2.5rem] bg-zinc-950 p-6 shadow-2xl">
      <h2 className="mb-6 ml-2 text-2xl font-serif text-cyan-400">
        5. Cyberpunk Neon
      </h2>
      <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-zinc-900/50">
        <div className="grid gap-1 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="border border-cyan-500/10 bg-black/40 px-6 py-7 text-center md:px-8 md:py-8 xl:m-4 xl:rounded-2xl xl:border-cyan-500/20 xl:shadow-[10px_0_30px_-15px_rgba(34,211,238,0.2)]">
            <div className="flex justify-end">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded border border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-[40px]" />
              <div className="absolute size-[92%] rounded-full border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] motion-safe:animate-pulse" />
              <div className="absolute size-[74%] rounded-full border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] motion-safe:animate-pulse [animation-delay:180ms]" />
              <div className="absolute size-[56%] rounded-full border border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.3)] motion-safe:animate-pulse [animation-delay:320ms]" />
              <button className="relative flex size-[42%] items-center justify-center rounded-full bg-cyan-950/80 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.3),inset_0_0_10px_rgba(34,211,238,0.5)] backdrop-blur-sm transition-all hover:scale-105 hover:bg-cyan-900 hover:shadow-[0_0_40px_rgba(34,211,238,0.5),inset_0_0_15px_rgba(34,211,238,0.7)]">
                <Mic className="size-14" />
              </button>
            </div>
          </div>
          <div className="bg-zinc-900 p-6 xl:border-l xl:border-cyan-500/10">
            <div>
              <p className="text-xs font-mono text-cyan-500/70">
                {">"} SESSION_STATUS
              </p>
              <p className="mt-1 font-mono text-sm leading-6 text-cyan-300">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-black border-cyan-500/30 text-cyan-400 rounded-none transform rotate-45 [&>svg]:-rotate-45"
                textClassName="text-zinc-300 font-mono text-xs"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-black border-cyan-500/30 text-cyan-400 rounded-none transform rotate-45 [&>svg]:-rotate-45"
                textClassName="text-zinc-300 font-mono text-xs"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-black border-cyan-500/30 text-cyan-400 rounded-none transform rotate-45 [&>svg]:-rotate-45"
                textClassName="text-zinc-300 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample6OrganicBlob() {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-serif text-emerald-900">
        6. Organic Blobs
      </h2>
      <section className="overflow-hidden rounded-[3rem] border-none bg-emerald-50 shadow-xl shadow-emerald-900/5">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="bg-emerald-100/50 px-6 py-7 text-center md:px-8 md:py-10">
            <div className="flex justify-end relative z-10">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-2xl bg-white/50 text-emerald-700 hover:bg-emerald-200"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-[92%] animate-spin [animation-duration:8s] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-emerald-200/40" />
              <div className="absolute size-[74%] animate-spin [animation-duration:12s] [animation-direction:reverse] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-emerald-300/40" />
              <div className="absolute size-[56%] animate-spin [animation-duration:10s] rounded-[40%_60%_70%_30%/50%_60%_30%_60%] bg-emerald-400/40" />
              <button className="relative flex size-[42%] items-center justify-center rounded-[50%_50%_40%_60%/60%_40%_60%_40%] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_10px_20px_-10px_rgba(4,120,87,0.5)] transition-transform hover:scale-105 active:scale-95">
                <Mic className="size-14" />
              </button>
            </div>
          </div>
          <div className="bg-white/60 p-6 md:p-8 xl:rounded-bl-[3rem] xl:rounded-tl-none border-t border-emerald-100 xl:border-t-0 xl:border-l">
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Session status
              </p>
              <p className="mt-1 text-sm leading-6 text-emerald-600">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-emerald-100 border-none text-emerald-700 rounded-[40%_60%_70%_30%/50%_60%_30%_60%]"
                textClassName="text-emerald-900"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-emerald-100 border-none text-emerald-700 rounded-[50%_50%_40%_60%/60%_40%_60%_40%]"
                textClassName="text-emerald-900"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-emerald-100 border-none text-emerald-700 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"
                textClassName="text-emerald-900"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample7RadarSweep() {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-serif text-indigo-950">
        7. Radar Sweep
      </h2>
      <section className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl shadow-indigo-900/5">
        <div className="grid gap-5 px-5 py-6 md:px-6 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-[1.25rem] border border-indigo-50 bg-slate-50 px-6 py-7 text-center md:px-8 md:py-8">
            <div className="flex justify-end">
              <Button
                size="icon-sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-rose-500"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center overflow-hidden rounded-full border border-indigo-100 bg-indigo-50/50 shadow-inner md:size-[22rem] xl:size-[25rem]">
              {/* Radar sweep */}
              <div className="absolute inset-0 origin-center animate-spin [animation-duration:4s] rounded-full bg-[conic-gradient(from_0deg,transparent_70%,rgba(99,102,241,0.2)_95%,rgba(99,102,241,0.6)_100%)]" />

              {/* Radar lines */}
              <div className="absolute inset-0 rounded-full border border-indigo-200/50" />
              <div className="absolute size-[66%] rounded-full border border-indigo-200/50" />
              <div className="absolute size-[33%] rounded-full border border-indigo-200/50" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-indigo-200/50" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-indigo-200/50" />

              <button className="relative flex size-[28%] items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-110">
                <Mic className="size-10" />
              </button>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-indigo-50 bg-slate-50 p-6">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                Status Grid
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-indigo-950">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-indigo-100 border-none text-indigo-600"
                textClassName="text-indigo-950 font-medium"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-indigo-100 border-none text-indigo-600"
                textClassName="text-indigo-950 font-medium"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-indigo-100 border-none text-indigo-600"
                textClassName="text-indigo-950 font-medium"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample8CinematicGradient() {
  return (
    <div className="mb-16">
      <h2 className="mb-4 text-2xl font-serif text-fuchsia-950">
        8. Cinematic Gradient
      </h2>
      <section className="overflow-hidden rounded-[2.5rem] border border-white bg-white p-2 shadow-2xl shadow-fuchsia-200/40">
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="rounded-[2rem] bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-fuchsia-50/50 px-6 py-7 text-center md:px-8 md:py-8 border border-fuchsia-100/30 shadow-inner">
            <div className="flex justify-end relative z-10">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-full bg-white/60 text-fuchsia-800 hover:bg-white hover:text-rose-500 shadow-sm"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-[56%] animate-spin [animation-duration:6s] rounded-full bg-[conic-gradient(from_0deg,theme(colors.indigo.400),theme(colors.purple.400),theme(colors.fuchsia.400),theme(colors.indigo.400))] blur-md opacity-70" />
              <div className="absolute size-[52%] animate-spin [animation-duration:6s] rounded-full bg-[conic-gradient(from_0deg,theme(colors.indigo.500),theme(colors.purple.500),theme(colors.fuchsia.500),theme(colors.indigo.500))]" />
              <div className="absolute size-[49%] rounded-full bg-white" />
              <button className="relative flex size-[45%] items-center justify-center rounded-full bg-white text-fuchsia-600 shadow-inner transition-transform hover:scale-95 active:bg-slate-50">
                <Mic className="size-[3.5rem]" />
              </button>
            </div>
          </div>
          <div className="rounded-[2rem] border border-fuchsia-50/50 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-fuchsia-400">
                Session status
              </p>
              <p className="mt-1 text-sm font-medium leading-6 bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-fuchsia-50 border-none text-fuchsia-600"
                textClassName="text-slate-800 font-medium"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-purple-50 border-none text-purple-600"
                textClassName="text-slate-800 font-medium"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-indigo-50 border-none text-indigo-600"
                textClassName="text-slate-800 font-medium"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Sample9EchoRipple() {
  return (
    <div className="mb-24">
      <h2 className="mb-4 text-2xl font-serif text-teal-900">9. Echo Ripple</h2>
      <section className="overflow-hidden rounded-[2.5rem] bg-slate-50 border border-slate-200/50 shadow-lg">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.48fr)_17rem]">
          <div className="px-6 py-7 text-center md:px-8 md:py-8">
            <div className="flex justify-end relative z-10">
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-full text-slate-400 border border-transparent hover:border-slate-200 hover:bg-slate-100 hover:text-slate-600"
                aria-label="End"
              >
                <PhoneOff className="size-4" />
              </Button>
            </div>
            <div className="relative mx-auto mt-8 flex size-72 items-center justify-center md:size-[22rem] xl:size-[25rem]">
              <div className="absolute size-full rounded-full border border-teal-200 animate-ping [animation-duration:3s] [animation-direction:reverse]" />
              <div className="absolute size-[80%] rounded-full border border-teal-300 animate-ping [animation-duration:3s] [animation-direction:reverse] [animation-delay:1s]" />
              <div className="absolute size-[60%] rounded-full border border-teal-400 animate-ping [animation-duration:3s] [animation-direction:reverse] [animation-delay:2s]" />
              <button className="relative flex size-[30%] items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 transition-all hover:scale-110 hover:shadow-teal-500/50 active:scale-95">
                <Mic className="size-10" />
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8 border-t border-slate-200 xl:border-t-0 xl:border-l bg-white/50">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Session status
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-teal-700">
                {mockSession.connectionLabel}
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <StatusRow
                icon={Mic}
                label="Microphone"
                value={mockSession.micLabel}
                iconClassName="bg-white border text-teal-600 shadow-sm"
                textClassName="text-slate-700"
              />
              <StatusRow
                icon={Clock3}
                label="Elapsed"
                value={mockSession.elapsedLabel}
                iconClassName="bg-white border text-teal-600 shadow-sm"
                textClassName="text-slate-700"
              />
              <StatusRow
                icon={AudioLines}
                label="Transcript"
                value={mockSession.transcriptCountLabel}
                iconClassName="bg-white border text-teal-600 shadow-sm"
                textClassName="text-slate-700"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function DesignSamples() {
  return (
    <div className="space-y-24">
      <Sample1Glassmorphism />
      <Sample2NeoBrutalism />
      <Sample3MinimalistWireframe />
      <Sample4SoftNeumorphism />
      <Sample5DarkCyberpunk />
      <Sample6OrganicBlob />
      <Sample7RadarSweep />
      <Sample8CinematicGradient />
      <Sample9EchoRipple />
    </div>
  );
}
