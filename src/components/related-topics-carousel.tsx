import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type RelatedTopicCard = {
  slug: string;
  name: string;
  shortDescription: string;
};

export function RelatedTopicsCarousel({
  topics,
}: {
  topics: RelatedTopicCard[];
}) {
  if (!topics.length) {
    return null;
  }

  return (
    <div className="relative">
      <Carousel
        opts={{
          align: "start",
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent>
          {topics.map((topic) => (
            <CarouselItem key={topic.slug} className="basis-[260px]">
              <div className="h-full rounded-2xl border border-border/80 bg-card/70 p-5">
                <h3 className="font-serif text-xl leading-tight">
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {topic.name}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {topic.shortDescription}
                </p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="left-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
        <CarouselNext
          variant="ghost"
          className="right-2 z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30"
        />
      </Carousel>
    </div>
  );
}
