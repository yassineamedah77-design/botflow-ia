import { GlobeIcon } from "lucide-react";
import type * as React from "react";

import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_LABELS, type Channel } from "@/lib/crm";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { ChannelPerformance } from "@/server/services/dashboard";

const ICONS: Record<Channel, React.ComponentType<{ className?: string }>> = {
  WHATSAPP: WhatsAppIcon,
  INSTAGRAM: InstagramIcon,
  WEBSITE: GlobeIcon,
};

const rate = (booked: number, incoming: number) => (incoming > 0 ? formatPercent(booked / incoming) : "—");

/** Performance per channel over the period (specification §12). */
export function ChannelPerformanceCard({ rows, currency, periodLabel }: { rows: ChannelPerformance[]; currency: string; periodLabel: string }) {
  const largest = Math.max(...rows.map((row) => row.recoveredCents));
  const columns = [
    { key: "conversations", label: "Conversations" },
    { key: "incomingLeads", label: "Leads" },
    { key: "appointmentsGenerated", label: "RDV par SOFIA" },
    { key: "conversion", label: "Conversion" },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance par canal</CardTitle>
        <CardDescription>{periodLabel} · un rendez-vous compte pour le canal de la conversation où il a été pris.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Table from the sm breakpoint, cards below. */}
        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2.5 font-medium">
                Canal
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="pb-2.5 text-right font-medium">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-[30%] pb-2.5 pl-6 font-medium">
                CA récupéré
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = ICONS[row.channel];
              return (
                <tr key={row.channel}>
                  <th scope="row" className="py-3 text-left font-medium">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-foreground/70" />
                      {CHANNEL_LABELS[row.channel]}
                    </span>
                  </th>
                  <td className="py-3 text-right tabular-nums">{row.conversations}</td>
                  <td className="py-3 text-right tabular-nums">{row.incomingLeads}</td>
                  <td className="py-3 text-right tabular-nums">{row.appointmentsGenerated}</td>
                  <td className="py-3 text-right tabular-nums">{rate(row.bookedLeads, row.incomingLeads)}</td>
                  <td className="py-3 pl-6">
                    <span className="flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span
                          className="block h-full rounded-full bg-viz-sofia"
                          style={{ width: largest > 0 ? `${Math.max(row.recoveredCents > 0 ? 3 : 0, (row.recoveredCents / largest) * 100)}%` : 0 }}
                        />
                      </span>
                      <span className="w-20 text-right font-medium tabular-nums">{formatCurrency(row.recoveredCents, currency)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ul className="space-y-3 sm:hidden">
          {rows.map((row) => {
            const Icon = ICONS[row.channel];
            return (
              <li key={row.channel} className="rounded-lg border border-border p-3">
                <p className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-foreground/70" />
                    {CHANNEL_LABELS[row.channel]}
                  </span>
                  <span className="tabular-nums">{formatCurrency(row.recoveredCents, currency)}</span>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {columns.map((column) => (
                    <div key={column.key}>
                      <dt className="text-muted-foreground">{column.label}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {column.key === "conversion" ? rate(row.bookedLeads, row.incomingLeads) : row[column.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
