import type { Metadata } from "next";

import type { PromotionRow } from "@/components/knowledge/promotions-manager";
import { PromotionsManager } from "@/components/knowledge/promotions-manager";
import { dayRangeState, formatDayRange, isoDayInZone } from "@/lib/knowledge-dates";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listPromotions } from "@/server/services/knowledge-entries";
import { listServiceOptions } from "@/server/services/leads";

import { createPromotionAction, deletePromotionAction, updatePromotionAction } from "../actions";

export const metadata: Metadata = { title: "Promotions · Knowledge Base" };

export default async function KnowledgePromotionsPage() {
  const ctx = await requireTenant();
  const timeZone = ctx.organization.timezone;
  const { promotions, services } = await withTenant(ctx.organization.id, async (tx) => ({
    promotions: await listPromotions(tx, ctx.organization.id),
    services: await listServiceOptions(tx, ctx.organization.id),
  }));
  const today = isoDayInZone(new Date(), timeZone);

  const rows: PromotionRow[] = promotions.map((promotion) => {
    const startsOn = promotion.startsAt ? isoDayInZone(promotion.startsAt, timeZone) : null;
    // Stored as the midnight after the last day: show that last day.
    const endsOn = promotion.endsAt ? isoDayInZone(promotion.endsAt, timeZone, -1) : null;
    const state = dayRangeState(startsOn, endsOn, today);
    return {
      id: promotion.id,
      title: promotion.title,
      description: promotion.description,
      serviceId: promotion.serviceId,
      serviceName: promotion.serviceName,
      startsOn,
      endsOn,
      state: state === "current" ? "running" : state === "past" ? "ended" : "upcoming",
      period: formatDayRange(startsOn, endsOn),
    };
  });

  return (
    <PromotionsManager
      promotions={rows}
      services={services}
      canEdit={ctx.can("knowledge:write")}
      createAction={createPromotionAction}
      updateAction={updatePromotionAction}
      deleteAction={deletePromotionAction}
    />
  );
}
