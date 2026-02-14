import { NextResponse } from "next/server";

import { getTopicBySlug } from "@/lib/interview/questions";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params;
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    return NextResponse.json(
      { error: "Topic not found" },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({ data: topic });
}
