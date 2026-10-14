"use client";

import { CopyIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ActionState } from "@/lib/forms/action-state";
import { WEEKDAYS } from "@/lib/pricing";

export interface HoursRange {
  day: number;
  opensAt: string;
  closesAt: string;
}

type Week = Array<Array<{ opensAt: string; closesAt: string }>>;

const DEFAULT_RANGE = { opensAt: "09:00", closesAt: "19:00" };

function toWeek(ranges: HoursRange[]): Week {
  return WEEKDAYS.map((_, index) =>
    ranges.filter((range) => range.day === index + 1).map((range) => ({ opensAt: range.opensAt, closesAt: range.closesAt })),
  );
}

/** Problems shown before saving; the server checks the same rules again. */
function dayProblem(ranges: Week[number]): string | null {
  const sorted = [...ranges].sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  if (sorted.some((range) => !range.opensAt || !range.closesAt)) return "Indiquez les deux heures.";
  if (sorted.some((range) => range.closesAt <= range.opensAt)) return "La fermeture doit suivre l'ouverture.";
  if (sorted.some((range, index) => index > 0 && range.opensAt < sorted[index - 1]!.closesAt)) return "Deux plages se chevauchent.";
  return null;
}

/**
 * Weekly opening hours: SOFIA only offers slots inside them. A closed day
 * has no range; a day can have up to three (e.g. a lunch break).
 */
export function HoursEditor({
  initial,
  canEdit,
  save,
  nextHref,
}: {
  initial: HoursRange[];
  canEdit: boolean;
  save: (ranges: HoursRange[]) => Promise<ActionState>;
  nextHref: string;
}) {
  const router = useRouter();
  const [week, setWeek] = useState<Week>(() => toWeek(initial));
  const [pending, startTransition] = useTransition();
  const problems = week.map(dayProblem);
  const invalid = problems.some(Boolean);

  const update = (day: number, ranges: Week[number]) => setWeek((current) => current.map((value, index) => (index === day ? ranges : value)));

  const submit = (then: "stay" | "next") =>
    startTransition(async () => {
      const ranges = week.flatMap((day, index) => day.map((range) => ({ day: index + 1, ...range })));
      const result = await save(ranges);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(result.status === "success" ? (result.message ?? "Horaires enregistrés.") : "Horaires enregistrés.");
      if (then === "next") router.push(nextHref);
    });

  return (
    <div className="grid gap-5">
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {WEEKDAYS.map((label, day) => {
          const ranges = week[day]!;
          const open = ranges.length > 0;
          const problem = problems[day];
          return (
            <li key={label} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
              <div className="flex h-9 items-center gap-3">
                <Switch
                  id={`open-${day}`}
                  checked={open}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => update(day, checked ? [{ ...DEFAULT_RANGE }] : [])}
                />
                <label htmlFor={`open-${day}`} className="text-sm font-medium text-foreground">
                  {label}
                </label>
              </div>
              {open ? (
                <div className="grid gap-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        step={900}
                        value={range.opensAt}
                        disabled={!canEdit}
                        aria-label={`${label}, plage ${index + 1} : ouverture`}
                        aria-invalid={problem ? true : undefined}
                        onChange={(event) => update(day, ranges.map((item, position) => (position === index ? { ...item, opensAt: event.target.value } : item)))}
                        className="h-9 w-[8.75rem] bg-card tabular-nums"
                      />
                      <span className="text-sm text-muted-foreground" aria-hidden>
                        à
                      </span>
                      <Input
                        type="time"
                        step={900}
                        value={range.closesAt}
                        disabled={!canEdit}
                        aria-label={`${label}, plage ${index + 1} : fermeture`}
                        aria-invalid={problem ? true : undefined}
                        onChange={(event) => update(day, ranges.map((item, position) => (position === index ? { ...item, closesAt: event.target.value } : item)))}
                        className="h-9 w-[8.75rem] bg-card tabular-nums"
                      />
                      {canEdit && ranges.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9"
                          aria-label={`Supprimer la plage ${index + 1} du ${label.toLowerCase()}`}
                          onClick={() => update(day, ranges.filter((_, position) => position !== index))}
                        >
                          <XIcon aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {canEdit && ranges.length < 3 ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => {
                          const last = ranges[ranges.length - 1]!;
                          update(day, [...ranges, { opensAt: last.closesAt < "14:00" ? "14:00" : last.closesAt, closesAt: "19:00" }]);
                        }}
                      >
                        <PlusIcon className="size-3.5" aria-hidden />
                        Ajouter une plage
                      </button>
                    ) : null}
                    {canEdit && day < 5 ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => setWeek((current) => current.map((value, index) => (index > day && index < 6 ? ranges.map((item) => ({ ...item })) : value)))}
                      >
                        <CopyIcon className="size-3.5" aria-hidden />
                        Copier jusqu&apos;au samedi
                      </button>
                    ) : null}
                  </div>
                  {problem ? <p className="text-[0.8125rem] font-medium text-destructive">{problem}</p> : null}
                </div>
              ) : (
                <p className="flex h-9 items-center text-sm text-muted-foreground">Fermé</p>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={pending || invalid} onClick={() => submit("stay")}>
            {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            Enregistrer
          </Button>
          <Button disabled={pending || invalid} onClick={() => submit("next")}>
            {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
            Enregistrer et continuer
          </Button>
        </div>
      ) : (
        <p className="text-[0.8125rem] text-muted-foreground">Seuls les propriétaires et administrateurs peuvent modifier les horaires.</p>
      )}
    </div>
  );
}
