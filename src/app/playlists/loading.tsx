import { BrandLogo } from "@/components/brand-logo";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)] flex flex-col items-center justify-center pb-32 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        <BrandLogo className="size-20 sm:size-24 text-foreground/80 animate-pulse" />
        <div
          className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"
          style={{ width: "130%", height: "130%", top: "-15%", left: "-15%" }}
        ></div>
        <div
          className="absolute inset-0 rounded-full border-b-2 border-muted-foreground/30 animate-[spin_1.5s_linear_infinite_reverse]"
          style={{ width: "130%", height: "130%", top: "-15%", left: "-15%" }}
        ></div>
      </div>
      <div className="flex flex-col items-center gap-1 mt-6">
        <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-foreground/80 animate-pulse">
          Playlists
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground tracking-[0.2em] uppercase mt-2 animate-pulse">
          Loading Playlists...
        </p>
      </div>
    </main>
  );
}
