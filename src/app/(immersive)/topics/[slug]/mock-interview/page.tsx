import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import {
  isVoiceInterviewStage,
  type VoiceInterviewStage,
} from "@/lib/interview/voice-interview-session";

import { TopicVoiceInterviewExperience } from "./_components/topic-voice-interview-experience";

type Params = Promise<{
  slug: string;
}>;

type SearchParams = Promise<{
  stage?: string | string[];
}>;

export const dynamic = "force-dynamic";

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const scope = await resolveVoiceInterviewScope({
    scopeType: "topic",
    scopeSlug: slug,
  });

  if (!scope) {
    return {
      title: "Mock interview not found",
    };
  }

  return {
    title: `${scope.title} Mock Interview | Interview Prep`,
    description: `Practice a scoped mock interview on ${scope.title}.`,
  };
}

export default async function TopicMockInterviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const scope = await resolveVoiceInterviewScope({
    scopeType: "topic",
    scopeSlug: slug,
  });

  if (!scope) {
    notFound();
  }

  const nextPath = `/topics/${scope.slug}/mock-interview`;
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabasePublicEnv) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  } catch {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const rawSearchParams = await searchParams;
  const requestedStage = getSingleValue(rawSearchParams.stage);
  const initialStage: VoiceInterviewStage | undefined = isVoiceInterviewStage(
    requestedStage,
  )
    ? requestedStage
    : undefined;

  return (
    <TopicVoiceInterviewExperience scope={scope} initialStage={initialStage} />
  );
}
