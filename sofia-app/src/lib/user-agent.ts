/** Human-readable device label from a User-Agent string ("Chrome sur macOS"). */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";
  const browser =
    /Edg\//.test(userAgent)
      ? "Edge"
      : /OPR\//.test(userAgent)
        ? "Opera"
        : /Firefox\//.test(userAgent)
          ? "Firefox"
          : /Chrome\//.test(userAgent)
            ? "Chrome"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : "Navigateur";
  const system = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "système inconnu";
  return `${browser} sur ${system}`;
}
