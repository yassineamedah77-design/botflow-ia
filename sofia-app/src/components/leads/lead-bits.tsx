import { GlobeIcon, PencilLineIcon, UploadIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import type * as React from "react";

import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_LABELS, LEAD_SOURCE_LABELS, LEAD_STATUS_META, type Channel, type LeadSource, type LeadStatus } from "@/lib/crm";
import { initials } from "@/lib/format";

/** Pipeline step as a badge, with its description for screen readers and tooltips. */
export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const meta = LEAD_STATUS_META[status];
  return (
    <Badge variant={meta.tone} className={className} title={meta.description}>
      {status === "HOT" ? <span aria-hidden>🔥</span> : null}
      {meta.label}
    </Badge>
  );
}

const CHANNEL_ICONS: Record<Channel, React.ComponentType<{ className?: string }>> = {
  WHATSAPP: WhatsAppIcon,
  INSTAGRAM: InstagramIcon,
  WEBSITE: GlobeIcon,
};

const CHANNEL_TINTS: Record<Channel, string> = {
  WHATSAPP: "text-[#1f9d55]",
  INSTAGRAM: "text-[#c13584]",
  WEBSITE: "text-info",
};

export function ChannelIcon({ channel, className, withLabel = false }: { channel: Channel; className?: string; withLabel?: boolean }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={CHANNEL_LABELS[channel]}>
      <Icon className={cn("size-4 shrink-0", CHANNEL_TINTS[channel])} />
      {withLabel ? <span>{CHANNEL_LABELS[channel]}</span> : <span className="sr-only">{CHANNEL_LABELS[channel]}</span>}
    </span>
  );
}

const SOURCE_ICONS: Partial<Record<LeadSource, React.ComponentType<{ className?: string }>>> = {
  MANUAL: PencilLineIcon,
  IMPORT: UploadIcon,
  REFERRAL: UsersIcon,
};

/** Where the person came from: a channel icon, or the manual / import / referral origin. */
export function LeadOrigin({ source, channel, withLabel = false }: { source: LeadSource; channel: Channel | null; withLabel?: boolean }) {
  if (channel) return <ChannelIcon channel={channel} withLabel={withLabel} />;
  const Icon = SOURCE_ICONS[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground" title={LEAD_SOURCE_LABELS[source]}>
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {withLabel ? <span>{LEAD_SOURCE_LABELS[source]}</span> : <span className="sr-only">{LEAD_SOURCE_LABELS[source]}</span>}
    </span>
  );
}

const AVATAR_TINTS = ["bg-sand", "bg-sofia-soft", "bg-info-soft", "bg-success-soft", "bg-warning-soft", "bg-muted"];

function tintFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function LeadAvatar({ name, seed, className }: { name: string; seed: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-foreground/80",
        tintFor(seed),
        className,
      )}
    >
      {initials(name.replace(/^@/, ""))}
    </span>
  );
}

/** Score 0–100 as a small meter: the higher, the closer to booking. */
export function ScoreMeter({ score, className }: { score: number; className?: string }) {
  const tone = score >= 75 ? "bg-sofia" : score >= 50 ? "bg-sand-strong" : "bg-border";
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={`Score ${score} sur 100`}>
      <span className="h-1.5 w-9 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.max(4, score)}%` }} />
      </span>
      <span className="text-xs tabular text-muted-foreground">
        {score}
        <span className="sr-only"> sur 100</span>
      </span>
    </span>
  );
}
