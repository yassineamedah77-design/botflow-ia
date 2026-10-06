/**
 * Only same-site relative paths are accepted as post-login destinations
 * (prevents open redirects such as `?next=//evil.example`).
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  // Never send a user back to an auth page after signing in.
  if (/^\/(login|signup|session-expired)(\/|\?|$)/.test(value)) return fallback;
  return value;
}
