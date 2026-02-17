export const EXPERIENCE_LEVELS = [
  "junior",
  "mid",
  "senior",
  "lead",
  "architect",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
