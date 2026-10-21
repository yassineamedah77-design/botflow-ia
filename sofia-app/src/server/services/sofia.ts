import "server-only";

import { eq } from "drizzle-orm";

import type { TenantContext } from "@/server/auth/context";
import { describeAiConfiguration } from "@/server/ai/config";
import { withTenant, type Transaction } from "@/server/db/context";
import { organizations } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";
import { getSetupChecklist } from "./organizations";

/*
 * Turning SOFIA on and off for an establishment (onboarding step 10). Once
 * active she answers on every connected channel; a pause stops every answer
 * at once, and the team answers alone until she is resumed.
 */

export type SofiaStatus = "INACTIVE" | "ACTIVE" | "PAUSED";

export interface ReadinessCheck {
  key: "profile" | "services" | "hours" | "ai";
  label: string;
  ok: boolean;
  /** Where to fix it, for the checks the establishment controls. */
  href: string | null;
}

export interface SofiaReadiness {
  ready: boolean;
  checks: ReadinessCheck[];
}

/** What SOFIA needs before answering anyone: what to say, and a model to say it with. */
export async function getSofiaReadiness(tx: Transaction, organizationId: string): Promise<SofiaReadiness> {
  const checklist = await getSetupChecklist(tx, organizationId);
  const ai = describeAiConfiguration();
  const checks: ReadinessCheck[] = [
    { key: "profile", label: "Fiche de l'établissement complète (adresse, téléphone)", ok: checklist.profile, href: "/onboarding/establishment" },
    { key: "services", label: "Au moins une prestation avec son prix", ok: checklist.services, href: "/onboarding/services" },
    { key: "hours", label: "Horaires d'ouverture", ok: checklist.hours, href: "/onboarding/hours" },
    { key: "ai", label: "Moteur d'IA configuré par BotFlow IA", ok: ai.configured, href: null },
  ];
  return { ready: checks.every((check) => check.ok), checks };
}

const ACTIONS: Record<"ACTIVE" | "PAUSED", { audit: string; event: string }> = {
  ACTIVE: { audit: "sofia.activated", event: "SOFIA activated" },
  PAUSED: { audit: "sofia.paused", event: "SOFIA paused" },
};

export async function setSofiaStatus(ctx: TenantContext, target: "ACTIVE" | "PAUSED", meta: RequestMeta): Promise<SofiaStatus> {
  requirePermission(ctx.can("sofia:toggle"), "Seuls les propriétaires et administrateurs peuvent activer ou mettre SOFIA en pause.");
  const organizationId = ctx.organization.id;
  return withTenant(organizationId, async (tx) => {
    const [organization] = await tx
      .select({ sofiaStatus: organizations.sofiaStatus })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .for("update");
    if (!organization) throw new AppError("NOT_FOUND", "Établissement introuvable.");
    if (organization.sofiaStatus === target) return target;
    if (target === "PAUSED" && organization.sofiaStatus !== "ACTIVE") {
      throw new AppError("VALIDATION", "SOFIA n'est pas active : il n'y a rien à mettre en pause.");
    }
    if (target === "ACTIVE") {
      const readiness = await getSofiaReadiness(tx, organizationId);
      const missing = readiness.checks.filter((check) => !check.ok).map((check) => check.label.toLowerCase());
      if (missing.length > 0) throw new AppError("VALIDATION", `Avant d'activer SOFIA, il manque : ${missing.join(", ")}.`);
    }
    await tx.update(organizations).set({ sofiaStatus: target, updatedAt: new Date() }).where(eq(organizations.id, organizationId));
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: target === "ACTIVE" && organization.sofiaStatus === "PAUSED" ? "sofia.resumed" : ACTIONS[target].audit,
      entityType: "organization",
      entityId: organizationId,
      metadata: { from: organization.sofiaStatus, to: target },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordEvent(tx, {
      organizationId,
      type: "SYSTEM",
      message: ACTIONS[target].event,
      entityType: "organization",
      entityId: organizationId,
      details: { from: organization.sofiaStatus, to: target },
    });
    return target;
  });
}
