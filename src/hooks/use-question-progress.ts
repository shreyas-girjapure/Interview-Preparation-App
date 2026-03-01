import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type QuestionProgressState,
  labelQuestionProgressState,
} from "@/lib/interview/question-progress-state";
import { showAppToast } from "@/lib/toast";

function toToastActionLabel(state: QuestionProgressState) {
  return labelQuestionProgressState(state).toLowerCase();
}

async function saveProgressToServer(
  questionId: string,
  state: QuestionProgressState,
): Promise<void> {
  const response = await fetch("/api/questions/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, state }),
  });

  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Unable to save question progress.");
  }
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
  const queryClient = useQueryClient();
  // Cache key for this question's progress state
  const queryKey = ["questionProgress", questionId];

  // Seed the cache with the server-rendered state so the first render
  // reads from cache without a network request.
  if (queryClient.getQueryData(queryKey) === undefined) {
    queryClient.setQueryData(queryKey, initialState);
  }

  const currentState =
    (queryClient.getQueryData(queryKey) as QuestionProgressState | undefined) ??
    initialState;

  // Keep a stable ref to the last undo action so the toast closure captures it
  const undoRef = useRef<(() => void) | null>(null);

  const mutation = useMutation({
    mutationFn: (nextState: QuestionProgressState) =>
      saveProgressToServer(questionId, nextState),

    // 1. Optimistically update the cache — no button lock, instant UI
    onMutate: async (nextState) => {
      // Cancel any in-flight refetch that might overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });
      const previousState =
        queryClient.getQueryData<QuestionProgressState>(queryKey);
      queryClient.setQueryData(queryKey, nextState);
      return { previousState };
    },

    // 2. On success — show toast with Undo action
    onSuccess: (_, nextState, context) => {
      const previousState = context?.previousState ?? initialState;

      undoRef.current = () => {
        mutation.mutate(previousState);
        showAppToast({
          title: "Progress reverted",
          description: `State set back to ${toToastActionLabel(previousState)}.`,
        });
      };

      if (nextState === "read") {
        showAppToast({
          title: "Question marked as read",
          description: "Progress was saved.",
          action: { label: "Undo", onClick: () => undoRef.current?.() },
        });
      } else {
        showAppToast({
          title: "Question marked as unread",
          description: "The question is now marked as unread.",
          action: { label: "Undo", onClick: () => undoRef.current?.() },
        });
      }
    },

    // 3. On error — automatically roll back to previous state
    onError: (error, _, context) => {
      if (context?.previousState !== undefined) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
      showAppToast({
        title: "Unable to save progress",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      });
    },
  });

  const toggleRead = useCallback(() => {
    if (!isAuthenticated) {
      showAppToast({
        title: "Sign in required",
        description: "Sign in to track question progress.",
      });
      return;
    }
    const nextState = currentState === "read" ? "unread" : "read";
    mutation.mutate(nextState);
  }, [currentState, isAuthenticated, mutation]);

  const updateState = useCallback(
    (nextState: QuestionProgressState) => {
      if (!isAuthenticated) {
        showAppToast({
          title: "Sign in required",
          description: "Sign in to track question progress.",
        });
        return;
      }
      mutation.mutate(nextState);
    },
    [isAuthenticated, mutation],
  );

  return {
    state: currentState,
    isRead: currentState === "read",
    isSaving: mutation.isPending,
    updateState,
    toggleRead,
  };
}
