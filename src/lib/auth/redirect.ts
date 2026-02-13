const DEFAULT_NEXT_PATH = "/questions";

export function normalizeNextPath(
  nextPath: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH,
) {
  const value = nextPath?.trim();

  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function buildAuthCallbackUrl(appUrl: string, nextPath?: string | null) {
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", normalizeNextPath(nextPath));
  return callbackUrl.toString();
}
