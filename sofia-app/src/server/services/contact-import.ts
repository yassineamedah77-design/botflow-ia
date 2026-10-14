import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  analyzeClientFile,
  decodeFileBytes,
  ClientFileError,
  IMPORT_MAX_BYTES,
  parseClientFile,
  type AnalyzedFile,
  type ImportMapping,
  type ImportWarning,
  type NormalizedContact,
  type RowRejection,
} from "@/lib/client-file";
import { IMPORT_DECLARATION } from "@/lib/contacts";
import type { TenantContext } from "@/server/auth/context";
import { withTenant, type Transaction } from "@/server/db/context";
import { consentRecords, contactImports, leadStatusChanges, leads } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";
import { nextMarketingConsent } from "./leads";
import { notify } from "./notifications";

/*
 * Imports an establishment's client file (CSV) into the CRM. One transaction:
 * the import either fully happens or not at all. Rows already in the CRM
 * (same client id, phone or email) are completed, never duplicated, and a
 * consent the person withdrew is never overwritten by the file.
 */

type LeadRow = typeof leads.$inferSelect;

export interface ImportReport {
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  rejected: RowRejection[];
  rejectedCount: number;
  warnings: Partial<Record<ImportWarning, number>>;
  withoutLastVisit: number;
  consentGranted: number;
  consentDenied: number;
}

const REJECTIONS_SHOWN = 50;
const LOOKUP_CHUNK = 1000;
const WRITE_CHUNK = 500;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function readClientFile(file: File) {
  if (file.size === 0) throw new AppError("VALIDATION", "Le fichier est vide.");
  if (file.size > IMPORT_MAX_BYTES) throw new AppError("VALIDATION", "Le fichier dépasse 4 Mo. Découpez-le en plusieurs fichiers.");
  try {
    return parseClientFile(decodeFileBytes(new Uint8Array(await file.arrayBuffer())));
  } catch (error) {
    if (error instanceof ClientFileError) throw new AppError("VALIDATION", error.message);
    throw error;
  }
}

function validateMapping(mapping: ImportMapping, headers: string[]) {
  for (const [field, header] of Object.entries(mapping)) {
    if (header && !headers.includes(header)) throw new AppError("VALIDATION", `La colonne « ${header} » n'existe pas dans le fichier.`);
    if (!header) delete mapping[field as keyof ImportMapping];
  }
  if (!mapping.phone && !mapping.email) {
    throw new AppError("VALIDATION", "Associez au moins la colonne du téléphone ou celle de l'email.");
  }
}

/** Existing CRM contacts matching the file by client id, phone or email. */
async function findExisting(tx: Transaction, organizationId: string, contacts: NormalizedContact[]) {
  const ids = [...new Set(contacts.map((contact) => contact.externalId).filter((value): value is string => Boolean(value)))];
  const phones = [...new Set(contacts.map((contact) => contact.phone).filter((value): value is string => Boolean(value)))];
  const emails = [...new Set(contacts.map((contact) => contact.email).filter((value): value is string => Boolean(value)))];
  const found = new Map<string, LeadRow>();
  const lookups: Array<[keyof Pick<LeadRow, "externalId" | "phone" | "email">, string[]]> = [
    ["externalId", ids],
    ["phone", phones],
    ["email", emails],
  ];
  for (const [column, values] of lookups) {
    for (const chunk of chunks(values, LOOKUP_CHUNK)) {
      const rows = await tx
        .select()
        .from(leads)
        .where(and(eq(leads.organizationId, organizationId), inArray(leads[column], chunk)));
      for (const row of rows) found.set(row.id, row);
    }
  }
  const byExternalId = new Map<string, LeadRow>();
  const byPhone = new Map<string, LeadRow>();
  const byEmail = new Map<string, LeadRow>();
  for (const row of found.values()) {
    if (row.externalId) byExternalId.set(row.externalId, row);
    if (row.phone) byPhone.set(row.phone, row);
    if (row.email) byEmail.set(row.email, row);
  }
  return {
    match(contact: NormalizedContact): LeadRow | undefined {
      return (
        (contact.externalId ? byExternalId.get(contact.externalId) : undefined) ??
        (contact.phone ? byPhone.get(contact.phone) : undefined) ??
        (contact.email ? byEmail.get(contact.email) : undefined)
      );
    },
    owner(column: "phone" | "email", value: string | null) {
      if (!value) return undefined;
      return column === "phone" ? byPhone.get(value) : byEmail.get(value);
    },
  };
}

function report(analysis: AnalyzedFile, totalRows: number, toCreate: number, toUpdate: number, rejected: RowRejection[]): ImportReport {
  return {
    totalRows,
    toCreate,
    toUpdate,
    rejected: rejected.slice(0, REJECTIONS_SHOWN),
    rejectedCount: rejected.length,
    warnings: analysis.warnings,
    withoutLastVisit: analysis.withoutLastVisit,
    consentGranted: analysis.contacts.filter((contact) => contact.marketingConsent === "GRANTED").length,
    consentDenied: analysis.contacts.filter((contact) => contact.marketingConsent === "DENIED").length,
  };
}

