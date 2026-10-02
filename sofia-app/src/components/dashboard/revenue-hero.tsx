import { InfoIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format";

/**
 * Main dashboard card (specification §12): revenue recovered thanks to SOFIA.
 * Only CONFIRMED attributions count as recovered; booked-but-not-yet-honoured
 * revenue is shown separately and labelled as an estimate.
 */
export function RevenueHero({
  confirmedCents,
  estimatedCents,
  attributedAppointments,
  monthLabel,
  currency,
}: {
  confirmedCents: number;
  estimatedCents: number;
  attributedAppointments: number;
  monthLabel: string;
  currency: string;
}) {
  return (
    <section
      aria-labelledby="revenue-title"
      className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-md sm:p-8"
    >
      <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-sofia/25 blur-[90px]" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h2 id="revenue-title" className="flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
            CA récupéré grâce à SOFIA
            <Tooltip>
              <TooltipTrigger className="rounded-full text-primary-foreground/50 outline-none hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-sofia/60">
                <InfoIcon className="size-3.5" aria-hidden />
                <span className="sr-only">Comment ce montant est calculé</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Somme des leads récupérés, rendez-vous générés, no-shows récupérés et clientes réactivées. Seuls les
                rendez-vous honorés sont comptés ; les montants en attente sont affichés à part.
              </TooltipContent>
            </Tooltip>
          </h2>
          <p className="mt-4 font-heading text-[2.75rem] leading-none font-semibold tracking-tight tabular sm:text-[3.25rem]">
            {formatCurrency(confirmedCents, currency)}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/60">{monthLabel} · montants confirmés</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-primary-foreground/80">Ce mois-ci</span>
      </div>

      <dl className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm">
        <div>
          <dt className="text-primary-foreground/55">En attente (RDV à venir)</dt>
          <dd className="mt-1 font-medium tabular">{formatCurrency(estimatedCents, currency)}</dd>
        </div>
        <div>
          <dt className="text-primary-foreground/55">Rendez-vous attribués</dt>
          <dd className="mt-1 font-medium tabular">{attributedAppointments}</dd>
        </div>
      </dl>

      {confirmedCents === 0 && estimatedCents === 0 ? (
        <p className="relative mt-5 text-[0.8125rem] leading-relaxed text-primary-foreground/55">
          Les premiers montants apparaîtront dès que SOFIA aura converti des conversations en rendez-vous honorés.
        </p>
      ) : null}
    </section>
  );
}
