"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type QuestionProgressState,
  labelQuestionProgressState,
} from "@/lib/interview/question-progress-state";

type QuestionProgressHeaderProps = {
  questionId: string;
  categories: string[];
  initialState: QuestionProgressState;
  isAuthenticated: boolean;
  showActions?: boolean;
  className?: string;
};

function toToastActionLabel(state: QuestionProgressState) {
  return labelQuestionProgressState(state).toLowerCase();
}

export function QuestionProgressHeader({
  questionId,
  categories,
  initialState,
  isAuthenticated,
  showActions = true,
  className,
}: QuestionProgressHeaderProps) {
  const [state, setState] = useState<QuestionProgressState>(initialState);
  const [isSaving, setIsSaving] = useState(false);

  async function persistState(nextState: QuestionProgressState) {
    const response = await fetch("/api/questions/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId,
        state: nextState,
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(body?.error || "Unable to save question progress.");
    }
  }

  function stateChangeMessages(nextState: QuestionProgressState) {
    if (nextState === "read") {
      return {
        title: "Marked as read",
        description: "Question progress saved.",
      };
    }

    if (nextState === "review_later") {
      return {
        title: "Added to revisit list",
        description: "This question is scheduled for review.",
      };
    }

    return {
      title: "Marked as unread",
      description: "Question moved back to unread.",
    };
  }

  async function updateState(nextState: QuestionProgressState) {
    if (isSaving) {
      return;
    }

    if (!isAuthenticated) {
      toast.error("Sign in to track question progress.");
      return;
    }

    const previousState = state;
    setState(nextState);
    setIsSaving(true);

    try {
      await persistState(nextState);
      const messages = stateChangeMessages(nextState);

      toast(messages.title, {
        description: messages.description,
        action: {
          label: "Undo",
          onClick: () => {
            void undoStateChange(previousState);
          },
        },
      });
    } catch (error) {
      setState(previousState);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save question progress right now.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function undoStateChange(undoToState: QuestionProgressState) {
    const beforeUndoState = state;
    setState(undoToState);

    try {
      await persistState(undoToState);
      toast(`Reverted to ${toToastActionLabel(undoToState)}`);
    } catch {
      setState(beforeUndoState);
      toast.error("Unable to undo question progress state.");
    }
  }

  const readActive = state === "read";
  const revisitActive = state === "review_later";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 md:gap-3 md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {categories.map((category) => (
          <Badge key={`${questionId}-${category}`} variant="outline">
            {category}
          </Badge>
        ))}
        <Badge variant="secondary" className="capitalize">
          {labelQuestionProgressState(state)}
        </Badge>
      </div>

      {showActions ? (
        <div className="ml-auto shrink-0 md:justify-end">
          <div className="grid grid-cols-2 rounded-full border border-border/70 bg-background/80 p-0.5 sm:p-1">
            <button
              type="button"
              disabled={isSaving}
              aria-pressed={readActive}
              aria-label={readActive ? "Mark as unread" : "Mark as read"}
              onClick={() => {
                void updateState(readActive ? "unread" : "read");
              }}
              className={cn(
                "inline-flex h-6 min-w-[3.65rem] items-center justify-center rounded-full px-2 text-[0.7rem] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 sm:h-7 sm:min-w-[4.85rem] sm:px-3 sm:text-xs",
                readActive
                  ? "bg-muted text-foreground"
                  : "text-foreground/72 hover:bg-accent/55 hover:text-foreground",
              )}
            >
              Read
            </button>
            <button
              type="button"
              disabled={isSaving}
              aria-pressed={revisitActive}
              aria-label={
                revisitActive ? "Remove revisit status" : "Mark to revisit"
              }
              onClick={() => {
                void updateState(revisitActive ? "unread" : "review_later");
              }}
              className={cn(
                "inline-flex h-6 min-w-[3.65rem] items-center justify-center rounded-full px-2 text-[0.7rem] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 sm:h-7 sm:min-w-[4.85rem] sm:px-3 sm:text-xs",
                revisitActive
                  ? "bg-muted text-foreground"
                  : "text-foreground/72 hover:bg-accent/55 hover:text-foreground",
              )}
            >
              Revisit
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
