export function toAbsoluteVoiceInterviewCitationUrl(
  href: string,
  baseUrl?: string,
) {
  const normalizedHref = href.trim();

  if (!normalizedHref) {
    return normalizedHref;
  }

  const resolvedBaseUrl =
    baseUrl?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!resolvedBaseUrl) {
    return normalizedHref;
  }

  try {
    return new URL(normalizedHref, resolvedBaseUrl).toString();
  } catch {
    return normalizedHref;
  }
}