/** Dry run: what the import would do, without writing anything. */
export async function previewContactImport(ctx: TenantContext, file: File, mapping: ImportMapping): Promise<ImportReport> {
  requirePermission(ctx.can("leads:import"), "Seuls les propriétaires et administrateurs peuvent importer un fichier clients.");
  const table = await readClientFile(file);
  validateMapping(mapping, table.headers);
  const analysis = analyzeClientFile(table, mapping, ctx.organization.country);
  return withTenant(ctx.organization.id, async (tx) => {
    const existing = await findExisting(tx, ctx.organization.id, analysis.contacts);
    const matched = new Set<string>();
    let toCreate = 0;
    const rejected = [...analysis.rejected];
    for (const contact of analysis.contacts) {
      const lead = existing.match(contact);
      if (!lead) toCreate++;
      else if (matched.has(lead.id)) rejected.push({ line: contact.line, reason: "Correspond au même contact qu'une ligne précédente" });
      else matched.add(lead.id);
    }
    rejected.sort((a, b) => a.line - b.line);
    return report(analysis, table.rows.length, toCreate, matched.size, rejected);
  });
}

function mergeExisting(lead: LeadRow, contact: NormalizedContact, importedAt: Date) {
  const later = (current: Date | null, incoming: Date | null) => (!incoming ? current : !current || incoming > current ? incoming : current);
  const earlier = (current: Date | null, incoming: Date | null) => (!incoming ? current : !current || incoming < current ? incoming : current);
  const consent = nextMarketingConsent(lead.marketingConsent, contact.marketingConsent, Boolean(lead.optedOutAt));
  return {
    values: {
      firstName: lead.firstName ?? contact.firstName,
      lastName: lead.lastName ?? contact.lastName,
      externalId: lead.externalId ?? contact.externalId,
      isExistingClient: true,
      visitCount: Math.max(lead.visitCount, contact.visitCount ?? 0),
      firstVisitAt: earlier(lead.firstVisitAt, contact.firstVisitAt),
      lastAppointmentAt: later(lead.lastAppointmentAt, contact.lastVisitAt),
      lifetimeValueCents:
        contact.lifetimeValueCents === null ? lead.lifetimeValueCents : Math.max(lead.lifetimeValueCents ?? 0, contact.lifetimeValueCents),
      ...(consent ? { marketingConsent: consent, marketingConsentUpdatedAt: importedAt } : {}),
    },
    consent,
  };
}

export interface ImportResult extends ImportReport {
  importId: string;
}

