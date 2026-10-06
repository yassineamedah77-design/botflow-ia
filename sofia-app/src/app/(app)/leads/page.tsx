import { UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { NewLeadDialog } from "@/components/leads/lead-actions";
import { LeadsKanban } from "@/components/leads/leads-kanban";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsToolbar } from "@/components/leads/leads-toolbar";
import { Button } from "@/components/ui/button";
import { leadFiltersQuery, parseLeadFilters } from "@/lib/leads-filters";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getLeadPipeline, listAssignableMembers, listLeads, listServiceOptions } from "@/server/services/leads";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage(props: PageProps<"/leads">) {
  const ctx = await requireTenant();
  const filters = parseLeadFilters(await props.searchParams);
  const now = new Date();
  const organizationId = ctx.organization.id;

  const data = await withTenant(organizationId, async (tx) => ({
    members: await listAssignableMembers(tx, organizationId),
    services: await listServiceOptions(tx, organizationId),
    list: filters.view === "table" ? await listLeads(tx, organizationId, filters, { userId: ctx.user.id, now }) : null,
    pipeline: filters.view === "kanban" ? await getLeadPipeline(tx, organizationId, filters, { userId: ctx.user.id, now }) : null,
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Chaque prospect et chaque cliente, de la première question au rendez-vous honoré."
        actions={
          <>
            {ctx.can("leads:import") ? (
              <Button variant="outline" asChild>
                <Link href="/leads/import">
                  <UploadIcon aria-hidden />
                  Importer un fichier clients
                </Link>
              </Button>
            ) : null}
            {ctx.can("leads:write") ? <NewLeadDialog services={data.services} members={data.members} /> : null}
          </>
        }
      />
      <LeadsToolbar filters={filters} members={data.members} />
      {data.list ? (
        <LeadsTable
          rows={data.list.rows}
          filters={filters}
          total={data.list.total}
          page={data.list.page}
          pageSize={data.list.pageSize}
          currency={ctx.organization.currency}
          timeZone={ctx.organization.timezone}
          now={now}
        />
      ) : null}
      {data.pipeline ? (
        <LeadsKanban columns={data.pipeline} currency={ctx.organization.currency} now={now} listQuery={leadFiltersQuery(filters)} />
      ) : null}
    </>
  );
}
