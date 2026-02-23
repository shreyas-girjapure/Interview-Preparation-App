import { BrandLogo } from "@/components/brand-logo";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center">
        <BrandLogo className="size-20 sm:size-24 text-foreground/80 animate-pulse" />
        <div
          className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"
          style={{ width: "130%", height: "130%", top: "-15%", left: "-15%" }}
        ></div>
        {/* Adds an inner spinner in the opposite direction for movement */}
        <div
          className="absolute inset-0 rounded-full border-b-2 border-muted-foreground/30 animate-[spin_1.5s_linear_infinite_reverse]"
          style={{ width: "130%", height: "130%", top: "-15%", left: "-15%" }}
        ></div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground/80 mt-4 animate-pulse">
          Interview Prep
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground tracking-[0.2em] uppercase mt-2 animate-pulse">
          Loading Application
        </p>
      </div>
    </div>
  );
}
