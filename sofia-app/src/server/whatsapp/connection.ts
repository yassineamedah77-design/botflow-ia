import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { formatPhone, normalizePhone } from "@/lib/phone";
import type { WhatsappConnectionInput } from "@/lib/validation/whatsapp";
import type { TenantContext } from "@/server/auth/context";
import { withSystem, withTenant, type Transaction } from "@/server/db/context";
import { integrations, organizations } from "@/server/db/schema";
import { AppError, isUniqueViolation } from "@/server/errors";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import { logger } from "@/server/observability/logger";
import { decryptSecret, encryptSecret } from "@/server/security/crypto";
import { consumeRateLimit } from "@/server/security/rate-limit";
import type { RequestMeta } from "@/server/security/request";
import { requirePermission } from "@/server/services/guards";
import { notify } from "@/server/services/notifications";

import { GraphError, getPhoneNumber, listBusinessPhoneNumbers, subscribeApp, type GraphOptions } from "./graph";

/*
 * Connecting a WhatsApp Business number: the establishment gives the ids of
 * its number and account and a permanent access token (a Meta "system user"
 * token). SOFIA checks all three with Meta, subscribes BotFlow's app to the
 * account's webhooks, and only then shows "Connecté". The token is encrypted
 * at rest and never sent back to the browser.
 */

export interface WhatsappCredentials {
  accessToken: string;
}

export interface WhatsappConfig {
  businessAccountId: string;
  verifiedName: string | null;
  qualityRating: string | null;
}

/** Test seam: the Graph API without the network. */
export type GraphOverrides = Pick<GraphOptions, "fetch" | "sleep" | "baseUrl">;

export function readWhatsappConfig(config: Record<string, unknown> | null | undefined): WhatsappConfig {
  const value = config ?? {};
  return {
    businessAccountId: typeof value.businessAccountId === "string" ? value.businessAccountId : "",
    verifiedName: typeof value.verifiedName === "string" ? value.verifiedName : null,
    qualityRating: typeof value.qualityRating === "string" ? value.qualityRating : null,
  };
}

export function readWhatsappCredentials(encrypted: string | null): WhatsappCredentials | null {
  if (!encrypted) return null;
  try {
    const value = JSON.parse(decryptSecret(encrypted)) as Partial<WhatsappCredentials>;
    return typeof value.accessToken === "string" ? { accessToken: value.accessToken } : null;
  } catch (error) {
    logger.error("WhatsApp credentials unreadable", { err: error });
    return null;
  }
}

/** Meta's error, as the establishment can act on it. */
function connectionErrorMessage(error: unknown): string {
  if (!(error instanceof GraphError)) return "Meta n'a pas pu être joint. Réessayez dans quelques minutes.";
  if (error.isAuthError) return "Meta refuse ce jeton d'accès : il est expiré, révoqué ou incomplet. Générez un jeton permanent d'utilisateur système et recollez-le.";
  if (error.code === 100 || error.httpStatus === 404) {
    return "Meta ne trouve pas ce numéro ou ce compte avec ce jeton. Vérifiez les deux identifiants, et que l'utilisateur système a bien accès au compte WhatsApp Business.";
  }
  if (error.code === 10 || error.code === 200 || error.httpStatus === 403) {
    return "Ce jeton n'a pas les autorisations nécessaires : cochez whatsapp_business_messaging et whatsapp_business_management en le générant.";
  }
  if (error.isTransient) return "Meta est momentanément indisponible. Réessayez dans quelques minutes.";
  return `Meta a refusé la connexion : ${error.message}`;
}

