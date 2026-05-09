/** Short TTL key: Redis allows healing `maeng_device_id` cookie if request arrives before browser stores it. */
export function deviceBindGraceKey(userId: string): string {
  return `device_bind_grace:v1:${userId}`;
}

/** Shared cookie/domain rules for `maeng_device_id` across Server Actions & Edge middleware. */

export function getSafeCookieDomain(
  rawDomain: string | undefined,
  requestHost: string | null | undefined
): string | undefined {
  if (!rawDomain || !requestHost) return undefined;

  const normalizedDomain = rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/^\.+/, "");

  const normalizedHost = requestHost
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/^\.+/, "");

  if (!normalizedDomain || !normalizedHost) return undefined;

  if (normalizedDomain === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedDomain)) {
    return undefined;
  }

  if (normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`)) {
    return normalizedDomain;
  }

  return undefined;
}

export function maengDeviceIdCookieAttrs(
  requestHostHeader: string | null | undefined
): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  domain?: string;
  maxAge: number;
} {
  const hostPart = requestHostHeader?.trim().split(",")[0]?.split(":")[0]?.toLowerCase() ?? null;
  const domain = getSafeCookieDomain(process.env.NEXT_PUBLIC_APP_DOMAIN, hostPart ?? null);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: 60 * 60 * 24 * 365,
  };
}