export async function runContactImport(
  ctx: TenantContext,
  input: { file: File; mapping: ImportMapping; declarationAccepted: boolean },
  meta: RequestMeta,
): Promise<ImportResult> {
  requirePermission(ctx.can("leads:import"), "Seuls les propriétaires et administrateurs peuvent importer un fichier clients.");
  if (!input.declarationAccepted) {
    throw new AppError("VALIDATION", "Confirmez la déclaration sur l'origine des données avant d'importer.");
  }
  const table = await readClientFile(input.file);
  validateMapping(input.mapping, table.headers);
  const analysis = analyzeClientFile(table, input.mapping, ctx.organization.country);
  const organizationId = ctx.organization.id;
  const importId = randomUUID();
  const importedAt = new Date();

  return withTenant(organizationId, async (tx) => {
    const existing = await findExisting(tx, organizationId, analysis.contacts);
    const rejected = [...analysis.rejected];
    const toInsert: Array<typeof leads.$inferInsert> = [];
    const toUpdate: Array<{ id: string; values: ReturnType<typeof mergeExisting>["values"] }> = [];
    const consents: Array<typeof consentRecords.$inferInsert> = [];
    const proof = (contact: NormalizedContact) => ({ importId, line: contact.line, column: input.mapping.marketingConsent ?? null, value: contact.consentValue });

    const updated = new Set<string>();
    for (const contact of analysis.contacts) {
      const lead = existing.match(contact);
      if (lead) {
        if (updated.has(lead.id)) {
          rejected.push({ line: contact.line, reason: "Correspond au même contact qu'une ligne précédente" });
          continue;
        }
        updated.add(lead.id);
        const merged = mergeExisting(lead, contact, importedAt);
        // Fill a missing phone or email only when no other contact already uses it.
        const values: Record<string, unknown> = { ...merged.values };
        if (!lead.phone && contact.phone && !existing.owner("phone", contact.phone)) values.phone = contact.phone;
        if (!lead.email && contact.email && !existing.owner("email", contact.email)) values.email = contact.email;
        toUpdate.push({ id: lead.id, values: values as ReturnType<typeof mergeExisting>["values"] });
        if (merged.consent) {
          consents.push({ organizationId, leadId: lead.id, purpose: "MARKETING", status: merged.consent, source: "client_file_import", proof: proof(contact), recordedByUserId: ctx.user.id });
        }
        continue;
      }
      const id = randomUUID();
      toInsert.push({
        id,
        organizationId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        externalId: contact.externalId,
        source: "IMPORT",
        status: "COMPLETED",
        isExistingClient: true,
        visitCount: contact.visitCount ?? 0,
        firstVisitAt: contact.firstVisitAt,
        lastAppointmentAt: contact.lastVisitAt,
        lifetimeValueCents: contact.lifetimeValueCents,
        lastInteractionAt: contact.lastVisitAt,
        marketingConsent: contact.marketingConsent,
        marketingConsentUpdatedAt: contact.marketingConsent === "UNKNOWN" ? null : importedAt,
        importId,
        createdAt: importedAt,
      });
      if (contact.marketingConsent !== "UNKNOWN") {
        consents.push({ organizationId, leadId: id, purpose: "MARKETING", status: contact.marketingConsent, source: "client_file_import", proof: proof(contact), recordedByUserId: ctx.user.id });
      }
    }
    rejected.sort((a, b) => a.line - b.line);
    const result = report(analysis, table.rows.length, toInsert.length, toUpdate.length, rejected);

    await tx.insert(contactImports).values({
      id: importId,
      organizationId,
      fileName: input.file.name.slice(0, 200) || "fichier-clients.csv",
      status: "PROCESSING",
      totalRows: table.rows.length,
      mapping: input.mapping as Record<string, string>,
      declaration: IMPORT_DECLARATION,
      createdByUserId: ctx.user.id,
      createdAt: importedAt,
    });

    for (const chunk of chunks(toInsert, WRITE_CHUNK)) await tx.insert(leads).values(chunk);
    for (const chunk of chunks(toInsert, WRITE_CHUNK)) {
      await tx.insert(leadStatusChanges).values(
        chunk.map((lead) => ({
          organizationId,
          leadId: lead.id!,
          toStatus: "COMPLETED" as const,
          actorType: "USER" as const,
          actorUserId: ctx.user.id,
          reason: "Import du fichier clients",
          createdAt: importedAt,
        })),
      );
    }
    // Updates in bulk: one statement per chunk instead of one per contact.
    for (const chunk of chunks(toUpdate, WRITE_CHUNK)) {
      await tx
        .insert(leads)
        .values(chunk.map(({ id, values }) => ({ id, organizationId, ...values })))
        .onConflictDoUpdate({
          target: leads.id,
          set: {
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            phone: sql`coalesce(excluded.phone, ${leads.phone})`,
            email: sql`coalesce(excluded.email, ${leads.email})`,
            externalId: sql`excluded.external_id`,
            isExistingClient: sql`true`,
            visitCount: sql`excluded.visit_count`,
            firstVisitAt: sql`excluded.first_visit_at`,
            lastAppointmentAt: sql`excluded.last_appointment_at`,
            lifetimeValueCents: sql`excluded.lifetime_value_cents`,
            marketingConsent: sql`case when excluded.marketing_consent_updated_at is not null then excluded.marketing_consent else ${leads.marketingConsent} end`,
            marketingConsentUpdatedAt: sql`coalesce(excluded.marketing_consent_updated_at, ${leads.marketingConsentUpdatedAt})`,
            updatedAt: importedAt,
          },
        });
    }
    for (const chunk of chunks(consents, WRITE_CHUNK)) await tx.insert(consentRecords).values(chunk);

    await tx
      .update(contactImports)
      .set({
        status: "COMPLETED",
        createdCount: result.toCreate,
        updatedCount: result.toUpdate,
        skippedCount: result.rejectedCount,
        errors: result.rejected.map((row) => ({ row: row.line, reason: row.reason })),
        completedAt: new Date(),
      })
      .where(eq(contactImports.id, importId));

    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.imported",
      entityType: "contact_import",
      entityId: importId,
      metadata: { rows: table.rows.length, created: result.toCreate, updated: result.toUpdate, skipped: result.rejectedCount },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordEvent(tx, {
      organizationId,
      type: "LEAD_CREATED",
      message: "Client file imported",
      entityType: "contact_import",
      entityId: importId,
      details: { created: result.toCreate, updated: result.toUpdate, skipped: result.rejectedCount },
    });
    await notify(tx, {
      organizationId,
      type: "IMPORT_COMPLETED",
      title: "Fichier clients importé",
      body: `${result.toCreate} contacts ajoutés, ${result.toUpdate} complétés par ${ctx.user.name}.`,
      linkUrl: "/reactivation",
      entityType: "contact_import",
      entityId: importId,
      recipients: "managers",
      excludeUserId: ctx.user.id,
    });

    return { ...result, importId };
  });
}

export async function listContactImports(tx: Transaction, organizationId: string, limit = 5) {
  return tx
    .select({
      id: contactImports.id,
      fileName: contactImports.fileName,
      status: contactImports.status,
      totalRows: contactImports.totalRows,
      createdCount: contactImports.createdCount,
      updatedCount: contactImports.updatedCount,
      skippedCount: contactImports.skippedCount,
      createdAt: contactImports.createdAt,
    })
    .from(contactImports)
    .where(eq(contactImports.organizationId, organizationId))
    .orderBy(desc(contactImports.createdAt))
    .limit(limit);
}

