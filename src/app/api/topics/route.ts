import { NextResponse } from "next/server";

import { listTopics } from "@/lib/interview/questions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  const data = await listTopics({ search });

  return NextResponse.json({ data });
}
