import { NextResponse } from "next/server";

import {
  isQuestionDifficulty,
  listQuestionFilterOptions,
  listQuestions,
} from "@/lib/interview/questions";
import { paginateItems, parsePositiveInt } from "@/lib/pagination";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const difficultyParam = searchParams.get("difficulty");
  const difficulty = isQuestionDifficulty(difficultyParam)
    ? difficultyParam
    : undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  const [data, filters] = await Promise.all([
    listQuestions({
      category,
      difficulty,
      search,
    }),
    listQuestionFilterOptions(),
  ]);
  const pagination = paginateItems(data, page, pageSize);

  return NextResponse.json({
    data: pagination.items,
    filters,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasPreviousPage: pagination.hasPreviousPage,
      hasNextPage: pagination.hasNextPage,
    },
  });
}
