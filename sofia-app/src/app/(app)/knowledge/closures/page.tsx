import type { Metadata } from "next";

import { ClosuresManager } from "@/components/knowledge/closures-manager";
import { dayRangeState, formatDayRange, isoDayInZone } from "@/lib/knowledge-dates";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listClosures } from "@/server/services/knowledge-entries";

import { createClosureAction, deleteClosureAction } from "../actions";

export const metadata: Metadata = { title: "Fermetures · Knowledge Base" };

export default async function KnowledgeClosuresPage() {
  const ctx = await requireTenant();
  const closures = await withTenant(ctx.organization.id, (tx) => listClosures(tx, ctx.organization.id));
  const today = isoDayInZone(new Date(), ctx.organization.timezone);

  const rows = closures.map((closure) => ({
    id: closure.id,
    period: formatDayRange(closure.startsOn, closure.endsOn),
    reason: closure.reason,
    state: dayRangeState(closure.startsOn, closure.endsOn, today),
  }));
  // Upcoming and current closures first, then the past ones (most recent first).
  rows.sort((a, b) => Number(a.state === "past") - Number(b.state === "past"));

  return <ClosuresManager closures={rows} canEdit={ctx.can("knowledge:write")} createAction={createClosureAction} deleteAction={deleteClosureAction} />;
}
