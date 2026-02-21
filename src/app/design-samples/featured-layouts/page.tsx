import { listFeaturedQuestions } from "@/lib/interview/questions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QuestionCard } from "@/components/question-card";
import { Button } from "@/components/ui/button";

export default async function FeaturedLayoutSamples() {
  const featuredQuestions = await listFeaturedQuestions(6);
  if (!featuredQuestions || featuredQuestions.length === 0) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="mb-4 font-serif text-4xl">
          Featured Questions: Design Concepts
        </h1>
        <p className="mb-10 text-muted-foreground">
          Experimenting with different UI/UX layouts for the homepage featured
          section.
        </p>

        {/* =========================================
            CONCEPT 1: THE BENTO GRID (Modern Editorial)
            ========================================= */}
        <section className="mb-32">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
            Concept 1
          </Badge>
          <h2 className="mb-8 font-serif text-3xl">The "Bento Box" Grid</h2>
          <p className="mb-8 max-w-3xl text-muted-foreground">
            Breaks visual monotony by making the first item a large "Hero" card
            spanning two columns, while the next two stack as supporting squares
            on the right.
          </p>

          <div className="rounded-3xl border border-border/80 bg-[oklch(0.985_0.004_95)] p-8 md:p-12">
            <h3 className="mb-8 font-serif text-2xl">Featured Questions</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
              {/* Hero Question (Spans 2 columns, 2 rows) */}
              <div className="md:col-span-2 md:row-span-2">
                <article className="group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  {/* Optional sleek background subtle gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-6 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      >
                        Hero Feature
                      </Badge>
                      <Badge variant="outline">
                        {featuredQuestions[0].category}
                      </Badge>
                    </div>
                    <div className="mt-auto">
                      <h4 className="font-serif text-2xl leading-snug md:text-3xl">
                        <Link
                          href={`/questions/${featuredQuestions[0].slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {featuredQuestions[0].title}
                        </Link>
                      </h4>
                      <p className="mt-4 text-base leading-relaxed text-muted-foreground line-clamp-2 md:line-clamp-3">
                        {featuredQuestions[0].summary}
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              {/* Supporting Question 1 (Top Right) */}
              <div className="md:col-span-1 md:row-span-1">
                <QuestionCard
                  question={featuredQuestions[1]}
                  featured={true}
                  className="shadow-xs"
                />
              </div>

              {/* Supporting Question 2 (Bottom Right) */}
              <div className="md:col-span-1 md:row-span-1">
                <QuestionCard
                  question={featuredQuestions[2]}
                  featured={true}
                  className="shadow-xs"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            CONCEPT 2: THE DARK MODE POP
            ========================================= */}
        <section className="mb-32">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
            Concept 2
          </Badge>
          <h2 className="mb-8 font-serif text-3xl">The "Dark Mode Pop"</h2>
          <p className="mb-8 max-w-3xl text-muted-foreground">
            Wraps the section in a deep slate background. Cards use
            high-contrast translucent glassy styles with neon hover states to
            feel ultra-premium.
          </p>

          <div className="rounded-3xl bg-slate-950 p-8 md:p-12 text-slate-50">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-3xl tracking-tight text-white mb-2">
                  Featured Questions
                </h3>
                <p className="text-slate-400">
                  Hand-picked by our experts this week.
                </p>
              </div>
              <Button
                variant="outline"
                className="hidden border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white md:inline-flex"
              >
                View Complete Catalog
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredQuestions.slice(0, 3).map((q) => (
                <article
                  key={q.id}
                  className="group relative flex h-full flex-col rounded-2xl border border-slate-800 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                      {q.category}
                    </span>
                  </div>
                  <h4 className="font-serif text-xl leading-snug text-slate-100">
                    <Link
                      href={`/questions/${q.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {q.title}
                    </Link>
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400 line-clamp-3">
                    {q.summary}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-medium text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
                    Solve Question <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            CONCEPT 3: THE SPLIT HORIZON
            ========================================= */}
        <section className="mb-32">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
            Concept 3
          </Badge>
          <h2 className="mb-8 font-serif text-3xl">The "Split Horizon"</h2>
          <p className="mb-8 max-w-3xl text-muted-foreground">
            A clean, corporate layout that splits the screen 30/70. A sticky
            sidebar title locks in place while the user scrolls through the
            beautiful vertical cards. (Scrolling behavior simulated here
            visually).
          </p>

          <div className="rounded-3xl border border-border/80 bg-[oklch(0.985_0.004_95)] p-8 md:p-12 relative overflow-hidden h-[600px] flex gap-12">
            {/* Left Column (Sticky conceptually) */}
            <div className="w-1/3 flex-shrink-0 pt-8 hidden lg:block">
              <Badge variant="outline" className="mb-4">
                Weekly Curated
              </Badge>
              <h3 className="mb-4 font-serif text-4xl leading-tight">
                Featured
                <br />
                Questions
              </h3>
              <p className="mb-8 text-muted-foreground leading-relaxed">
                Dive into our most essential and challenging technical
                scenarios, hand-selected to test you on architecture and edge
                cases.
              </p>
              <Button className="group">
                Start Practicing
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Right Column (Scrolling list) */}
            <div className="w-full lg:w-2/3 h-full overflow-y-auto pr-4 pb-12 space-y-6 scrollbar-hide">
              {featuredQuestions.map((q) => (
                <article
                  key={q.id}
                  className="group relative flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-card border border-border/50 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="md:w-1/4 shrink-0">
                    <div className="aspect-square w-full rounded-xl bg-muted/50 flex items-center justify-center border border-border/50 text-muted-foreground">
                      {/* Simulated Icon or Graphic */}
                      <svg
                        className="w-12 h-12 opacity-20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                        {q.category}
                      </span>
                    </div>
                    <h4 className="font-serif text-xl leading-snug mb-2">
                      <Link
                        href={`/questions/${q.slug}`}
                        className="after:absolute after:inset-0 text-foreground group-hover:text-primary transition-colors"
                      >
                        {q.title}
                      </Link>
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {q.summary}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
