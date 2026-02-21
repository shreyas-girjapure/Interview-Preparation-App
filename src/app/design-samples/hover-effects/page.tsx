"use client";

import { ArrowRight, Bookmark, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ExtendedHoverEffectsSamplePage() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["All Questions", "Bookmarks", "Completed"];

  return (
    <div className="container mx-auto py-12 px-4 space-y-16 max-w-5xl">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Extended Interaction Design Samples
        </h1>
        <p className="text-muted-foreground text-lg">
          These samples combine your chosen Card ("Neon Focus") and Button
          ("Lift") styles, along with new suggestions like staggered page
          entries, input focus states, micro-interactions, and tab sliding.
        </p>
      </div>

      <div className="space-y-8 border-b pb-12">
        <h2 className="text-2xl font-semibold">
          1. Staggered Page Entry (Cards)
        </h2>
        <p className="text-muted-foreground">
          Chosen "Neon Focus" Cards animating in one by one. This happens
          automatically on page load.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Link
              key={i}
              href="#"
              className="group block p-6 bg-card rounded-2xl border border-border transition-all duration-300 ease-out hover:border-primary/50 hover:shadow-[0_0_20px_rgba(inherit,0.1)] hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 active:shadow-none animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <h3 className="font-semibold text-lg mb-2">Item {i}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Watch how the items slide up gently on load.
              </p>
              <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                Read More <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-8 border-b pb-12">
        <h2 className="text-2xl font-semibold">
          2. "Lift" Buttons & Micro-interactions
        </h2>
        <p className="text-muted-foreground">
          Your chosen "Lift Button" style alongside icons that respond playfully
          to clicks and hover.
        </p>
        <div className="flex flex-wrap gap-6 items-center">
          <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 active:scale-95">
            Start Learning (Lift Button)
          </button>

          <div className="flex gap-4">
            <button className="p-3 bg-secondary rounded-full text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-90 peer group">
              <Bookmark className="w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-95" />
            </button>
            <button className="p-3 bg-secondary rounded-full text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-90 peer group">
              <Settings className="w-5 h-5 transition-transform group-hover:rotate-90 group-active:scale-95 duration-500 ease-out" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8 border-b pb-12">
        <h2 className="text-2xl font-semibold">3. Focused Form Inputs</h2>
        <p className="text-muted-foreground">
          Inputs subtly glow and expand their ring on focus, drawing the eye
          without jarring the user.
        </p>
        <div className="max-w-md relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search questions..."
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm transition-all duration-300 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 hover:border-primary/30"
          />
        </div>
      </div>

      <div className="space-y-8 border-b pb-12">
        <h2 className="text-2xl font-semibold">4. Smooth Tab Sliders</h2>
        <p className="text-muted-foreground">
          Background elegantly glides behind the active tab instead of appearing
          instantly.
        </p>

        <div className="relative flex w-fit bg-secondary/50 rounded-xl p-1 backdrop-blur-sm border border-border/50">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`relative z-10 px-5 py-2 text-sm font-medium transition-colors duration-300 ${
                activeTab === idx
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
          {/* Animated Background Indicator */}
          <div
            className="absolute top-1 bottom-1 w-[124px] bg-card rounded-lg border border-border/50 shadow-sm transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${activeTab * 124}px)`,
            }}
          />
        </div>
      </div>

      <div className="space-y-8 border-b pb-12">
        <h2 className="text-2xl font-semibold">
          5. Continuous Skeleton Loader
        </h2>
        <p className="text-muted-foreground">
          A continuous, smooth pulse utilizing an animated gradient shimmer for
          better perceived loading times.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 bg-card rounded-2xl border border-border overflow-hidden"
            >
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded-md mb-4" />
              <div className="h-4 w-full bg-muted animate-pulse rounded-md mb-2" />
              <div className="h-4 w-5/6 bg-muted animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8 pb-12">
        <h2 className="text-2xl font-semibold">6. Smooth Progress/Meter</h2>
        <p className="text-muted-foreground">
          Progress bar transitions width smoothly, utilizing Tailwind's
          transition classes.
        </p>
        <div className="max-w-md w-full">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Topic Completion</span>
            <span className="text-sm font-medium text-muted-foreground">
              12/20
            </span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
