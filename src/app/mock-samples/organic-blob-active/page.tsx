import { ActiveVADStates } from "./_components/blob-vad-states";

export const metadata = {
  title: "Organic Blob VAD States | UI Samples",
};

export default function OrganicBlobActivePage() {
  return (
    <div className="min-h-screen bg-[oklch(0.983_0.004_95)] pb-32">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,oklch(0.93_0.045_83)_0%,transparent_58%)] opacity-70" />
        <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-[oklch(0.91_0.05_62/.5)] blur-3xl" />
        <div className="absolute left-[-6rem] top-72 size-[18rem] rounded-full bg-[oklch(0.94_0.03_150/.42)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.983_0.004_95)_80%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[88rem] px-4 pt-12 md:px-8">
        <header className="mb-8 text-center">
          <h1 className="font-serif text-4xl tracking-tight text-foreground md:text-5xl">
            Live VAD Analytics
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Explore how the layout reacts dynamically to Voice Activity
            Detection (VAD) during a live session, visually changing based on
            who is speaking.
          </p>
        </header>

        <ActiveVADStates />
      </div>
    </div>
  );
}
