import { NextResponse } from "next/server";

import {
  isQuestionDifficulty,
  listQuestionFilterOptions,
  listQuestions,
} from "@/lib/interview/questions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const difficultyParam = searchParams.get("difficulty");
  const difficulty = isQuestionDifficulty(difficultyParam)
    ? difficultyParam
    : undefined;
  const search = searchParams.get("search") ?? undefined;

  const [data, filters] = await Promise.all([
    listQuestions({
      category,
      difficulty,
      search,
    }),
    listQuestionFilterOptions(),
  ]);

  return NextResponse.json({
    data,
    filters,
  });
}
