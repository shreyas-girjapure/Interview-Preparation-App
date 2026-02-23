"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuestionProgress } from "@/hooks/use-question-progress";
import { type QuestionProgressState } from "@/lib/interview/question-progress-state";

type QuestionProgressHeaderProps = {
  questionId: string;
  categories: string[];
  initialState: QuestionProgressState;
  isAuthenticated: boolean;
};

export function QuestionProgressHeader({
  questionId,
  categories,
  initialState,
  isAuthenticated,
}: QuestionProgressHeaderProps) {
  const { isRead, toggleRead, isSaving } = useQuestionProgress({
    initialState,
    questionId,
    isAuthenticated,
  });

  return (
    <div className="flex w-full items-start justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {categories.map((category) => (
          <Badge key={category} variant="outline">
            {category}
          </Badge>
        ))}
        {!isRead && (
          <Badge
            variant="secondary"
            className="transition-opacity duration-300"
          >
            Unread
          </Badge>
        )}
        {isRead && (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent transition-opacity duration-300"
          >
            Read
          </Badge>
        )}
      </div>

      <button
        onClick={toggleRead}
        disabled={isSaving}
        className={cn(
          "shrink-0 rounded-full p-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border shadow-sm disabled:opacity-50 disabled:pointer-events-none",
          isRead
            ? "bg-green-100/80 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
            : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label={isRead ? "Mark as unread" : "Mark as read"}
        title={isRead ? "Mark as unread" : "Mark as read"}
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>
    </div>
  );
}
