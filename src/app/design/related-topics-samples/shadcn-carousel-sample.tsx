"use client";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type RelatedTopicCard = {
  slug: string;
  name: string;
  shortDescription: string;
};

export function ShadcnCarouselSample({
  topics,
}: {
  topics: RelatedTopicCard[];
}) {
  if (!topics.length) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        dragFree: false,
      }}
      className="w-full"
    >
      <CarouselContent>
        {topics.map((topic) => (
          <CarouselItem key={topic.slug} className="md:basis-1/2 lg:basis-1/3">
            <div className="h-full rounded-2xl border border-border/80 bg-card/70 p-5">
              <h3 className="font-serif text-xl leading-tight">{topic.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {topic.shortDescription}
              </p>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
