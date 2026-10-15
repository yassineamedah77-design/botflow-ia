import type { Metadata } from "next";

import { PractitionersManager } from "@/components/knowledge/practitioners-manager";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listPractitioners } from "@/server/services/knowledge-entries";
import { listServiceOptions } from "@/server/services/leads";

import { archivePractitionerAction, createPractitionerAction, updatePractitionerAction } from "../actions";

export const metadata: Metadata = { title: "Praticiens · Knowledge Base" };

export default async function KnowledgePractitionersPage() {
  const ctx = await requireTenant();
  const { practitioners, services } = await withTenant(ctx.organization.id, async (tx) => ({
    practitioners: await listPractitioners(tx, ctx.organization.id),
    services: await listServiceOptions(tx, ctx.organization.id),
  }));

  return (
    <PractitionersManager
      practitioners={practitioners}
      services={services}
      canEdit={ctx.can("knowledge:write")}
      createAction={createPractitionerAction}
      updateAction={updatePractitionerAction}
      archiveAction={archivePractitionerAction}
    />
  );
}