export async function connectWhatsapp(
  ctx: TenantContext,
  input: WhatsappConnectionInput,
  meta: RequestMeta,
  options: { graph?: GraphOverrides; now?: Date } = {},
) {
  requirePermission(ctx.can("integrations:manage"), "Seuls les propriétaires et administrateurs peuvent connecter WhatsApp.");
  const organizationId = ctx.organization.id;
  const now = options.now ?? new Date();
  const isDemo = await withTenant(organizationId, async (tx) => {
    const [organization] = await tx.select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    return organization?.isDemo ?? true;
  });
  if (isDemo) throw new AppError("VALIDATION", "Un établissement de démonstration ne peut pas être relié à un vrai numéro WhatsApp.");
  const limit = await consumeRateLimit("whatsappConnectionsByOrganization", organizationId);
  if (!limit.allowed) throw new AppError("RATE_LIMITED", "Trop de tentatives de connexion. Réessayez dans une heure.");

  const graph: GraphOptions = { ...options.graph, accessToken: input.accessToken };
  let phone;
  try {
    phone = await getPhoneNumber(input.phoneNumberId, graph);
    const numbers = await listBusinessPhoneNumbers(input.businessAccountId, graph);
    if (!numbers.data.some((number) => number.id === input.phoneNumberId)) {
      throw new AppError("VALIDATION", "Ce numéro n'appartient pas à ce compte WhatsApp Business. Vérifiez les deux identifiants dans le WhatsApp Manager.");
    }
    const subscribed = await subscribeApp(input.businessAccountId, graph);
    if (!subscribed.success) throw new GraphError("subscribed_apps answered success=false", 200, -1);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("WhatsApp connection refused by Meta", { organizationId, err: error });
    throw new AppError("VALIDATION", connectionErrorMessage(error), { cause: error });
  }

  const e164 = normalizePhone(phone.display_phone_number.startsWith("+") ? phone.display_phone_number : `+${phone.display_phone_number}`);
  const displayName = e164 ? formatPhone(e164) : phone.display_phone_number;
  const config: WhatsappConfig = {
    businessAccountId: input.businessAccountId,
    verifiedName: phone.verified_name ?? null,
    qualityRating: phone.quality_rating ?? null,
  };
  const values = {
    status: "CONNECTED" as const,
    externalAccountId: input.phoneNumberId,
    displayName,
    credentialsEncrypted: encryptSecret(JSON.stringify({ accessToken: input.accessToken } satisfies WhatsappCredentials)),
    config: { ...config },
    lastError: null,
    lastErrorAt: null,
    connectedAt: now,
    lastHealthcheckAt: now,
    updatedAt: now,
  };

  try {
    await withTenant(organizationId, async (tx) => {
      const [current] = await tx
        .select({ id: integrations.id })
        .from(integrations)
        .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WHATSAPP_CLOUD")))
        .limit(1)
        .for("update");
      const id = current
        ? (await tx.update(integrations).set(values).where(eq(integrations.id, current.id)).returning({ id: integrations.id }))[0]!.id
        : (await tx.insert(integrations).values({ organizationId, provider: "WHATSAPP_CLOUD", ...values }).returning({ id: integrations.id }))[0]!.id;
      await recordAudit(tx, {
        organizationId,
        actorType: "USER",
        actorUserId: ctx.user.id,
        action: "integration.whatsapp_connected",
        entityType: "integration",
        entityId: id,
        metadata: { phoneNumberId: input.phoneNumberId, businessAccountId: input.businessAccountId, displayName },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      await recordEvent(tx, {
        organizationId,
        type: "SYSTEM",
        message: "WhatsApp number connected",
        entityType: "integration",
        entityId: id,
        details: { displayName, qualityRating: config.qualityRating },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error, "integrations_provider_account_unique")) {
      throw new AppError("CONFLICT", "Ce numéro WhatsApp est déjà connecté à un autre établissement dans SOFIA.");
    }
    throw error;
  }
  return { displayName, verifiedName: config.verifiedName };
}

/** SOFIA stops sending on this number and forgets the token; the number can then be connected elsewhere. */
export async function disconnectWhatsapp(ctx: TenantContext, meta: RequestMeta, now = new Date()) {
  requirePermission(ctx.can("integrations:manage"), "Seuls les propriétaires et administrateurs peuvent déconnecter WhatsApp.");
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const [current] = await tx
      .update(integrations)
      .set({ status: "DISCONNECTED", externalAccountId: null, credentialsEncrypted: null, lastError: null, lastErrorAt: null, updatedAt: now })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WHATSAPP_CLOUD")))
      .returning({ id: integrations.id, displayName: integrations.displayName });
    if (!current) throw new AppError("NOT_FOUND", "WhatsApp n'est pas connecté.");
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "integration.whatsapp_disconnected",
      entityType: "integration",
      entityId: current.id,
      metadata: { displayName: current.displayName },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

export interface WhatsappChannel {
  status: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  displayName: string | null;
  config: WhatsappConfig;
  connectedAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
}

export async function getWhatsappChannel(tx: Transaction, organizationId: string): Promise<WhatsappChannel> {
  const [integration] = await tx
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WHATSAPP_CLOUD")))
    .limit(1);
  return {
    status: integration?.status ?? "NOT_CONNECTED",
    displayName: integration?.displayName ?? null,
    config: readWhatsappConfig(integration?.config),
    connectedAt: integration?.connectedAt ?? null,
    lastError: integration?.lastError ?? null,
    lastErrorAt: integration?.lastErrorAt ?? null,
  };
}

/**
 * Meta stopped accepting the token: the channel turns "Erreur", the team is
 * told once, and nothing more is sent until the number is reconnected.
 * Runs in its own transaction, so it survives the caller's rollback.
 */
export async function markWhatsappTokenRejected(organizationId: string, integrationId: string, detail: string, now = new Date()) {
  await withTenant(organizationId, async (tx) => {
    const [updated] = await tx
      .update(integrations)
      .set({ status: "ERROR", lastError: "Meta refuse le jeton d'accès : reconnectez le numéro.", lastErrorAt: now, updatedAt: now })
      .where(and(eq(integrations.id, integrationId), eq(integrations.status, "CONNECTED")))
      .returning({ id: integrations.id });
    if (!updated) return;
    await notify(tx, {
      organizationId,
      type: "INTEGRATION_ERROR",
      title: "WhatsApp est déconnecté",
      body: "Meta refuse le jeton d'accès de votre numéro : SOFIA ne peut plus envoyer de message. Reconnectez le numéro dans Canaux → WhatsApp.",
      linkUrl: "/channels/whatsapp",
      entityType: "integration",
      entityId: integrationId,
      recipients: "team",
    });
    await recordEvent(tx, {
      organizationId,
      type: "INTEGRATION_ERROR",
      level: "ERROR",
      message: "WhatsApp access token rejected by Meta",
      entityType: "integration",
      entityId: integrationId,
      details: { detail },
    });
  });
}

export interface WhatsappRoute {
  organizationId: string;
  integrationId: string;
  phoneNumberId: string;
  status: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  organizationActive: boolean;
  sofiaStatus: "INACTIVE" | "ACTIVE" | "PAUSED";
  credentials: WhatsappCredentials | null;
}

/**
 * Which establishment a webhook belongs to, from the number it was sent to.
 * Like the widget's public id, this lookup is the one place that crosses
 * tenants; everything after it runs in that establishment's RLS context.
 */
export async function findWhatsappRoute(phoneNumberId: string): Promise<WhatsappRoute | null> {
  return withSystem(async (tx) => {
    const [row] = await tx
      .select({
        organizationId: integrations.organizationId,
        integrationId: integrations.id,
        status: integrations.status,
        credentialsEncrypted: integrations.credentialsEncrypted,
        organizationStatus: organizations.status,
        sofiaStatus: organizations.sofiaStatus,
      })
      .from(integrations)
      .innerJoin(organizations, eq(organizations.id, integrations.organizationId))
      .where(and(eq(integrations.provider, "WHATSAPP_CLOUD"), eq(integrations.externalAccountId, phoneNumberId), sql`${integrations.status} <> 'DISCONNECTED'`))
      .limit(1);
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      integrationId: row.integrationId,
      phoneNumberId,
      status: row.status,
      organizationActive: row.organizationStatus === "ACTIVE",
      sofiaStatus: row.sofiaStatus,
      credentials: readWhatsappCredentials(row.credentialsEncrypted),
    };
  });
}
