"use client";

import { ArchiveIcon, ClockIcon, Loader2Icon, PencilIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/format";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { describePrice, type PriceType } from "@/lib/pricing";
import { PRICE_TYPE_LABELS, PRICE_TYPES } from "@/lib/validation/knowledge";

export interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceType: PriceType;
  priceCents: number | null;
  durationMinutes: number | null;
  preparation: string | null;
  contraindications: string | null;
  requiresConsultation: boolean;
}

type ServiceAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** "85,5" for 8550 cents: the price as a person types it back. */
function priceInput(cents: number | null) {
  if (cents === null) return "";
  return (cents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2, useGrouping: false });
}

function ServiceForm({ action, service, onSuccess }: { action: ServiceAction; service?: ServiceRow; onSuccess: () => void }) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: string, fallback: string) => submittedValue(state, field, fallback);
  const [priceType, setPriceType] = useState<PriceType>((value("priceType", service?.priceType ?? "FIXED") as PriceType) || "FIXED");
  const priced = priceType === "FIXED" || priceType === "FROM";

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Enregistré.");
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-5">
      <FormMessage state={state.status === "error" ? state : idleState} />
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
        <FormField id="service-name" label="Nom de la prestation" error={fieldError(state, "name")}>
          {(props) => <Input {...props} name="name" defaultValue={value("name", service?.name ?? "")} maxLength={80} required />}
        </FormField>
        <FormField id="service-category" label="Catégorie" error={fieldError(state, "category")}>
          {(props) => <Input {...props} name="category" defaultValue={value("category", service?.category ?? "")} placeholder="Visage, corps…" maxLength={60} />}
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField id="service-priceType" label="Tarif" error={fieldError(state, "priceType")}>
          {(props) => (
            <>
              <input type="hidden" name="priceType" value={priceType} />
              <Select value={priceType} onValueChange={(next) => setPriceType(next as PriceType)}>
                <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRICE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </FormField>
        <FormField id="service-price" label="Prix (€)" error={fieldError(state, "price")}>
          {(props) => (
            <Input
              {...props}
              name="price"
              inputMode="decimal"
              defaultValue={value("price", priceInput(service?.priceCents ?? null))}
              disabled={!priced}
              placeholder={priced ? "85" : "—"}
            />
          )}
        </FormField>
        <FormField id="service-duration" label="Durée (min)" error={fieldError(state, "durationMinutes")}>
          {(props) => (
            <Input
              {...props}
              name="durationMinutes"
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              step={5}
              defaultValue={value("durationMinutes", service?.durationMinutes?.toString() ?? "")}
            />
          )}
        </FormField>
      </div>

      <FormField id="service-description" label="Description" error={fieldError(state, "description")} hint="Ce que la cliente doit savoir pour choisir.">
        {(props) => <Textarea {...props} name="description" defaultValue={value("description", service?.description ?? "")} rows={3} maxLength={1000} />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="service-preparation" label="Préparation" error={fieldError(state, "preparation")} hint="Avant le rendez-vous.">
          {(props) => <Textarea {...props} name="preparation" defaultValue={value("preparation", service?.preparation ?? "")} rows={2} maxLength={1000} />}
        </FormField>
        <FormField
          id="service-contraindications"
          label="Contre-indications"
          error={fieldError(state, "contraindications")}
          hint="SOFIA passe la main à l'équipe sur ces sujets."
        >
          {(props) => (
            <Textarea {...props} name="contraindications" defaultValue={value("contraindications", service?.contraindications ?? "")} rows={2} maxLength={1000} />
          )}
        </FormField>
      </div>
      <Label htmlFor="service-consultation" className="flex items-start gap-3 font-normal">
        <Checkbox
          id="service-consultation"
          name="requiresConsultation"
          defaultChecked={state.status === "error" ? state.values?.requiresConsultation === "on" : (service?.requiresConsultation ?? false)}
          className="mt-0.5"
        />
        <span className="text-sm leading-relaxed">
          Consultation préalable obligatoire
          <span className="block text-[0.8125rem] text-muted-foreground">SOFIA propose d&apos;abord une consultation au lieu de réserver directement.</span>
        </span>
      </Label>
      <div className="flex justify-end border-t border-border pt-5">
        <SubmitButton pendingLabel="Enregistrement…">{service ? "Enregistrer" : "Ajouter la prestation"}</SubmitButton>
      </div>
    </form>
  );
}

function ServiceDialog({ action, service }: { action: ServiceAction; service?: ServiceRow }) {
  const [open, setOpen] = useState(false);
  // A new form (fresh state) each time the dialog opens.
  const [generation, setGeneration] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setGeneration((value) => value + 1);
      }}
    >
      <DialogTrigger asChild>
        {service ? (
          <Button variant="ghost" size="icon" aria-label={`Modifier ${service.name}`}>
            <PencilIcon aria-hidden />
          </Button>
        ) : (
          <Button>
            <PlusIcon aria-hidden />
            Ajouter une prestation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? `Modifier « ${service.name} »` : "Nouvelle prestation"}</DialogTitle>
          <DialogDescription>Prix et durée réels : SOFIA ne communique que ce qui est renseigné ici.</DialogDescription>
        </DialogHeader>
        <ServiceForm key={generation} action={action} service={service} onSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}

