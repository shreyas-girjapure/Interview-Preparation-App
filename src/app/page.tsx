import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { QuestionCard } from "@/components/question-card";
import { Badge } from "@/components/ui/badge";
import { AnimatedText } from "@/components/ui/animated-text";
import { listFeaturedQuestions } from "@/lib/interview/questions";

export default async function Home() {
  const featuredQuestions = await listFeaturedQuestions(3);

  // The words we want to cycle through
  const animatedWords = ["structure", "confidence", "clarity", "focus"];

  return (
    <main className="min-h-screen bg-background">
      <section className="relative w-full overflow-hidden pt-8 pb-10 md:pt-14 md:pb-12">
        {/* Subtle Background Texture */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40 [mask-image:linear-gradient(to_bottom,white,transparent)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
          {/* Hero Section */}
          <div className="mb-4 flex flex-col items-center text-center md:mb-8">
            <h1 className="max-w-4xl font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.12] sm:leading-[1.1] tracking-tight text-foreground mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 ease-out fill-mode-both [text-wrap:balance]">
              Prepare for interviews with{" "}
              <AnimatedText
                phrases={animatedWords}
                className="text-primary italic font-serif"
              />
            </h1>

            <p className="max-w-2xl text-[15px] sm:text-lg md:text-xl leading-relaxed text-muted-foreground mb-5 md:mb-6 px-2 sm:px-0 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out fill-mode-both">
              Stop guessing what interviewers want. Practice with concise
              explanations, realistic code snippets, and deep-dive conceptual
              learning paths.
            </p>

            <div className="flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 ease-out fill-mode-both px-2 w-full mt-2 sm:mt-2">
              <Link
                href="/topics"
                className="group flex items-center justify-center gap-1.5 text-[15px] sm:text-lg font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4 sm:no-underline relative sm:after:absolute sm:after:bottom-0 sm:after:left-0 sm:after:h-[1.5px] sm:after:w-full sm:after:origin-bottom-right sm:after:scale-x-0 sm:after:bg-primary sm:after:transition-transform sm:after:duration-300 sm:hover:after:origin-bottom-left sm:hover:after:scale-x-100"
              >
                Explore Topics
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/questions"
                className="group flex items-center justify-center gap-1.5 text-[15px] sm:text-lg text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 sm:no-underline relative sm:after:absolute sm:after:bottom-0 sm:after:left-0 sm:after:h-[1.5px] sm:after:w-full sm:after:origin-bottom-right sm:after:scale-x-0 sm:after:bg-foreground sm:after:transition-transform sm:after:duration-300 sm:hover:after:origin-bottom-left sm:hover:after:scale-x-100"
              >
                Explore Questions
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Featured Section: The Bento Grid */}
          {featuredQuestions && featuredQuestions.length > 0 && (
            <div className="pt-2 md:pt-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-700 ease-out fill-mode-both">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 sm:gap-4 mb-4 md:mb-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl">
                    Hand-Picked Curations
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Our editor&apos;s choice for this week&apos;s practice.
                  </p>
                </div>
              </div>

              {/* Desktop View: The Bento Grid */}
              <div className="hidden md:grid gap-6 md:grid-cols-3 md:grid-rows-2">
                {/* Hero Question (Spans 2 columns, 2 rows) */}
                <div className="md:col-span-2 md:row-span-2">
                  <article className="group relative flex h-full min-h-[250px] md:min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative z-10 flex h-full flex-col">
                      <div className="mb-6 flex flex-wrap gap-2">
                        {(featuredQuestions[0].categories.length
                          ? featuredQuestions[0].categories
                          : [featuredQuestions[0].category]
                        ).map((category) => (
                          <Badge
                            key={`${featuredQuestions[0].id}-${category}`}
                            variant="outline"
                          >
                            {category}
                          </Badge>
                        ))}
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

                {/* Supporting Squares */}
                {featuredQuestions.length > 1 && (
                  <div className="md:col-span-1 md:row-span-1 h-[250px] md:h-auto">
                    <QuestionCard
                      question={featuredQuestions[1]}
                      featured={true}
                      className="shadow-xs border-border/80"
                    />
                  </div>
                )}
                {featuredQuestions.length > 2 && (
                  <div className="md:col-span-1 md:row-span-1 h-[250px] md:h-auto">
                    <QuestionCard
                      question={featuredQuestions[2]}
                      featured={true}
                      className="shadow-xs border-border/80"
                    />
                  </div>
                )}
              </div>

              {/* Mobile View: Clean Stack of Regular Cards */}
              <div className="flex md:hidden flex-col gap-4">
                {featuredQuestions.map((question) => (
                  <QuestionCard
                    key={question.slug}
                    question={question}
                    featured={true}
                    className="shadow-sm border-border/80 bg-card"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
