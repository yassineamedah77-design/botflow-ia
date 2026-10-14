"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarCheckIcon, MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";

import { changeLeadStatusAction } from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/crm";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import type { LeadListRow, PipelineColumn } from "@/server/services/leads";

import { LeadAvatar, LeadOrigin } from "./lead-bits";

interface Move {
  leadId: string;
  from: LeadStatus;
  to: LeadStatus;
}

function applyMove(columns: PipelineColumn[], move: Move): PipelineColumn[] {
  const lead = columns.find((column) => column.status === move.from)?.leads.find((candidate) => candidate.id === move.leadId);
  if (!lead) return columns;
  const value = lead.potentialValueCents ?? 0;
  return columns.map((column) => {
    if (column.status === move.from) {
      return {
        ...column,
        count: column.count - 1,
        potentialValueCents: column.potentialValueCents - value,
        leads: column.leads.filter((candidate) => candidate.id !== move.leadId),
      };
    }
    if (column.status === move.to) {
      return {
        ...column,
        count: column.count + 1,
        potentialValueCents: column.potentialValueCents + value,
        leads: [{ ...lead, status: move.to }, ...column.leads],
      };
    }
    return column;
  });
}

const label = (status: LeadStatus) => LEAD_STATUS_META[status].label;

export function LeadsKanban({ columns, currency, now, listQuery }: { columns: PipelineColumn[]; currency: string; now: Date; listQuery: string }) {
  const [board, moveOnBoard] = useOptimistic(columns, applyMove);
  const [, startTransition] = useTransition();
  const [dragged, setDragged] = useState<LeadListRow | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const move = (lead: LeadListRow, to: LeadStatus) => {
    if (lead.status === to) return;
    startTransition(async () => {
      moveOnBoard({ leadId: lead.id, from: lead.status, to });
      const result = await changeLeadStatusAction(lead.id, to);
      if (result.status === "error") toast.error(result.message);
    });
  };

  const findLead = (id: string) => board.flatMap((column) => column.leads).find((lead) => lead.id === id) ?? null;

  const onDragStart = (event: DragStartEvent) => setDragged(findLead(String(event.active.id)));
  const onDragEnd = (event: DragEndEvent) => {
    setDragged(null);
    const lead = findLead(String(event.active.id));
    const target = event.over?.id;
    if (lead && typeof target === "string" && (LEAD_STATUSES as readonly string[]).includes(target)) move(lead, target as LeadStatus);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${findLead(String(active.id))?.name ?? "Contact"} sélectionné.`,
    onDragOver: ({ over }) => (over ? `Au-dessus de l'étape ${label(over.id as LeadStatus)}.` : "Hors des étapes."),
    onDragEnd: ({ active, over }) =>
      over ? `${findLead(String(active.id))?.name ?? "Contact"} déplacé vers ${label(over.id as LeadStatus)}.` : "Déplacement annulé.",
    onDragCancel: () => "Déplacement annulé.",
  };

  return (
    <DndContext
      // A fixed id keeps dnd-kit's accessibility ids identical on server and client (no hydration mismatch).
      id="leads-kanban"
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "Glissez la carte vers une autre étape, ou utilisez le menu « Déplacer vers » de la carte.",
        },
      }}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex snap-x snap-mandatory gap-4 sm:snap-none">
          {board.map((column) => (
            <KanbanColumn key={column.status} column={column} currency={currency} listQuery={listQuery}>
              {column.leads.map((lead) => (
                <KanbanCard key={lead.id} lead={lead} currency={currency} now={now} onMove={move} />
              ))}
            </KanbanColumn>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragged ? <CardBody lead={dragged} currency={currency} now={now} className="rotate-2 shadow-lg" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  currency,
  listQuery,
  children,
}: {
  column: PipelineColumn;
  currency: string;
  listQuery: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const hidden = column.count - column.leads.length;
  const params = new URLSearchParams(listQuery.replace(/^\?/, ""));
  params.set("status", column.status);
  params.delete("view");
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${column.status}`}
      className={cn(
        "flex w-[17rem] shrink-0 snap-start flex-col rounded-2xl border border-transparent bg-muted/50 p-2 transition-colors",
        isOver && "border-sofia/40 bg-sofia-soft/60",
      )}
    >
      <header className="flex items-baseline justify-between gap-2 px-2 pt-1.5 pb-2.5">
        <h2 id={`column-${column.status}`} className="text-sm font-semibold">
          {column.label}
          <span className="ml-1.5 text-xs font-medium text-muted-foreground tabular">{column.count}</span>
        </h2>
        {column.potentialValueCents > 0 ? (
          <span className="text-xs text-muted-foreground tabular" title="Valeur potentielle cumulée">
            {formatCurrency(column.potentialValueCents, currency)}
          </span>
        ) : null}
      </header>
      <ul className="flex min-h-24 flex-col gap-2" aria-label={`${column.label} : ${column.count} contacts`}>
        {children}
      </ul>
      {hidden > 0 ? (
        <Link href={`/leads?${params.toString()}`} className="mt-2 rounded-lg px-2 py-1.5 text-center text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground">
          Voir les {hidden} autres
        </Link>
      ) : null}
    </section>
  );
}

function KanbanCard({ lead, currency, now, onMove }: { lead: LeadListRow; currency: string; now: Date; onMove: (lead: LeadListRow, to: LeadStatus) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <li ref={setNodeRef} className={cn("relative touch-manipulation", isDragging && "opacity-40")} {...listeners} {...attributes} aria-roledescription="carte déplaçable">
      <CardBody lead={lead} currency={currency} now={now} />
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={`Déplacer ${lead.name} vers une autre étape`} onPointerDown={(event) => event.stopPropagation()}>
              <MoreHorizontalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_STATUSES.filter((status) => status !== lead.status).map((status) => (
              <DropdownMenuItem key={status} onSelect={() => onMove(lead, status)}>
                {label(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function CardBody({ lead, currency, now, className }: { lead: LeadListRow; currency: string; now: Date; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 pr-9 shadow-xs transition-shadow hover:shadow-sm", className)}>
      <div className="flex items-start gap-2.5">
        <LeadAvatar name={lead.name} seed={lead.id} className="size-7 text-[0.625rem]" />
        <div className="min-w-0 flex-1">
          <Link href={`/leads/${lead.id}`} className="block truncate text-sm font-medium hover:underline" draggable={false}>
            {lead.name}
          </Link>
          {lead.serviceName ? <p className="truncate text-xs text-muted-foreground">{lead.serviceName}</p> : null}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <LeadOrigin source={lead.source} channel={lead.channel} />
          <span className="truncate">{lead.lastInteractionAt ? formatRelativeTime(lead.lastInteractionAt, now) : ""}</span>
        </span>
        {lead.potentialValueCents !== null ? (
          <span className="shrink-0 font-medium text-foreground tabular">{formatCurrency(lead.potentialValueCents, currency)}</span>
        ) : null}
      </div>
      {lead.nextAppointmentAt ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
          <CalendarCheckIcon className="size-3.5" aria-hidden />
          RDV {formatRelativeTime(lead.nextAppointmentAt, now)}
        </p>
      ) : lead.nextFollowUpAt && lead.nextFollowUpAt <= now ? (
        <p className="mt-2 text-xs font-medium text-sofia-strong">À relancer</p>
      ) : null}
    </div>
  );
}
