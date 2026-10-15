import type { Metadata } from "next";

import { SofiaActivation } from "@/components/sofia/sofia-activation";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getSofiaReadiness } from "@/server/services/sofia";
import { getWidgetChannel } from "@/server/services/widget-settings";

import { setSofiaStatusAction } from "./actions";

export const metadata: Metadata = { title: "SOFIA" };

export default async function SofiaSettingsPage() {
  const ctx = await requireTenant();
  const { readiness, widget } = await withTenant(ctx.organization.id, async (tx) => ({
    readiness: await getSofiaReadiness(tx, ctx.organization.id),
    widget: await getWidgetChannel(tx, ctx.organization),
  }));

  return (
    <div className="max-w-3xl">
      <SofiaActivation
        status={ctx.organization.sofiaStatus}
        checks={readiness.checks}
        canToggle={ctx.can("sofia:toggle")}
        widget={{ connected: widget.status === "CONNECTED", seenOn: widget.seenOn }}
        action={setSofiaStatusAction}
      />
    </div>
  );
}
