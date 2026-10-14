import { CHANNELS, type Channel } from "@/lib/crm";

/** Inbox filters (specification §6), kept in the URL like the leads filters. */

export const INBOX_VIEWS = ["all", "unread", "human", "hot", "upcoming", "noshow", "followup", "mine"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const INBOX_VIEW_LABELS: Record<InboxView, string> = {
  all: "Toutes",
  unread: "Non lues",
  human: "Humain requis",
  hot: "Hot leads",
  upcoming: "RDV à venir",
  noshow: "No-show",
  followup: "À relancer",
  mine: "Assignées à moi",
};

export interface InboxFilters {
  view: InboxView;
  channel: Channel | null;
  q: string;
  /** Selected conversation. */
  conversation: string | null;
  /** Keyset pagination of the list: conversations older than this instant. */
  before: Date | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function parseInboxFilters(params: SearchParams): InboxFilters {
  const view = first(params.view);
  const channel = first(params.channel);
  const conversation = first(params.conversation);
  const before = new Date(first(params.before));
  return {
    view: (INBOX_VIEWS as readonly string[]).includes(view) ? (view as InboxView) : "all",
    channel: (CHANNELS as readonly string[]).includes(channel) ? (channel as Channel) : null,
    q: first(params.q).trim().slice(0, 100),
    conversation: UUID_PATTERN.test(conversation) ? conversation : null,
    before: first(params.before) && !Number.isNaN(before.getTime()) ? before : null,
  };
}

export function inboxQuery(filters: InboxFilters, changes: Partial<InboxFilters> = {}): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.view !== "all") params.set("view", next.view);
  if (next.channel) params.set("channel", next.channel);
  if (next.q) params.set("q", next.q);
  if (next.conversation) params.set("conversation", next.conversation);
  if (next.before) params.set("before", next.before.toISOString());
  const query = params.toString();
  return `/inbox${query ? `?${query}` : ""}`;
}
