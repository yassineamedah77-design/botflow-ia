import { cn } from "cn";
import { ArrowDownRightIcon, ArrowUpRightIcon, InfoIcon, MoveRightIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AttributionType } from "@/lib/crm";
import { deltaTone, formatDelta, relativeChange } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";
import type { PendingRevenue, RecoveredRevenue } from "@/server/services/revenue";

const REASONS: Array<{ type: AttributionType; label: string }> = [
  { type: "APPOINTMENT_GENERATED", label: "Rendez-vous générés" },
  { type: "LEAD_RECOVERED", label: "Leads récupérés" },
  { type: "NO_SHOW_RECOVERED", label: "No-shows récupérés" },
  { type: "CLIENT_REACTIVATED", label: "Clientes réactivées" },
];

/**
 * Main dashboard card (specification §12 and §13): revenue recovered thanks
 * to SOFIA over the period, its change, and where it comes from. Only
 * appointments that took place count; what is booked but not honoured yet
 * is shown apart, as an estimate.
 */
export function RevenueHero({
  revenue,
  previousCents,
  pending,
  periodLabel,
  comparison,
  currency,
}: {
  revenue: RecoveredRevenue;
  previousCents: number;
  pending: PendingRevenue;
  periodLabel: string;
  comparison: string;
  currency: string;
}) {
  const delta = { value: relativeChange(revenue.totalCents, previousCents), unit: "percent" as const, goodWhen: "up" as const };
  const tone = deltaTone(delta);
  const DeltaIcon = tone === "neutral" ? MoveRightIcon : (delta.value ?? 0) > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  const largest = Math.max(...REASONS.map((reason) => revenue.byType[reason.type].amountCents));

  return (
    <section aria-labelledby="revenue-title" className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-7">
      <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-sofia/25 blur-[90px]" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <h2 id="revenue-title" className="flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
          CA récupéré grâce à SOFIA
          <Tooltip>
            <TooltipTrigger className="rounded-full text-primary-foreground/50 outline-none hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-sofia/60">
              <InfoIcon className="size-3.5" aria-hidden />
              <span className="sr-only">Comment ce montant est calculé</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs leading-relaxed">
              Rendez-vous générés, leads récupérés, no-shows récupérés et clientes réactivées par SOFIA, au prix de la prestation.
              Seuls les rendez-vous honorés pendant la période comptent, chacun une seule fois.
            </TooltipContent>
          </Tooltip>
        </h2>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-primary-foreground/80">{periodLabel}</span>
      </div>

      <p className="relative mt-4 font-heading text-[2.75rem] leading-none font-semibold tracking-tight sm:text-[3.25rem]">
        {formatCurrency(revenue.totalCents, currency)}
      </p>
      <p className="relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-primary-foreground/60">
        {tone === "none" ? (
          <span>Rien sur la période précédente,</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[0.8125rem] font-semibold",
              tone === "good" ? "text-[#8fd9b1]" : tone === "bad" ? "text-[#f5a99f]" : "text-primary-foreground/80",
            )}
          >
            <DeltaIcon className="size-3.5" aria-hidden />
            {formatDelta(delta)}
          </span>
        )}
        <span>{comparison}</span>
        <span aria-hidden>·</span>
        <span>
          {revenue.appointments} rendez-vous honoré{revenue.appointments > 1 ? "s" : ""}
        </span>
      </p>

      <ul className="relative mt-7 space-y-3 border-t border-white/10 pt-5">
        {REASONS.map((reason) => {
          const { amountCents, appointments } = revenue.byType[reason.type];
          return (
            <li key={reason.type} className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-[0.8125rem]">
              <span className="truncate text-primary-foreground/75">
                {reason.label}
                <span className="text-primary-foreground/45"> · {appointments}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <span
                  className="block h-full rounded-full bg-viz-sofia"
                  style={{ width: largest > 0 ? `${Math.max(amountCents > 0 ? 3 : 0, (amountCents / largest) * 100)}%` : 0 }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{formatCurrency(amountCents, currency)}</span>
            </li>
          );
        })}
      </ul>

      <p className="relative mt-5 text-[0.8125rem] leading-relaxed text-primary-foreground/60">
        {pending.appointments > 0 ? (
          <>
            <span className="font-medium text-primary-foreground/85">{formatCurrency(pending.amountCents, currency)} en attente</span> :{" "}
            {pending.appointments} rendez-vous pris par SOFIA pas encore honorés. Ils compteront une fois la prestation réalisée.
          </>
        ) : revenue.totalCents === 0 ? (
          "Les premiers montants apparaîtront dès que SOFIA aura converti des conversations en rendez-vous honorés."
        ) : (
          "Aucun rendez-vous pris par SOFIA en attente."
        )}
      </p>
    </section>
  );
}
