import { cn } from "cn";
import { ArrowDownRightIcon, ArrowUpRightIcon, InfoIcon, MoveRightIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deltaTone, formatDelta, type Delta } from "@/lib/dashboard";

const TONE_CLASS = {
  good: "text-success",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

/** Change against the previous period: arrow + signed value, never colour alone. */
export function DeltaBadge({ delta, comparison, className }: { delta: Delta; comparison: string; className?: string }) {
  const tone = deltaTone(delta);
  if (delta.fromZero) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        0 sur la période précédente
      </span>
    );
  }
  if (tone === "none") return <span className={cn("text-xs text-muted-foreground", className)}>Pas de comparaison possible</span>;
  const Icon = tone === "neutral" ? MoveRightIcon : (delta.value ?? 0) > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const meaning = tone === "good" ? "en progrès" : tone === "bad" ? "en recul" : "stable";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", TONE_CLASS[tone], className)}>
      <Icon className="size-3.5" aria-hidden />
      {formatDelta(delta)}
      <span className="sr-only">
        {" "}
        ({meaning}, {comparison})
      </span>
    </span>
  );
}

export interface KpiItem {
  key: string;
  label: string;
  value: string;
  /** How the figure is computed, in plain words. */
  hint: string;
  delta: Delta;
}

export function KpiTile({ item, comparison }: { item: KpiItem; comparison: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[0.8125rem] leading-snug font-medium text-muted-foreground">{item.label}</h3>
        <Tooltip>
          <TooltipTrigger className="-m-1 rounded-full p-1 text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40">
            <InfoIcon className="size-3.5" aria-hidden />
            <span className="sr-only">Comment « {item.label} » est calculé</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 leading-relaxed">{item.hint}</TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-2 font-heading text-[1.625rem] leading-none font-semibold tracking-tight text-foreground">{item.value}</p>
      <DeltaBadge delta={item.delta} comparison={comparison} className="mt-2.5" />
    </div>
  );
}

export function KpiGroup({ title, items, comparison }: { title: string; items: KpiItem[]; comparison: string }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <KpiTile key={item.key} item={item} comparison={comparison} />
        ))}
      </div>
    </section>
  );
}
