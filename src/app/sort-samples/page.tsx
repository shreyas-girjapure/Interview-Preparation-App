"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  ListFilter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Most Popular", value: "popular" },
  { label: "Difficulty (Asc)", value: "diff_asc" },
];

export default function SortSamplesPage() {
  const [activeSort, setActiveSort] = useState("newest");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)] p-6 md:p-12 space-y-16">
      <div className="max-w-4xl mx-auto space-y-4 text-center">
        <h1 className="text-4xl font-serif">Sort UI Variations</h1>
        <p className="text-muted-foreground">
          8 different design concepts for sorting the questions list.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-2">
        {/* Sample 1: The Classic Dropdown (Native) */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            1. The Classic Native Select
          </h2>
          <p className="text-sm text-muted-foreground">
            Standard HTML select, native mobile friendly, easy to use.
          </p>
          <div className="relative w-fit">
            <select
              className="appearance-none bg-accent/50 border border-border text-sm rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by: {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          </div>
        </section>

        {/* Sample 2: Minimalist Inline Popover */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            2. Minimalist Inline Text
          </h2>
          <p className="text-sm text-muted-foreground">
            Integrates directly into a header. Unobtrusive and clean.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sorted by</span>
            <Popover>
              <PopoverTrigger className="font-medium flex items-center gap-1 hover:text-primary transition-colors">
                {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
                <ChevronDown className="size-3" />
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActiveSort(opt.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between",
                      activeSort === opt.value
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-accent/50 text-muted-foreground",
                    )}
                  >
                    {opt.label}
                    {activeSort === opt.value && <Check className="size-4" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Sample 3: Segmented Control (Pills) */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            3. Segmented Control / Tabs
          </h2>
          <p className="text-sm text-muted-foreground">
            Best when you only have 2-3 options. 1-click interaction.
          </p>
          <div className="bg-muted p-1 rounded-lg flex w-fit">
            {SORT_OPTIONS.slice(0, 3).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveSort(opt.value)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeSort === opt.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Sample 4: Filter Button with Icon */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            4. Toolbar Button (Icon Left)
          </h2>
          <p className="text-sm text-muted-foreground">
            Common in dense dashboards. Looks like another tool button.
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 bg-background">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="start">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Sort Questions
              </div>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveSort(opt.value)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2",
                    activeSort === opt.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "size-4 rounded-full border flex items-center justify-center",
                      activeSort === opt.value
                        ? "border-primary"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {activeSort === opt.value && (
                      <div className="size-2 bg-primary rounded-full" />
                    )}
                  </div>
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </section>

        {/* Sample 5: Directional Toggle + Select */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            5. Split Control (Field + Direction)
          </h2>
          <p className="text-sm text-muted-foreground">
            Advanced. Lets you pick a field, and quickly toggle asc/desc.
          </p>
          <div className="flex items-center gap-1 border rounded-lg w-fit bg-background p-1 shadow-sm">
            <select
              className="appearance-none bg-transparent text-sm px-3 py-1.5 pr-8 focus:outline-none focus:ring-0 font-medium cursor-pointer"
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value)}
            >
              <option value="date">Date Created</option>
              <option value="popularity">Popularity</option>
              <option value="difficulty">Difficulty</option>
              <option value="title">Alphabetical</option>
            </select>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-sm hover:bg-accent"
              onClick={() =>
                setDirection((d) => (d === "asc" ? "desc" : "asc"))
              }
            >
              {direction === "desc" ? (
                <ArrowDown className="size-4" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </section>

        {/* Sample 6: Hover Underline Menu */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            6. The &quot;Filter Menu&quot; Strip
          </h2>
          <p className="text-sm text-muted-foreground">
            Sits above the list as a row of subtle clickable headers.
          </p>
          <div className="flex items-center gap-6 border-b pb-2 text-sm">
            <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              Sort by
            </span>
            {SORT_OPTIONS.slice(0, 3).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveSort(opt.value)}
                className={cn(
                  "relative pb-2 transition-colors",
                  activeSort === opt.value
                    ? "text-foreground font-medium font-serif text-base"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
                {activeSort === opt.value && (
                  <span className="absolute -bottom-[9px] left-0 w-full h-[2px] bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Sample 7: Compact Icon-Only (Hover/Click to expand) */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            7. Icon-Only Trigger
          </h2>
          <p className="text-sm text-muted-foreground">
            Extremely space-efficient. Good if sort isn&apos;t changed often.
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shadow-sm border bg-background hover:bg-accent hover:text-accent-foreground group"
              >
                <ListFilter className="size-4 group-hover:text-primary transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                ORDER BY
              </p>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActiveSort(opt.value)}
                    className={cn(
                      "w-full text-left px-2 py-2 text-sm rounded-md flex items-center justify-between",
                      activeSort === opt.value
                        ? "bg-accent/60 font-medium"
                        : "hover:bg-accent/30 text-muted-foreground",
                    )}
                  >
                    {opt.label}
                    {activeSort === opt.value && (
                      <Check className="size-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </section>

        {/* Sample 8: Large "Chip/Badge" Selection */}
        <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h2 className="text-lg font-medium border-b pb-2">
            8. Expansive Chips
          </h2>
          <p className="text-sm text-muted-foreground">
            Very touch-friendly for mobile, visually distinct options.
          </p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <Badge
                key={opt.value}
                variant={activeSort === opt.value ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-sm py-1 px-3 transition-colors",
                  activeSort !== opt.value &&
                    "text-muted-foreground hover:bg-accent",
                )}
                onClick={() => setActiveSort(opt.value)}
              >
                {activeSort === opt.value && (
                  <Check className="size-3 mr-1.5 inline-block" />
                )}
                {opt.label}
              </Badge>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
