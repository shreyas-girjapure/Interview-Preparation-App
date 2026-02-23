import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  type QuestionProgressState,
  labelQuestionProgressState,
} from "@/lib/interview/question-progress-state";

function toToastActionLabel(state: QuestionProgressState) {
  return labelQuestionProgressState(state).toLowerCase();
}

export function useQuestionProgress({
  initialState,
  questionId,
  isAuthenticated,
}: {
  initialState: QuestionProgressState;
  questionId: string;
  isAuthenticated: boolean;
}) {
  const [state, setState] = useState<QuestionProgressState>(initialState);
  const [isSaving, setIsSaving] = useState(false);

  const persistState = useCallback(
    async (nextState: QuestionProgressState) => {
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
    },
    [questionId],
  );

  const undoStateChange = useCallback(
    async (
      undoToState: QuestionProgressState,
      beforeUndoState: QuestionProgressState,
    ) => {
      setState(undoToState);

      try {
        await persistState(undoToState);
        toast(`Reverted to ${toToastActionLabel(undoToState)}`);
      } catch {
        setState(beforeUndoState);
        toast.error("Unable to undo question progress state.");
      }
    },
    [persistState],
  );

  function stateChangeMessages(nextState: QuestionProgressState) {
    if (nextState === "read") {
      return {
        title: "Question marked as read",
        description: undefined,
      };
    }

    return {
      title: "Question marked as unread",
      description: undefined,
    };
  }

  const updateState = useCallback(
    async (nextState: QuestionProgressState) => {
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

        const toastOptions: {
          action: {
            label: string;
            onClick: () => void;
          };
          description?: string;
        } = {
          action: {
            label: "Undo",
            onClick: () => {
              void undoStateChange(previousState, nextState);
            },
          },
        };

        if (messages.description) {
          toastOptions.description = messages.description;
        }

        if (nextState === "read") {
          toast.success(messages.title, toastOptions);
        } else {
          toast(messages.title, toastOptions);
        }
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
    },
    [isAuthenticated, isSaving, persistState, state, undoStateChange],
  );

  const toggleRead = useCallback(() => {
    void updateState(state === "read" ? "unread" : "read");
  }, [state, updateState]);

  return {
    state,
    isRead: state === "read",
    isSaving,
    updateState,
    toggleRead,
  };
}
