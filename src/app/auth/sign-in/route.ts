import { NextResponse } from "next/server";

import { buildAuthCallbackUrl, normalizeNextPath } from "@/lib/auth/redirect";
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
  const appUrl = getBaseAppUrl(requestUrl);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const redirectTo = buildAuthCallbackUrl(appUrl, nextPath);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error || !data.url) {
      return redirectWithAuthError(
        requestUrl,
        appUrl,
        error?.message ?? "Unable to start Google sign-in.",
      );
    }

    return NextResponse.redirect(data.url, 303);
  } catch (error) {
    const message =
      error instanceof Error
        ? `Auth configuration error: ${error.message}`
        : "Auth configuration error.";

    return redirectWithAuthError(requestUrl, appUrl, message);
  }
}
