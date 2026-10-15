"use client";

import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { readableTextColor, type WidgetSettings } from "@/lib/widget";

export function WidgetSettingsForm({
  action,
  initial,
  canEdit,
  hasWhatsappNumber,
  defaultGreeting,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: WidgetSettings;
  canEdit: boolean;
  hasWhatsappNumber: boolean;
  defaultGreeting: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [color, setColor] = useState(initial.accentColor);
  const [position, setPosition] = useState(initial.position);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Enregistré.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const validColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : initial.accentColor;

  return (
    <form action={formAction} className="grid gap-6">
      <fieldset disabled={!canEdit} className="grid gap-6 disabled:opacity-80">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="enabled">Widget activé</Label>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Désactivé, le bouton disparaît de votre site et plus aucun message n&apos;est accepté.
            </p>
          </div>
          <Switch id="enabled" name="enabled" defaultChecked={initial.enabled} disabled={!canEdit} />
        </div>

        <FormField
          id="allowedDomains"
          label="Domaines autorisés"
          error={fieldError(state, "allowedDomains")}
          hint="Un domaine par ligne, par exemple institut-eclat.fr. Chaque domaine couvre aussi ses sous-domaines (www…). Ailleurs, le widget ne s'affiche pas."
        >
          {(props) => (
            <Textarea
              {...props}
              name="allowedDomains"
              rows={3}
              placeholder="institut-eclat.fr"
              defaultValue={submittedValue(state, "allowedDomains", initial.allowedDomains.join("\n"))}
              className="font-mono text-[0.8125rem]"
            />
          )}
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="accentColor" label="Couleur" error={fieldError(state, "accentColor")} hint="Celle de votre marque, au format #RRGGBB.">
            {(props) => (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={validColor}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Choisir la couleur"
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-input bg-card p-1"
                  disabled={!canEdit}
                />
                <Input {...props} name="accentColor" value={color} onChange={(event) => setColor(event.target.value)} className="font-mono" maxLength={7} />
              </div>
            )}
          </FormField>

          <fieldset className="grid content-start gap-2">
            <legend className="mb-2 text-sm font-medium">Position du bouton</legend>
            <div className="flex gap-2">
              {(["right", "left"] as const).map((value) => (
                <Label
                  key={value}
                  className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 font-normal shadow-xs has-checked:border-foreground/50 has-checked:bg-muted/40"
                >
                  <input
                    type="radio"
                    name="position"
                    value={value}
                    checked={position === value}
                    onChange={() => setPosition(value)}
                    className="sr-only"
                  />
                  {value === "right" ? "En bas à droite" : "En bas à gauche"}
                </Label>
              ))}
            </div>
          </fieldset>
        </div>

        <FormField
          id="greeting"
          label="Message d'accueil"
          error={fieldError(state, "greeting")}
          hint="Laissez vide pour le message par défaut, traduit dans la langue de la visiteuse."
        >
          {(props) => (
            <Textarea {...props} name="greeting" rows={2} maxLength={300} placeholder={defaultGreeting} defaultValue={submittedValue(state, "greeting", initial.greeting ?? "")} />
          )}
        </FormField>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <Label htmlFor="whatsappButton">Bouton « Continuer sur WhatsApp »</Label>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              {hasWhatsappNumber ? (
                "La visiteuse peut poursuivre sur votre WhatsApp, avec une référence qui relie les deux conversations."
              ) : (
                <>
                  Ajoutez votre numéro WhatsApp à la{" "}
                  <Link href="/knowledge" className="font-medium text-foreground underline underline-offset-4">
                    fiche de l&apos;établissement
                  </Link>{" "}
                  pour afficher ce bouton.
                </>
              )}
            </p>
          </div>
          <Switch id="whatsappButton" name="whatsappButton" defaultChecked={initial.whatsappButton} disabled={!canEdit} />
        </div>

        <FormField
          id="privacyUrl"
          label="Politique de confidentialité (facultatif)"
          error={fieldError(state, "privacyUrl")}
          hint="Lien affiché sous la conversation, à côté de la mention d'information."
        >
          {(props) => (
            <Input {...props} name="privacyUrl" type="url" placeholder="https://institut-eclat.fr/confidentialite" defaultValue={submittedValue(state, "privacyUrl", initial.privacyUrl ?? "")} />
          )}
        </FormField>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-[0.8125rem] text-muted-foreground">
          <span
            className="flex size-11 items-center justify-center rounded-full shadow-md"
            style={{ background: validColor, color: readableTextColor(validColor) }}
            aria-hidden
          >
            <MessageCircleIcon className="size-5" />
          </span>
          Aperçu du bouton, {position === "right" ? "en bas à droite" : "en bas à gauche"} de votre site.
        </div>
        {canEdit ? (
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">Seuls les propriétaires et administrateurs peuvent modifier le widget.</p>
        )}
      </div>
    </form>
  );
}
