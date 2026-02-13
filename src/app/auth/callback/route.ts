import { NextResponse } from "next/server";

import { normalizeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getBaseAppUrl(requestUrl: URL) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredAppUrl) {
    return requestUrl.origin;
  }

  try {
    return new URL(configuredAppUrl).toString();
  } catch {
    return requestUrl.origin;
  }
}

function redirectWithAuthError(
  requestUrl: URL,
  appUrl: string,
  message: string,
) {
  const errorUrl = new URL("/auth/error", appUrl || requestUrl.origin);
  errorUrl.searchParams.set("message", message);
  return NextResponse.redirect(errorUrl, 303);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const appUrl = getBaseAppUrl(requestUrl);

  if (!code) {
    return redirectWithAuthError(requestUrl, appUrl, "Missing OAuth code.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectWithAuthError(requestUrl, appUrl, error.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const metadata = user.user_metadata as
        | {
            name?: string;
            full_name?: string;
            picture?: string;
            avatar_url?: string;
          }
        | undefined;

      // Keep the auth flow resilient: profile sync should not block sign-in.
      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: metadata?.full_name ?? metadata?.name ?? null,
          avatar_url: metadata?.avatar_url ?? metadata?.picture ?? null,
        },
        { onConflict: "id" },
      );
    }

    const redirectUrl = new URL(nextPath, appUrl);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    const message =
      error instanceof Error
        ? `Auth callback error: ${error.message}`
        : "Auth callback error.";

    return redirectWithAuthError(requestUrl, appUrl, message);
  }
}
