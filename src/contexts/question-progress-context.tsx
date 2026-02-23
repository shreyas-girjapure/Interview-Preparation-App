"use client";

import { createContext, useContext } from "react";
import type { QuestionProgressState } from "@/lib/interview/question-progress-state";

type QuestionProgressContextValue = {
  statesByQuestionId: Record<string, QuestionProgressState>;
};

const QuestionProgressContext = createContext<QuestionProgressContextValue>({
  statesByQuestionId: {},
});

export function QuestionProgressProvider({
  states,
  children,
}: {
  states: Record<string, QuestionProgressState>;
  children: React.ReactNode;
}) {
  return (
    <QuestionProgressContext.Provider value={{ statesByQuestionId: states }}>
      {children}
    </QuestionProgressContext.Provider>
  );
}

export function useQuestionProgressContext(
  questionId: string,
): QuestionProgressState {
  const { statesByQuestionId } = useContext(QuestionProgressContext);
  return statesByQuestionId[questionId] ?? "unread";
}