function ArchiveButton({ service, archive }: { service: ServiceRow; archive: (serviceId: string) => Promise<ActionState> }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Retirer ${service.name}`} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <ArchiveIcon aria-hidden />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer « {service.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            SOFIA ne la proposera plus. Les rendez-vous et les fiches clientes qui la mentionnent la gardent dans leur historique.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await archive(service.id);
                if (result.status === "success") toast.success(result.message ?? "Prestation retirée.");
                else if (result.status === "error") toast.error(result.message);
              })
            }
          >
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The services step: what SOFIA can offer, with real prices and durations. */
export function ServicesManager({
  services,
  canEdit,
  createAction,
  updateAction,
  archiveAction,
}: {
  services: ServiceRow[];
  canEdit: boolean;
  createAction: ServiceAction;
  updateAction: (serviceId: string, state: ActionState, formData: FormData) => Promise<ActionState>;
  archiveAction: (serviceId: string) => Promise<ActionState>;
}) {
  const unpriced = services.filter((service) => !describePrice(service.priceType, service.priceCents).configured).length;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {services.length === 0
            ? "Aucune prestation pour l'instant."
            : `${services.length} prestation${services.length > 1 ? "s" : ""} proposée${services.length > 1 ? "s" : ""} par SOFIA${
                unpriced ? `, dont ${unpriced} sans prix` : ""
              }.`}
        </p>
        {canEdit ? <ServiceDialog action={createAction} /> : null}
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-input bg-muted/30 px-6 py-10 text-center">
          <SparklesIcon className="mx-auto size-6 text-sofia" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Ajoutez vos prestations phares</p>
          <p className="mx-auto mt-1 max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">
            Commencez par celles qu&apos;on vous demande le plus. SOFIA ne cite jamais une prestation ou un prix absent de cette liste.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {services.map((service) => {
            const price = describePrice(service.priceType, service.priceCents);
            return (
              <li key={service.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">{service.name}</span>
                    {service.category ? <span className="text-xs font-normal text-muted-foreground">{service.category}</span> : null}
                    {service.requiresConsultation ? <Badge variant="muted">Consultation préalable</Badge> : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted-foreground">
                    <span className={price.configured ? "text-foreground" : "font-medium text-warning"}>{price.configured ? price.label : "Prix à renseigner"}</span>
                    {service.durationMinutes ? (
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="size-3.5" aria-hidden />
                        {formatDuration(service.durationMinutes)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 items-center">
                    <ServiceDialog action={updateAction.bind(null, service.id)} service={service} />
                    <ArchiveButton service={service} archive={archiveAction} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
