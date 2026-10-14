"use client";

import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type * as React from "react";

import { DASHBOARD_PERIOD_LABELS, DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/dashboard";

/**
 * Period selector of the dashboard and everything it scopes. While the new
 * period loads, the current figures stay in place, dimmed: no blank state,
 * no layout jump.
 */
export function PeriodScope({
  period,
  heading,
  children,
}: {
  period: DashboardPeriod;
  heading: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section aria-labelledby="results-title" aria-busy={pending}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {heading}
        <nav aria-label="Période" className="flex rounded-lg border border-border bg-card p-0.5 shadow-xs">
          {DASHBOARD_PERIODS.map((option) => {
            const href = option === "month" ? "/dashboard" : `/dashboard?period=${option}`;
            const selected = option === period;
            return (
              <Link
                key={option}
                href={href}
                scroll={false}
                aria-current={selected ? "page" : undefined}
                onClick={(event) => {
                  // Plain clicks navigate in a transition, to dim the figures meanwhile.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  startTransition(() => router.push(href, { scroll: false }));
                }}
                className={cn(
                  "flex-1 rounded-md px-2.5 py-1.5 text-center text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 sm:flex-none sm:px-3",
                  selected && "bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
              >
                {DASHBOARD_PERIOD_LABELS[option]}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-55")}>{children}</div>
    </section>
  );
}
