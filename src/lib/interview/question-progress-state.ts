export const QUESTION_PROGRESS_STATES = [
  "unread",
  "read",
  "review_later",
] as const;

export type QuestionProgressState = (typeof QUESTION_PROGRESS_STATES)[number];

type ProgressStateInput = {
  is_read: boolean;
  review_status: "got_it" | "review_later" | null;
};

export function labelQuestionProgressState(state: QuestionProgressState) {
  if (state === "review_later") {
    return "Revisit later";
  }

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

  if (row.review_status === "review_later") {
    return "review_later";
  }

  return "read";
}
