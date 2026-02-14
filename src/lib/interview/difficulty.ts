export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
