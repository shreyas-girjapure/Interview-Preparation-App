"use client";

import * as React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export type FeaturedContentMode = "carousel" | "grid";

type FeaturedContentRailProps = {
  mode?: FeaturedContentMode;
  children: React.ReactNode;
  className?: string;
  gridClassName?: string;
  carouselItemClassName?: string;
};

function keyFromNode(node: React.ReactNode, index: number) {
  if (React.isValidElement(node) && node.key !== null) {
    return node.key;
  }

  return index;
}

const NAV_BUTTON_CLASS_NAME =
  "z-20 h-9 w-9 rounded-full border border-border/80 bg-background/90 text-foreground shadow-sm transition hover:bg-background disabled:opacity-30";

export function FeaturedContentRail({
  mode = "carousel",
  children,
  className,
  gridClassName,
  carouselItemClassName,
}: FeaturedContentRailProps) {
  const items = React.Children.toArray(children);

  if (!items.length) {
    return null;
  }

  if (mode === "grid") {
    return (
      <div
        className={cn("grid gap-4 md:grid-cols-3", gridClassName, className)}
      >
        {items.map((item, index) => (
          <div key={keyFromNode(item, index)} className="h-full">
            {item}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Carousel
        opts={{
          align: "start",
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent className="py-2">
          {items.map((item, index) => (
            <CarouselItem
              key={keyFromNode(item, index)}
              className={cn(
                "basis-[280px] md:basis-[340px] lg:basis-[360px]",
                carouselItemClassName,
              )}
            >
              <div className="h-full">{item}</div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {items.length > 1 ? (
          <>
            <CarouselPrevious
              variant="ghost"
              className={cn("left-2", NAV_BUTTON_CLASS_NAME)}
            />
            <CarouselNext
              variant="ghost"
              className={cn("right-2", NAV_BUTTON_CLASS_NAME)}
            />
          </>
        ) : null}
      </Carousel>
    </div>
  );
}
