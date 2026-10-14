"use client";

import { CheckIcon, Columns3Icon, ListFilterIcon, Rows3Icon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNELS, CHANNEL_LABELS, LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/crm";
import { leadFiltersQuery, type LeadFilters } from "@/lib/leads-filters";

const ALL = "all";

export function LeadsToolbar({ filters, members }: { filters: LeadFilters; members: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  // Last search sent to the URL, and last one seen in it. A URL change that
  // did not come from typing (back button, reset) replaces the field's text.
  const [pushedQuery, setPushedQuery] = useState(filters.q);
  const [seenQuery, setSeenQuery] = useState(filters.q);
  if (filters.q !== seenQuery) {
    setSeenQuery(filters.q);
    if (filters.q !== pushedQuery) {
      setPushedQuery(filters.q);
      setQuery(filters.q);
    }
  }

  const apply = (changes: Partial<LeadFilters>) => {
    startTransition(() => {
      router.replace(`${pathname}${leadFiltersQuery(filters, { page: 1, ...changes })}`, { scroll: false });
    });
  };

  // Search as you type, without one request per keystroke.
  useEffect(() => {
    const next = query.trim();
    if (next === pushedQuery) return;
    const timer = setTimeout(() => {
      setPushedQuery(next);
      startTransition(() => {
        router.replace(`${pathname}${leadFiltersQuery(filters, { q: next, page: 1 })}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, pushedQuery, filters, pathname, router]);

  const toggleStatus = (status: LeadStatus) => {
    const statuses = filters.statuses.includes(status) ? filters.statuses.filter((value) => value !== status) : [...filters.statuses, status];
    apply({ statuses });
  };

  const active = Boolean(
    filters.q || filters.statuses.length || filters.source || filters.channel || filters.assignee || filters.followUpDue || filters.inactiveDays || filters.visits,
  );

  return (
    <div className="mb-5 flex flex-col gap-3" aria-busy={pending}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, téléphone, email, @instagram…"
            aria-label="Rechercher un contact"
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 items-center self-start rounded-lg border border-border bg-card p-0.5 sm:self-auto" role="group" aria-label="Affichage">
          {(
            [
              { view: "table", label: "Tableau", icon: Rows3Icon },
              { view: "kanban", label: "Kanban", icon: Columns3Icon },
            ] as const
          ).map(({ view, label, icon: Icon }) => (
            <Link
              key={view}
              href={`${pathname}${leadFiltersQuery(filters, { view, page: 1 })}`}
              aria-current={filters.view === view ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                filters.view === view && "bg-primary text-primary-foreground hover:text-primary-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(filters.statuses.length > 0 && "border-foreground/30")}>
              <ListFilterIcon aria-hidden />
              Étapes
              {filters.statuses.length > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] text-primary-foreground tabular">{filters.statuses.length}</span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5">
            <div role="group" aria-label="Étapes du pipeline">
              {LEAD_STATUSES.map((status) => {
                const checked = filters.statuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleStatus(status)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border border-input",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden
                    >
                      {checked ? <CheckIcon className="size-3" /> : null}
                    </span>
                    {LEAD_STATUS_META[status].label}
                  </button>
                );
              })}
            </div>
            {filters.statuses.length > 0 ? (
              <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => apply({ statuses: [] })}>
                Toutes les étapes
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>

        <Select value={filters.source ?? ALL} onValueChange={(value) => apply({ source: value === ALL ? null : (value as LeadFilters["source"]) })}>
          <SelectTrigger className="w-[11rem]" aria-label="Source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes les sources</SelectItem>
            {LEAD_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {LEAD_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.channel ?? ALL} onValueChange={(value) => apply({ channel: value === ALL ? null : (value as LeadFilters["channel"]) })}>
          <SelectTrigger className="w-[10rem]" aria-label="Canal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les canaux</SelectItem>
            {CHANNELS.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {CHANNEL_LABELS[channel]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.assignee ?? ALL} onValueChange={(value) => apply({ assignee: value === ALL ? null : value })}>
          <SelectTrigger className="w-[11rem]" aria-label="Assigné à">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toute l&apos;équipe</SelectItem>
            <SelectItem value="me">Assignés à moi</SelectItem>
            <SelectItem value="none">Non assignés</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          aria-pressed={filters.followUpDue}
          onClick={() => apply({ followUpDue: !filters.followUpDue })}
          className={cn(filters.followUpDue && "border-sofia/50 bg-sofia-soft text-sofia-strong hover:bg-sofia-soft")}
        >
          À relancer
        </Button>

        {filters.inactiveDays || filters.visits ? (
          <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-sofia/40 bg-sofia-soft pr-1 pl-3 text-sm text-sofia-strong">
            {[
              filters.inactiveDays ? `Sans visite depuis ${filters.inactiveDays} jours` : null,
              filters.visits === "once" ? "venues une seule fois" : filters.visits === "repeat" ? "venues plusieurs fois" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            <button
              type="button"
              onClick={() => apply({ inactiveDays: null, visits: null })}
              className="rounded-md p-1 hover:bg-sofia/10"
              aria-label="Retirer le filtre d'inactivité"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : null}

        {active ? (
          <Button variant="ghost" asChild>
            <Link
              href={`${pathname}${leadFiltersQuery({
                ...filters,
                q: "",
                statuses: [],
                source: null,
                channel: null,
                assignee: null,
                followUpDue: false,
                inactiveDays: null,
                visits: null,
                page: 1,
              })}`}
            >
              <XIcon aria-hidden />
              Réinitialiser
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
