import { NextResponse } from "next/server";

import { getQuestionBySlug } from "@/lib/interview/questions";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const question = getQuestionBySlug(slug);

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({ data: question });
}
