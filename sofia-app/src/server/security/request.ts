import "server-only";

import { headers } from "next/headers";

import { env } from "@/server/env";

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

const MAX_IP_LENGTH = 64;

export function clientIpFromHeaders(source: Headers, trustProxy: boolean): string | null {
  if (!trustProxy) return null;
  const forwarded = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || source.get("x-real-ip")?.trim();
  if (!candidate || candidate.length > MAX_IP_LENGTH || !/^[0-9a-fA-F:.]+$/.test(candidate)) return null;
  return candidate;
}

/** Client IP and user agent of the current request (server actions, route handlers, pages). */
export async function getRequestMeta(): Promise<RequestMeta> {
  const source = await headers();
  return {
    ipAddress: clientIpFromHeaders(source, env().TRUST_PROXY),
    userAgent: source.get("user-agent")?.slice(0, 512) ?? null,
  };
}
