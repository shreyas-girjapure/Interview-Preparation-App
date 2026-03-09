"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PickerQuestion } from "./picker-question";

const PAGE_SIZE = 6;

type PlaylistQuestionPickerProps = {
  questions: PickerQuestion[];
  selectedIds: string[];
  onSelectedIdsChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
  emptyMessage?: string;
  pinSelectedFirst?: boolean;
};

export function PlaylistQuestionPicker({
  questions,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  label = "Questions",
  emptyMessage = "No questions match your filters.",
  pinSelectedFirst = false,
}: PlaylistQuestionPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const topics = useMemo(() => {
    const values = new Set<string>();
    for (const question of questions) {
      if (question.topic) {
        values.add(question.topic);
      }
    }

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const selectedOrderById = new Map(
      selectedIds.map((questionId, index) => [questionId, index] as const),
    );

    const filtered = questions.filter((question) => {
      const matchesSearch =
        !normalizedSearch ||
        question.title.toLowerCase().includes(normalizedSearch) ||
        question.topic.toLowerCase().includes(normalizedSearch);
      const matchesTopic =
        selectedTopics.length === 0 || selectedTopics.includes(question.topic);
      return matchesSearch && matchesTopic;
    });

    if (!pinSelectedFirst) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      const leftOrder = selectedOrderById.get(left.id);
      const rightOrder = selectedOrderById.get(right.id);
      const leftSelected = typeof leftOrder === "number";
      const rightSelected = typeof rightOrder === "number";

      if (leftSelected && rightSelected) {
        return leftOrder - rightOrder;
      }
      if (leftSelected) {
        return -1;
      }
      if (rightSelected) {
        return 1;
      }

      return left.title.localeCompare(right.title);
    });
  }, [pinSelectedFirst, questions, search, selectedIds, selectedTopics]);

  const suggestedTopics = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return [];
    }

    return topics
      .filter(
        (topic) =>
          topic.toLowerCase().includes(normalizedSearch) &&
          !selectedTopics.includes(topic),
      )
      .slice(0, 10);
  }, [search, selectedTopics, topics]);

  const visibleQuestions = filteredQuestions.slice(0, visibleCount);
  const hasMoreQuestions = visibleCount < filteredQuestions.length;

  function handleTopicToggle(topic: string) {
    setSelectedTopics((previous) =>
      previous.includes(topic)
        ? previous.filter((value) => value !== topic)
        : [...previous, topic],
    );
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function clearFiltersAndSelection() {
    onSelectedIdsChange([]);
    setSelectedTopics([]);
    setSearch("");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <div className="flex items-center gap-3">
            <motion.span
              key={selectedIds.length}
              initial={{ scale: 0.85, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-xs text-muted-foreground"
            >
              {selectedIds.length} selected
            </motion.span>
            {(selectedIds.length > 0 ||
              selectedTopics.length > 0 ||
              search.trim().length > 0) && (
              <button
                type="button"
                onClick={clearFiltersAndSelection}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground underline hover:text-foreground transition-colors"
                disabled={disabled}
              >
                Clear all
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or topic..."
            className="pl-9"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            disabled={disabled}
          />
        </div>

        {(selectedTopics.length > 0 || suggestedTopics.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleTopicToggle(topic)}
                disabled={disabled}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium border transition-all flex items-center gap-1",
                  "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
                )}
              >
                {topic} <span className="opacity-70 text-[10px]">x</span>
              </button>
            ))}
            {suggestedTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleTopicToggle(topic)}
                disabled={disabled}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium border transition-all flex items-center gap-1",
                  "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {topic} <span className="opacity-70 text-[10px]">+</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visibleQuestions.map((question) => {
            const isSelected = selectedIds.includes(question.id);

            return (
              <motion.button
                key={question.id}
                layout
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSelectedIdsChange(
                    isSelected
                      ? selectedIds.filter((id) => id !== question.id)
                      : [...selectedIds, question.id],
                  )
                }
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isSelected ? 1.01 : 1,
                }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                  layout: {
                    duration: 0.24,
                    ease: [0.2, 0.8, 0.2, 1],
                  },
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all",
                  isSelected
                    ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/10"
                    : "border-border/60 hover:border-border hover:bg-accent/30",
                )}
              >
                <motion.div
                  className={cn(
                    "flex items-center justify-center size-7 rounded-lg transition-colors shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isSelected ? (
                      <motion.span
                        key="selected"
                        initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                      >
                        <Check className="size-4" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="unselected"
                        initial={{ opacity: 0, scale: 0.7, rotate: 15 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.7, rotate: -15 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                      >
                        <Plus className="size-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{question.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {question.topic}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {filteredQuestions.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}

        {hasMoreQuestions && (
          <Button
            type="button"
            variant="outline"
            className="mt-1 w-full"
            disabled={disabled}
            onClick={() => setVisibleCount((previous) => previous + PAGE_SIZE)}
          >
            Load more ({filteredQuestions.length - visibleCount} remaining)
          </Button>
        )}
      </div>
    </>
  );
}
