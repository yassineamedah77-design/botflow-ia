import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";

const STEP_COLORS = ["bg-viz-step-1", "bg-viz-step-2", "bg-viz-step-3", "bg-viz-step-4"];

/**
 * Conversion funnel of the period (specification §12, "conversions"): the
 * incoming leads, then how many were qualified, booked and came. An ordinal
 * scale of one hue, light to dark, with every value labelled.
 */
export function ConversionFunnel({
  incoming,
  qualified,
  booked,
  showed,
  periodLabel,
}: {
  incoming: number;
  qualified: number;
  booked: number;
  showed: number;
  periodLabel: string;
}) {
  const steps = [
    { label: "Leads entrants", value: incoming },
    { label: "Qualifiés", value: qualified },
    { label: "Ont réservé", value: booked },
    { label: "Sont venues", value: showed },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Conversion</CardTitle>
        <CardDescription>
          Ce que sont devenus les leads arrivés · {periodLabel.charAt(0).toLowerCase() + periodLabel.slice(1)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {incoming === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Aucun lead entrant sur cette période.</p>
        ) : (
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.8125rem]">
                  <span className="font-medium text-foreground">{step.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">{step.value}</span>
                    {index > 0 ? ` · ${formatPercent(step.value / incoming)}` : null}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted" aria-hidden>
                  <div
                    className={`h-full rounded-full ${STEP_COLORS[index]}`}
                    style={{ width: `${step.value > 0 ? Math.max(2, (step.value / incoming) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
