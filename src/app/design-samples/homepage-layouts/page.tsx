import { listFeaturedQuestions } from "@/lib/interview/questions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ChevronRight,
  ArrowRight,
  Sparkles,
  Terminal,
  Code2,
  Zap,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { QuestionCard } from "@/components/question-card";
import { Button } from "@/components/ui/button";
import { AnimatedText } from "@/components/ui/animated-text";

// A helper for consistently displaying the Bento Grid below each Hero variation
// so we don't have to repeat the 100 lines of Bento Grid code 4 times.
function BentoGridSection({ featuredQuestions }: { featuredQuestions: any[] }) {
  if (!featuredQuestions || featuredQuestions.length === 0) return null;
  return (
    <div className="rounded-3xl border border-border/80 bg-[oklch(0.985_0.004_95)]/80 p-8 md:p-12 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700 ease-out fill-mode-both">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="font-serif text-3xl">Hand-Picked Curations</h2>
          <p className="text-muted-foreground mt-1">
            Our editor's choice for this week's practice.
          </p>
        </div>
        <Button asChild variant="ghost" className="hidden md:flex">
          <Link href="/questions">
            View all questions <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:grid-rows-2">
        <div className="md:col-span-2 md:row-span-2">
          <article className="group relative flex h-full min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl border border-border/80 bg-card p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20 font-medium tracking-wide"
                >
                  🏆 WEEKLY SPOTLIGHT
                </Badge>
              </div>
              <div className="mt-auto">
                <h4 className="font-serif text-3xl leading-snug md:text-4xl">
                  <Link
                    href={`/questions/${featuredQuestions[0].slug}`}
                    className="after:absolute after:inset-0"
                  >
                    {featuredQuestions[0].title}
                  </Link>
                </h4>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground line-clamp-2 md:line-clamp-3">
                  {featuredQuestions[0].summary}
                </p>
              </div>
            </div>
          </article>
        </div>
        {featuredQuestions.length > 1 && (
          <div className="md:col-span-1 md:row-span-1 h-[250px] md:h-auto">
            <QuestionCard
              question={featuredQuestions[1]}
              featured={true}
              className="shadow-xs border-border/60 hover:border-primary/40"
            />
          </div>
        )}
        {featuredQuestions.length > 2 && (
          <div className="md:col-span-1 md:row-span-1 h-[250px] md:h-auto">
            <QuestionCard
              question={featuredQuestions[2]}
              featured={true}
              className="shadow-xs border-border/60 hover:border-primary/40"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default async function HomepageLayoutSamples() {
  const featuredQuestions = await listFeaturedQuestions(3);
  if (!featuredQuestions || featuredQuestions.length === 0) return null;

  const animatedWords = ["structure", "confidence", "clarity", "focus"];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 py-4 text-center border-b border-border/50">
        <h1 className="font-serif text-2xl">Concept 1: Hero Enhancements</h1>
        <p className="text-sm text-muted-foreground">
          Exploring 4 different ways to elevate the Hero section while keeping
          the Animated Text and Bento Grid base.
        </p>
      </div>

      {/* =========================================
          HERO 1: THE SPOTLIGHT & FLOATING DATA CARDS
          ========================================= */}
      <section className="relative border-b-8 border-border/30 pb-32 pt-28 overflow-hidden">
        {/* Soft Spotlight Background */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[120px] rounded-[100%] pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30 [mask-image:linear-gradient(to_bottom,white,transparent)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-12 flex justify-center">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent text-lg py-1 px-4">
              Hero 1: Spotlight & Data Cards
            </Badge>
          </div>

          <div className="text-center mb-28 flex flex-col items-center relative">
            {/* Floating Glass Badges */}
            <div className="hidden md:flex absolute top-10 left-4 animate-in fade-in slide-in-from-left-8 duration-700 delay-700 items-center gap-3 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md p-3 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Verified</p>
                <p className="text-xs text-muted-foreground">FAANG Scenarios</p>
              </div>
            </div>

            <div className="hidden md:flex absolute top-20 right-4 animate-in fade-in slide-in-from-right-8 duration-700 delay-1000 items-center gap-3 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md p-3 shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">Optimized</p>
                <p className="text-xs text-muted-foreground">O(1) Solutions</p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-8 bg-background shadow-sm ring-1 ring-border/50 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
            >
              <Sparkles className="inline-block w-3 h-3 mr-2 text-primary" />{" "}
              Technical Interview Preparation
            </Badge>

            <h1 className="max-w-4xl font-serif text-5xl md:text-7xl leading-[1.1] tracking-tight text-foreground mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 ease-out fill-mode-both">
              Prepare for interviews <br className="hidden md:block" />
              with{" "}
              <AnimatedText
                phrases={animatedWords}
                className="text-primary italic"
              />
            </h1>

            <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out fill-mode-both">
              Stop guessing what interviewers want. Practice with concise
              explanations, realistic code snippets, and deep-dive conceptual
              learning paths.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 ease-out fill-mode-both">
              <Button
                asChild
                size="lg"
                className="rounded-full h-14 px-8 text-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                <Link href="/topics">
                  Start Learning <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full h-14 px-8 text-lg bg-background/50 backdrop-blur-sm border-border"
              >
                <Link href="/questions">Explore Question Bank</Link>
              </Button>
            </div>
          </div>

          <BentoGridSection featuredQuestions={featuredQuestions} />
        </div>
      </section>

      {/* =========================================
          HERO 2: THE ABSTRACT TERMINAL BACKGROUND
          ========================================= */}
      <section className="relative border-b-8 border-border/30 pb-32 pt-28 overflow-hidden bg-[oklch(0.99_0_0)]">
        {/* Abstract Wireframe Terminal */}
        <div className="absolute inset-0 flex justify-center items-start pt-10 pointer-events-none opacity-[0.03] overflow-hidden z-0">
          <div className="w-[1200px] h-[800px] rounded-3xl border-2 border-primary border-t-[40px] shadow-2xl relative">
            <div className="absolute top-[-26px] left-4 flex gap-2">
              <span className="w-3 h-3 border border-primary rounded-full"></span>
              <span className="w-3 h-3 border border-primary rounded-full"></span>
              <span className="w-3 h-3 border border-primary rounded-full"></span>
            </div>
            <div className="p-8 font-mono text-xl leading-10">
              &gt; init preparation --mode strict
              <br />
              &gt; loading core concepts... [DONE]
              <br />
              &gt; loading system design... [DONE]
              <br />
              &gt; compiling confidence...
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-12 flex justify-center">
            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-lg py-1 px-4">
              Hero 2: Abstract Terminal Frame
            </Badge>
          </div>

          <div className="text-center mb-28 flex flex-col items-center">
            <div className="mb-8 p-3 bg-background border border-border/50 rounded-2xl shadow-sm text-muted-foreground animate-in zoom-in-95 duration-700 ease-out">
              <Terminal className="w-8 h-8 opacity-50" />
            </div>

            <h1 className="max-w-4xl font-serif text-5xl md:text-7xl leading-[1.1] tracking-tight text-foreground mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 ease-out fill-mode-both">
              Prepare for interviews <br className="hidden md:block" />
              with{" "}
              <span className="relative">
                <span className="absolute -bottom-2 left-0 right-0 h-4 bg-primary/10 -z-10 skew-x-12"></span>
                <AnimatedText
                  phrases={animatedWords}
                  className="text-primary font-bold"
                />
              </span>
            </h1>

            <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out fill-mode-both">
              Designed for engineers, by engineers. Practice with concise
              explanations, realistic code snippets, and deep-dive conceptual
              learning paths.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 ease-out fill-mode-both">
              <Button
                asChild
                size="lg"
                className="rounded-xl h-14 px-8 text-lg bg-foreground text-background hover:bg-foreground/90"
              >
                <Link href="/topics">Start Learning</Link>
              </Button>
            </div>
          </div>

          <BentoGridSection featuredQuestions={featuredQuestions} />
        </div>
      </section>

      {/* =========================================
          HERO 3: THE PERSPECTIVE GRID & GLOW
          ========================================= */}
      <section className="relative border-b-8 border-border/30 pb-32 pt-28 overflow-hidden">
        {/* Tilted Perspective Grid */}
        <div className="absolute bottom-1/2 left-0 right-0 h-[80vh] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateZ(-200px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80 pointer-events-none z-0" />

        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent z-0 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-12 flex justify-center">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent text-lg py-1 px-4">
              Hero 3: Perspective Grid Warp
            </Badge>
          </div>

          <div className="text-center mb-28 flex flex-col items-center">
            <h1 className="max-w-4xl font-serif text-5xl md:text-7xl leading-[1.1] tracking-tight text-foreground mb-8 pt-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 ease-out fill-mode-both">
              Prepare for interviews <br className="hidden md:block" />
              with{" "}
              <AnimatedText
                phrases={animatedWords}
                className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500"
              />
            </h1>

            <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out fill-mode-both">
              Stop guessing what interviewers want. Practice with concise
              explanations, realistic code snippets, and deep-dive conceptual
              learning paths.
            </p>
            <div className="flex flex-wrap justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 ease-out fill-mode-both">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] shadow-primary/30"
              >
                <Link href="/topics">
                  Start Learning <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          <BentoGridSection featuredQuestions={featuredQuestions} />
        </div>
      </section>

      {/* =========================================
          HERO 4: THE INTEGRATED BENTO HERO
          ========================================= */}
      <section className="relative pb-32 pt-24 overflow-hidden bg-[oklch(0.985_0.004_95)]/50">
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mb-8 flex justify-center">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent text-lg py-1 px-4">
              Hero 4: Integrated Bento Tiles
            </Badge>
          </div>

          {/* In this variation, the Hero text is ITSELF inside a bento grid box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-24">
            {/* Main Hero Tile */}
            <div className="lg:col-span-2 rounded-[2.5rem] border border-border bg-background p-10 md:p-14 shadow-lg flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px]"></div>
              <Badge
                variant="outline"
                className="w-fit rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase mb-8 bg-background shadow-sm border-border"
              >
                Technical Interview Preparation
              </Badge>
              <h1 className="max-w-[90%] font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-foreground mb-8">
                Prepare for interviews <br className="hidden md:block" />
                with{" "}
                <AnimatedText
                  phrases={animatedWords}
                  className="text-primary italic"
                />
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground mb-10">
                Practice with concise explanations, realistic code snippets, and
                deep-dive conceptual learning paths.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full h-12 px-8 text-base"
                >
                  <Link href="/topics">Start Learning</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="rounded-full h-12 px-8 text-base"
                >
                  <Link href="/questions">
                    Explore Bank <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column Supporting Tiles */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="flex-1 rounded-[2rem] border border-border bg-background p-8 shadow-sm flex flex-col justify-center relative group overflow-hidden">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 border border-emerald-200 shadow-sm transition-transform group-hover:scale-110">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-2">
                  High-Fidelity Code
                </h3>
                <p className="text-muted-foreground text-sm">
                  Real solutions you can instantly copy, understand, and apply.
                </p>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5 text-emerald-500">
                  <Code2 size={120} />
                </div>
              </div>
              <div className="flex-1 rounded-[2rem] border border-border bg-background p-8 shadow-sm flex flex-col justify-center relative group overflow-hidden">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 border border-amber-200 shadow-sm transition-transform group-hover:scale-110">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-2">
                  Editor's Picks
                </h3>
                <p className="text-muted-foreground text-sm">
                  Scroll down to see the most critical scenarios asked in
                  interviews today.
                </p>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5 text-amber-500">
                  <Trophy size={120} />
                </div>
              </div>
            </div>
          </div>

          <BentoGridSection featuredQuestions={featuredQuestions} />
        </div>
      </section>
    </div>
  );
}
