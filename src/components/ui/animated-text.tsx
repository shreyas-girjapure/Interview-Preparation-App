"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedTextProps {
  phrases: string[];
  className?: string;
  interval?: number;
}

export function AnimatedText({
  phrases,
  className,
  interval = 3000,
}: AnimatedTextProps) {
  const [index, setIndex] = useState(0);

  // To prevent layout shift, find the longest word to set a safe minimum width.
  const longestWord = phrases.reduce(
    (a, b) => (a.length > b.length ? a : b),
    "",
  );

  useEffect(() => {
    const handle = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % phrases.length);
    }, interval);

    return () => clearInterval(handle);
  }, [phrases.length, interval]);

  return (
    <span
      className={cn(
        "inline-grid overflow-hidden align-bottom whitespace-nowrap px-4 -mx-4 py-2 -my-2",
        className,
      )}
    >
      {/* Invisible placeholder dictates the static physical width of the container */}
      <span className="invisible select-none opacity-0 col-start-1 row-start-1 text-left">
        {longestWord}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={index}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 1,
          }}
          className="col-start-1 row-start-1 text-primary text-left"
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
