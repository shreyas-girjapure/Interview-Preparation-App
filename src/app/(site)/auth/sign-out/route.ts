import { NextResponse } from "next/server";

import { normalizeNextPath } from "@/lib/auth/redirect";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"), "/");
  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();

  const redirectUrl = new URL(nextPath, NEXT_PUBLIC_APP_URL);
  return NextResponse.redirect(redirectUrl, 303);
}
