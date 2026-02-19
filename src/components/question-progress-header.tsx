"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            size="sm"
            variant={readActive ? "default" : "outline"}
            disabled={isSaving}
            onClick={() => {
              void updateState(readActive ? "unread" : "read");
            }}
          >
            <Check className="mr-1.5 size-4" />
            {readActive ? "Mark unread" : "Mark as read"}
          </Button>
          <Button
            size="sm"
            variant={revisitActive ? "default" : "outline"}
            disabled={isSaving}
            onClick={() => {
              void updateState(revisitActive ? "unread" : "review_later");
            }}
          >
            <RotateCcw className="mr-1.5 size-4" />
            {revisitActive ? "Remove revisit" : "Revisit later"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
