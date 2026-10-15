import "server-only";

import { and, eq } from "drizzle-orm";

import { readWidgetSettings, type WidgetSettings } from "@/lib/widget";
import { withSystem } from "@/server/db/context";
import { businessProfiles, integrations, organizations } from "@/server/db/schema";

/*
 * The website widget is reached without any session: only its public id
 * (organizations.widget_public_id, printed in the snippet) says which
 * establishment it belongs to. This lookup is the one place that crosses
 * tenants; everything after it runs inside that establishment's RLS context.
 */

const PUBLIC_ID = /^sof_[A-Za-z0-9_-]{16,40}$/;

export interface PublicWidget {
  publicId: string;
  organizationId: string;
  organizationName: string;
  /** False for a suspended establishment: the widget then answers nothing. */
  organizationActive: boolean;
  isDemo: boolean;
  sofiaStatus: "INACTIVE" | "ACTIVE" | "PAUSED";
  timezone: string;
  country: string;
  defaultLanguage: string;
  allowedLanguages: string[];
  assistantName: string;
  whatsappNumber: string | null;
  integrationId: string | null;
  integrationStatus: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  lastSeenAt: Date | null;
  settings: WidgetSettings;
}

export function isWidgetPublicId(value: string): boolean {
  return PUBLIC_ID.test(value);
}

export async function loadPublicWidget(publicId: string): Promise<PublicWidget | null> {
  if (!isWidgetPublicId(publicId)) return null;
  return withSystem(async (tx) => {
    const [row] = await tx
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        status: organizations.status,
        isDemo: organizations.isDemo,
        sofiaStatus: organizations.sofiaStatus,
        timezone: organizations.timezone,
        country: organizations.country,
        defaultLanguage: organizations.defaultLanguage,
        allowedLanguages: organizations.allowedLanguages,
        assistantName: businessProfiles.assistantName,
        whatsappNumber: businessProfiles.whatsappNumber,
        integrationId: integrations.id,
        integrationStatus: integrations.status,
        lastSeenAt: integrations.lastHealthcheckAt,
        config: integrations.config,
      })
      .from(organizations)
      .leftJoin(businessProfiles, eq(businessProfiles.organizationId, organizations.id))
      .leftJoin(integrations, and(eq(integrations.organizationId, organizations.id), eq(integrations.provider, "WEBSITE_WIDGET")))
      .where(eq(organizations.widgetPublicId, publicId))
      .limit(1);
    if (!row) return null;
    return {
      publicId,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationActive: row.status === "ACTIVE",
      isDemo: row.isDemo,
      sofiaStatus: row.sofiaStatus,
      timezone: row.timezone,
      country: row.country,
      defaultLanguage: row.defaultLanguage,
      allowedLanguages: row.allowedLanguages,
      assistantName: row.assistantName ?? "SOFIA",
      whatsappNumber: row.whatsappNumber,
      integrationId: row.integrationId,
      integrationStatus: row.integrationStatus ?? "NOT_CONNECTED",
      lastSeenAt: row.lastSeenAt,
      // No settings saved yet: the defaults, which allow no external site.
      settings: readWidgetSettings(row.config),
    };
  });
}

/** Whether the chat accepts visitors: establishment active and widget switched on. */
export function isWidgetOpen(widget: PublicWidget) {
  return widget.organizationActive && widget.settings.enabled;
}

// The chat window's frame-ancestors is read on every widget page load (src/proxy.ts):
// a short in-memory cache keeps that off the database without delaying a settings change much.
const EMBEDDING_TTL_MS = 30_000;
const embeddingCache = new Map<string, { domains: string[] | null; expiresAt: number }>();

/** Allowed domains of a widget, or null when it does not exist or is closed. */
export async function widgetEmbeddingDomains(publicId: string, now = Date.now()): Promise<string[] | null> {
  const cached = embeddingCache.get(publicId);
  if (cached && cached.expiresAt > now) return cached.domains;
  const widget = await loadPublicWidget(publicId);
  const domains = widget && isWidgetOpen(widget) ? widget.settings.allowedDomains : null;
  if (embeddingCache.size > 5000) embeddingCache.clear();
  embeddingCache.set(publicId, { domains, expiresAt: now + EMBEDDING_TTL_MS });
  return domains;
}

/** Test helper and settings save: forget cached embedding rules. */
export function forgetWidgetEmbedding(publicId?: string) {
  if (publicId) embeddingCache.delete(publicId);
  else embeddingCache.clear();
}
