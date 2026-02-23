export const QUESTION_PROGRESS_STATES = ["unread", "read"] as const;

export type QuestionProgressState = (typeof QUESTION_PROGRESS_STATES)[number];

type ProgressStateInput = {
  is_read: boolean;
  review_status: "got_it" | "review_later" | null;
};

export function labelQuestionProgressState(state: QuestionProgressState) {
  if (state === "read") {
    return "Read";
  }
  return "Unread";
}

export function toQuestionProgressState(
  row: ProgressStateInput | null | undefined,
): QuestionProgressState {
  if (!row?.is_read) {
    return "unread";
  }
  return "read";
}
