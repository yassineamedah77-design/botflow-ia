import "server-only";

import { and, count, eq, gte } from "drizzle-orm";

import { isOriginAllowed, readWidgetSettings, whatsappDigits, type WidgetSettings } from "@/lib/widget";
import type { WidgetSettingsInput } from "@/lib/validation/widget";
import type { TenantContext } from "@/server/auth/context";
import { withTenant, type Transaction } from "@/server/db/context";
import { businessProfiles, conversations, integrations } from "@/server/db/schema";
import { recordAudit } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";
import { forgetWidgetEmbedding } from "@/server/widget/public";

import { requirePermission } from "./guards";

/*
 * The website widget channel, team side: its settings (allowed domains,
 * appearance, WhatsApp button) and its real state. "Connecté" is set by the
 * widget itself, the first time it loads on an allowed domain.
 */

export interface WidgetChannel {
  publicId: string;
  status: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  /** Domain the widget was last seen on. */
  seenOn: string | null;
  connectedAt: Date | null;
  lastSeenAt: Date | null;
  settings: WidgetSettings;
  /** Whether the "Continue on WhatsApp" button can show: the establishment has a WhatsApp number. */
  hasWhatsappNumber: boolean;
  conversationsLast30Days: number;
}

export async function getWidgetChannel(tx: Transaction, organization: { id: string; widgetPublicId: string }, now = new Date()): Promise<WidgetChannel> {
  const [integration] = await tx
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organization.id), eq(integrations.provider, "WEBSITE_WIDGET")))
    .limit(1);
  const [profile] = await tx
    .select({ whatsappNumber: businessProfiles.whatsappNumber })
    .from(businessProfiles)
    .where(eq(businessProfiles.organizationId, organization.id))
    .limit(1);
  const [recent] = await tx
    .select({ value: count() })
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organization.id),
        eq(conversations.channel, "WEBSITE"),
        gte(conversations.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
      ),
    );
  return {
    publicId: organization.widgetPublicId,
    status: integration?.status ?? "NOT_CONNECTED",
    seenOn: integration?.status === "CONNECTED" ? integration.displayName : null,
    connectedAt: integration?.connectedAt ?? null,
    lastSeenAt: integration?.lastHealthcheckAt ?? null,
    settings: readWidgetSettings(integration?.config),
    hasWhatsappNumber: whatsappDigits(profile?.whatsappNumber) !== null,
    conversationsLast30Days: recent?.value ?? 0,
  };
}

export async function saveWidgetSettings(ctx: TenantContext, input: WidgetSettingsInput, meta: RequestMeta) {
  requirePermission(ctx.can("integrations:manage"), "Seuls les propriétaires et administrateurs peuvent modifier le widget.");
  const organizationId = ctx.organization.id;
  const now = new Date();
  await withTenant(organizationId, async (tx) => {
    const [current] = await tx
      .select()
      .from(integrations)
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WEBSITE_WIDGET")))
      .limit(1)
      .for("update");

    // Switched off: the channel is disconnected. Back on, or moved off the domain it was seen on: to be verified again.
    let status = current?.status ?? "NOT_CONNECTED";
    let displayName = current?.displayName ?? null;
    if (!input.enabled) status = "DISCONNECTED";
    else if (status === "DISCONNECTED") status = "NOT_CONNECTED";
    if (status === "CONNECTED" && (!displayName || !isOriginAllowed(`https://${displayName}`, input.allowedDomains))) {
      status = "NOT_CONNECTED";
      displayName = null;
    }

    const values = { config: { ...input }, status, displayName, updatedAt: now };
    if (current) {
      await tx.update(integrations).set(values).where(eq(integrations.id, current.id));
    } else {
      await tx.insert(integrations).values({ organizationId, provider: "WEBSITE_WIDGET", ...values });
    }
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "integration.widget_updated",
      entityType: "integration",
      entityId: current?.id,
      metadata: { enabled: input.enabled, domains: input.allowedDomains, whatsappButton: input.whatsappButton },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
  forgetWidgetEmbedding(ctx.organization.widgetPublicId);
}
