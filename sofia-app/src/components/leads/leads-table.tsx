import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import type { LeadSort } from "@/lib/crm";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { leadFiltersQuery, type LeadFilters } from "@/lib/leads-filters";
import { formatPhone } from "@/lib/phone";
import type { LeadListRow } from "@/server/services/leads";

import { LeadAvatar, LeadOrigin, LeadStatusBadge, ScoreMeter } from "./lead-bits";

function SortHeader({
  label,
  sort,
  filters,
  className,
  defaultDirection = "desc",
}: {
  label: string;
  sort: LeadSort;
  filters: LeadFilters;
  className?: string;
  defaultDirection?: "asc" | "desc";
}) {
  const active = filters.sort === sort;
  const nextDirection = active ? (filters.direction === "desc" ? "asc" : "desc") : defaultDirection;
  const Icon = !active ? ChevronsUpDownIcon : filters.direction === "desc" ? ArrowDownIcon : ArrowUpIcon;
  return (
    <th
      scope="col"
      aria-sort={active ? (filters.direction === "desc" ? "descending" : "ascending") : undefined}
      className={cn("px-3 py-2.5 text-left font-medium whitespace-nowrap", className)}
    >
      <Link
        href={`/leads${leadFiltersQuery(filters, { sort, direction: nextDirection, page: 1 })}`}
        scroll={false}
        className={cn("inline-flex items-center gap-1 rounded hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <Icon className="size-3.5 opacity-70" aria-hidden />
      </Link>
    </th>
  );
}

function formatShortDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone }).format(date);
}

function FollowUp({ date, now }: { date: Date | null; now: Date }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const due = date <= now;
  return (
    <span className={cn("whitespace-nowrap", due ? "font-medium text-sofia-strong" : "text-muted-foreground")}>
      {due ? "À relancer" : formatRelativeTime(date, now)}
    </span>
  );
}

export function LeadsTable({
  rows,
  filters,
  total,
  page,
  pageSize,
  currency,
  timeZone,
  now,
}: {
  rows: LeadListRow[];
  filters: LeadFilters;
  total: number;
  page: number;
  pageSize: number;
  currency: string;
  timeZone: string;
  now: Date;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  // Reactivation lists are about former clients: what they spent matters more than a prospect's potential.
  const spentView = Boolean(filters.inactiveDays) || filters.sort === "spent";
  const valueOf = (lead: LeadListRow) => (spentView ? lead.lifetimeValueCents : lead.potentialValueCents);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Contacts du CRM, {total} résultats</caption>
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <SortHeader label="Contact" sort="name" filters={filters} defaultDirection="asc" className="pl-5" />
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                Étape
              </th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                Prestation
              </th>
              <SortHeader label="Score" sort="score" filters={filters} />
              {spentView ? (
                <SortHeader label="Total dépensé" sort="spent" filters={filters} className="text-right" />
              ) : (
                <SortHeader label="Valeur" sort="value" filters={filters} className="text-right" />
              )}
              <SortHeader label="Échange" sort="recent" filters={filters} />
              <SortHeader label="Relance" sort="followup" filters={filters} defaultDirection="asc" />
              <th scope="col" className="px-3 py-2.5 pr-5 text-left font-medium">
                <span className="sr-only">Assigné à</span>
                <span aria-hidden>Qui</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((lead) => (
              <tr key={lead.id} className="group relative transition-colors hover:bg-muted/40">
                <td className="py-3 pr-3 pl-5">
                  <div className="flex items-center gap-3">
                    <LeadAvatar name={lead.name} seed={lead.id} />
                    <div className="max-w-[14rem] min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
                      >
                        {lead.name}
                      </Link>
                      <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <LeadOrigin source={lead.source} channel={lead.channel} />
                        <span className="truncate">{lead.phone ? formatPhone(lead.phone) : (lead.email ?? (lead.instagramHandle ? `@${lead.instagramHandle}` : ""))}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <LeadStatusBadge status={lead.status} />
                    {lead.nextAppointmentAt ? (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">RDV le {formatShortDate(lead.nextAppointmentAt, timeZone)}</span>
                    ) : null}
                  </div>
                </td>
                <td className="max-w-[9.5rem] truncate px-3 py-3 text-muted-foreground" title={lead.serviceName ?? undefined}>
                  {lead.serviceName ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <ScoreMeter score={lead.score} />
                </td>
                <td className="px-3 py-3 text-right tabular whitespace-nowrap">
                  {valueOf(lead) !== null ? formatCurrency(valueOf(lead)!, currency) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                  {lead.lastInteractionAt ? formatRelativeTime(lead.lastInteractionAt, now) : "—"}
                </td>
                <td className="px-3 py-3">
                  <FollowUp date={lead.nextFollowUpAt} now={now} />
                </td>
                <td className="py-3 pr-5 pl-3">
                  {lead.assignee ? (
                    <span className="inline-flex" title={lead.assignee.name}>
                      <LeadAvatar name={lead.assignee.name} seed={lead.assignee.id} className="size-7 text-[0.625rem]" />
                      <span className="sr-only">{lead.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-border md:hidden" aria-label={`Contacts du CRM, ${total} résultats`}>
        {rows.map((lead) => (
          <li key={lead.id} className="relative flex items-start gap-3 px-4 py-3.5">
            <LeadAvatar name={lead.name} seed={lead.id} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/leads/${lead.id}`} className="truncate font-medium outline-none after:absolute after:inset-0">
                  {lead.name}
                </Link>
                {valueOf(lead) !== null ? <span className="shrink-0 text-sm tabular">{formatCurrency(valueOf(lead)!, currency)}</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <LeadStatusBadge status={lead.status} />
                <LeadOrigin source={lead.source} channel={lead.channel} />
                {lead.serviceName ? <span className="truncate">{lead.serviceName}</span> : null}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">{lead.lastInteractionAt ? formatRelativeTime(lead.lastInteractionAt, now) : ""}</span>
                <FollowUp date={lead.nextFollowUpAt} now={now} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-medium">Aucun contact ne correspond à ces filtres.</p>
          <p className="mt-1 text-sm text-muted-foreground">Modifiez la recherche ou réinitialisez les filtres.</p>
        </div>
      ) : null}

      <nav className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm" aria-label="Pagination">
        <p className="text-muted-foreground tabular">
          {total === 0 ? "0 contact" : `${from}–${to} sur ${total.toLocaleString("fr-FR")} contact${total > 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-1.5">
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/leads${leadFiltersQuery(filters, { page: page - 1 })}`} scroll={false}>
                <ChevronLeftIcon aria-hidden />
                Précédent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeftIcon aria-hidden />
              Précédent
            </Button>
          )}
          <span className="px-1 text-muted-foreground tabular">
            {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/leads${leadFiltersQuery(filters, { page: page + 1 })}`} scroll={false}>
                Suivant
                <ChevronRightIcon aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Suivant
              <ChevronRightIcon aria-hidden />
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
