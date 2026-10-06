import { CHANNELS, LEAD_SORTS, LEAD_SOURCES, LEAD_STATUSES, type LeadSort, type LeadStatus } from "@/lib/crm";

/**
 * Leads list filters, kept in the URL (shareable, back button friendly).
 * Shared by the server page and the client toolbar, so no validation library.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadView = "table" | "kanban";

export interface LeadFilters {
  view: LeadView;
  q: string;
  statuses: LeadStatus[];
  source: (typeof LEAD_SOURCES)[number] | null;
  channel: (typeof CHANNELS)[number] | null;
  /** "me", "none" (unassigned) or a member id. */
  assignee: string | null;
  /** Leads whose next follow-up is due. */
  followUpDue: boolean;
  /** Clients without a visit for at least this many days (reactivation segments). */
  inactiveDays: number | null;
  /** "once": came once and never returned. "repeat": came several times. */
  visits: "once" | "repeat" | null;
  sort: LeadSort;
  direction: "asc" | "desc";
  page: number;
}

export const LEADS_PAGE_SIZE = 25;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads filters from the URL; unknown or tampered values fall back to defaults. */
export function parseLeadFilters(params: SearchParams): LeadFilters {
  const statuses = first(params.status)
    .split(",")
    .filter((value): value is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(value));
  const source = first(params.source);
  const channel = first(params.channel);
  const assignee = first(params.assignee);
  const sort = first(params.sort);
  const inactive = Number.parseInt(first(params.inactive), 10);
  const visits = first(params.visits);
  const page = Number.parseInt(first(params.page), 10);
  return {
    view: first(params.view) === "kanban" ? "kanban" : "table",
    q: first(params.q).trim().slice(0, 100),
    statuses: [...new Set(statuses)],
    source: (LEAD_SOURCES as readonly string[]).includes(source) ? (source as LeadFilters["source"]) : null,
    channel: (CHANNELS as readonly string[]).includes(channel) ? (channel as LeadFilters["channel"]) : null,
    assignee: assignee === "me" || assignee === "none" || UUID_PATTERN.test(assignee) ? assignee : null,
    followUpDue: first(params.followup) === "due",
    inactiveDays: Number.isFinite(inactive) && inactive >= 30 && inactive <= 3650 ? inactive : null,
    visits: visits === "once" || visits === "repeat" ? visits : null,
    sort: (LEAD_SORTS as readonly string[]).includes(sort) ? (sort as LeadSort) : "recent",
    direction: first(params.dir) === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Builds the query string for a filters change (defaults are omitted to keep URLs short). */
export function leadFiltersQuery(filters: LeadFilters, changes: Partial<LeadFilters> = {}): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.view !== "table") params.set("view", next.view);
  if (next.q) params.set("q", next.q);
  if (next.statuses.length) params.set("status", next.statuses.join(","));
  if (next.source) params.set("source", next.source);
  if (next.channel) params.set("channel", next.channel);
  if (next.assignee) params.set("assignee", next.assignee);
  if (next.followUpDue) params.set("followup", "due");
  if (next.inactiveDays) params.set("inactive", String(next.inactiveDays));
  if (next.visits) params.set("visits", next.visits);
  if (next.sort !== "recent") params.set("sort", next.sort);
  if (next.direction !== "desc") params.set("dir", next.direction);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}
