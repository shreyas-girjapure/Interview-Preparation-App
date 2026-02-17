import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

function isUsedRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withCode = error as { code?: string; message?: string };
  const code = withCode.code?.toLowerCase() ?? "";
  const message = withCode.message?.toLowerCase() ?? "";

  return (
    code.includes("refresh_token_already_used") ||
    message.includes("refresh token") ||
    message.includes("already used")
  );
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
) {
  const supabaseCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter(
      (name) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token") || name.includes("auth-token")),
    );

  for (const name of supabaseCookieNames) {
    request.cookies.delete(name);
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
    });
  }
}

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicConfig();

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    if (isUsedRefreshTokenError(error)) {
      clearSupabaseAuthCookies(request, response);
      return response;
    }

    throw error;
  }

  return response;
}
