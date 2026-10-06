"use client";

import { cn } from "cn";
import { useState } from "react";
import type * as React from "react";

import { formatNumber } from "@/lib/format";

/*
 * Column chart for the dashboard, built on the data-visualisation rules of
 * the project: thin columns (24 px max) with a 4 px rounded data end and a
 * square base, a 2 px surface gap between stacked segments, hairline
 * gridlines, a legend for two series or more, a tooltip on hover and on
 * keyboard focus (arrow keys), and a table view so no value depends on the
 * pointer. Labels and values are formatted by the server.
 */

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS colour, from the validated --viz-* tokens. */
  color: string;
}

export interface ChartDatum {
  key: string;
  /** Short axis label ("12 sept."), shown on some columns only. */
  tick: string;
  /** Full label for the tooltip and the table ("Semaine du 8 septembre"). */
  label: string;
  values: Record<string, number>;
  /** Extra line in the tooltip ("dont 2 no-shows"). */
  note?: string;
}

type ValueFormat = { kind: "count" } | { kind: "money"; currency: string };

/**
 * Rendered on the server and again in the browser, whose ICU data differ on
 * compact notation ("0,0 €" against "0 €"): every option is explicit and the
 * compact form ("1,5 k€") is built here rather than by Intl.
 */
function formatValue(value: number, format: ValueFormat, compact = false) {
  if (format.kind === "count") return formatNumber(value, { maximumFractionDigits: 0 });
  const amount = value / 100;
  if (compact && Math.abs(amount) >= 1000) {
    const symbol = new Intl.NumberFormat("fr-FR", { style: "currency", currency: format.currency }).formatToParts(0).find((part) => part.type === "currency")?.value;
    return `${formatNumber(amount / 1000, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}\u00a0k${symbol ?? format.currency}`;
  }
  return formatNumber(amount, { style: "currency", currency: format.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Round axis: 0 and 3 to 5 evenly spaced ticks up to a clean maximum. */
function niceScale(max: number, format: ValueFormat) {
  const unit = format.kind === "money" ? 100 : 1;
  if (max <= 0) return { top: 4 * unit, ticks: [0, unit, 2 * unit, 3 * unit, 4 * unit] };
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = Math.max(unit, (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= top + step / 2; tick += step) ticks.push(tick);
  return { top, ticks };
}

export function ColumnChart({
  title,
  data,
  series,
  format = { kind: "count" },
  height = 176,
  tickEvery = 1,
  annotateLast = false,
  className,
}: {
  /** Accessible name of the chart (the card title). */
  title: string;
  data: ChartDatum[];
  series: ChartSeries[];
  format?: ValueFormat;
  height?: number;
  /** One axis label every N columns, counted back from the last one. */
  tickEvery?: number;
  /** Direct label on the last column (the period in progress). */
  annotateLast?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((datum) => series.reduce((sum, item) => sum + (datum.values[item.key] ?? 0), 0));
  const { top, ticks } = niceScale(Math.max(0, ...totals), format);
  const last = data.length - 1;
  const current = active === null ? null : data[active];

  const describe = (datum: ChartDatum) =>
    `${datum.label} : ${series.map((item) => `${formatValue(datum.values[item.key] ?? 0, format)} ${series.length > 1 ? item.label.toLowerCase() : ""}`.trim()).join(", ")}${datum.note ? `, ${datum.note}` : ""}`;

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key in keys) {
      event.preventDefault();
      setActive((index) => Math.min(last, Math.max(0, (index ?? last) + keys[event.key]!)));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : last);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  // The tooltip sits beside the active column, on the side with more room,
  // inside the plot (cards clip what overflows them).
  const tooltipPosition: React.CSSProperties =
    active === null
      ? {}
      : (active + 0.5) / data.length < 0.5
        ? { left: `calc(${((active + 1) / data.length) * 100}% + 6px)` }
        : { right: `calc(${100 - (active / data.length) * 100}% + 6px)` };

  return (
    <div className={className}>
      {series.length > 1 ? (
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        {/* Y axis */}
        <div className="relative w-9 text-right text-[0.6875rem] text-muted-foreground tabular-nums" style={{ height }} aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(tick / top) * 100}%` }}>
              {formatValue(tick, format, true)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div
          className="relative rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          style={{ height }}
          tabIndex={0}
          role="group"
          aria-label={`${title}. Flèches gauche et droite pour parcourir les valeurs.`}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((index) => index ?? last)}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-input" : "bg-border/70")}
              style={{ bottom: `${(tick / top) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex" aria-hidden>
            {data.map((datum, index) => {
              const total = totals[index]!;
              const visible = series.filter((item) => (datum.values[item.key] ?? 0) > 0);
              return (
                <div
                  key={datum.key}
                  className={cn("relative flex h-full flex-1 items-end justify-center rounded-sm transition-colors", active === index && "bg-muted/70")}
                  onPointerEnter={() => setActive(index)}
                >
                  {annotateLast && index === last && total > 0 ? (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-full pb-1 text-[0.6875rem] font-medium whitespace-nowrap text-foreground tabular-nums"
                      style={{ bottom: `${(total / top) * 100}%` }}
                    >
                      {formatValue(total, format)}
                    </span>
                  ) : null}
                  {total > 0 ? (
                    <div className="flex w-[min(24px,64%)] flex-col-reverse gap-[2px]" style={{ height: `${(total / top) * 100}%` }}>
                      {visible.map((item, position) => (
                        <div
                          key={item.key}
                          className={cn("min-h-[2px] basis-0", position === visible.length - 1 && "rounded-t-[4px]")}
                          style={{ flexGrow: datum.values[item.key], backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {current ? (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-32 rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10"
              style={tooltipPosition}
              aria-hidden
            >
              <p className="mb-1 font-medium whitespace-nowrap text-muted-foreground">{current.label}</p>
              <ul className="space-y-0.5">
                {series.map((item) => (
                  <li key={item.key} className="flex items-center gap-2 whitespace-nowrap">
                    <span className="h-0.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-foreground tabular-nums">{formatValue(current.values[item.key] ?? 0, format)}</span>
                    {series.length > 1 ? <span className="text-muted-foreground">{item.label.toLowerCase()}</span> : null}
                  </li>
                ))}
              </ul>
              {current.note ? <p className="mt-1 whitespace-nowrap text-muted-foreground">{current.note}</p> : null}
            </div>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {current ? describe(current) : ""}
          </p>
        </div>

        {/* X axis */}
        <div />
        <div className="mt-2 flex text-[0.6875rem] text-muted-foreground tabular-nums" aria-hidden>
          {data.map((datum, index) => (
            <span key={datum.key} className="flex-1 overflow-visible text-center whitespace-nowrap">
              {(last - index) % tickEvery === 0 ? datum.tick : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="group mt-4 text-xs">
        <summary className="inline-flex cursor-pointer items-center gap-1 rounded text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40">
          <span className="group-open:hidden">Voir les données</span>
          <span className="hidden group-open:inline">Masquer les données</span>
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-medium">
                  Période
                </th>
                {series.map((item) => (
                  <th key={item.key} scope="col" className="px-3 py-1.5 text-right font-medium">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((datum) => (
                <tr key={datum.key}>
                  <th scope="row" className="px-3 py-1.5 font-normal text-foreground">
                    {datum.label}
                    {datum.note ? <span className="text-muted-foreground"> · {datum.note}</span> : null}
                  </th>
                  {series.map((item) => (
                    <td key={item.key} className="px-3 py-1.5 text-right text-foreground tabular-nums">
                      {formatValue(datum.values[item.key] ?? 0, format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
