import { CircleAlertIcon, InfoIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type * as React from "react";

import { StatusDot } from "@/components/app/status-dot";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { Logo, SofiaMark } from "@/components/brand/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Design system" };

const COLORS = [
  { name: "Ink", token: "--foreground", hex: "#161514", role: "Texte, actions principales" },
  { name: "Paper", token: "--background", hex: "#FAF8F5", role: "Fond de l'application" },
  { name: "Card", token: "--card", hex: "#FFFFFF", role: "Surfaces, cartes" },
  { name: "Sand", token: "--secondary", hex: "#F2EDE6", role: "Surfaces secondaires" },
  { name: "Sand strong", token: "--sand-strong", hex: "#B9A88F", role: "Accents neutres, graphiques" },
  { name: "Border", token: "--border", hex: "#E9E3D9", role: "Séparateurs" },
  { name: "SOFIA", token: "--sofia", hex: "#D97757", role: "IA uniquement : marque, statut, focus" },
  { name: "SOFIA soft", token: "--sofia-soft", hex: "#FBEEE8", role: "Fonds liés à SOFIA" },
];

const FEEDBACK = [
  { name: "Succès", className: "bg-success", hex: "#2E7D57" },
  { name: "Attention", className: "bg-warning", hex: "#A8691A" },
  { name: "Erreur", className: "bg-destructive", hex: "#B42318" },
  { name: "Information", className: "bg-info", hex: "#3A6EA5" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && !env().SHOW_DESIGN_SYSTEM) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <header className="pb-10">
        <Logo size="lg" withTagline />
        <h1 className="mt-10 text-4xl font-semibold">Design system</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
          SaaS B2B premium, univers beauté, technologie IA. Beaucoup d&apos;espace, des cartes sobres, des ombres très
          légères, et un seul accent coloré : l&apos;orange SOFIA, réservé à ce qui relève de l&apos;IA.
        </p>
      </header>

      <Section title="Couleurs" description="Noir profond, blanc cassé, beige. L'orange est utilisé avec parcimonie.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLORS.map((color) => (
            <div key={color.name} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="h-20 border-b border-border" style={{ background: color.hex }} />
              <div className="p-3.5">
                <p className="text-sm font-medium">{color.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {color.hex} · {color.token}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">{color.role}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {FEEDBACK.map((color) => (
            <div key={color.name} className="flex items-center gap-2 text-sm">
              <span className={`size-4 rounded-full ${color.className}`} />
              {color.name} <span className="font-mono text-xs text-muted-foreground">{color.hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typographie" description="DM Sans pour les titres et les chiffres clés, Inter pour l'interface.">
        <div className="space-y-5">
          <p className="font-heading text-5xl font-semibold tracking-tight tabular">12 480 €</p>
          <h1 className="text-[2rem] font-semibold">Titre de page — DM Sans 32</h1>
          <h2 className="text-xl font-semibold">Titre de section — DM Sans 20</h2>
          <p className="max-w-2xl text-[0.9375rem] leading-relaxed">
            Texte courant — Inter 15. SOFIA répond à vos clientes 24 h/24, récupère les leads perdus et remplit votre agenda.
          </p>
          <p className="text-sm text-muted-foreground">Texte secondaire — Inter 14, gris chaud.</p>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Surtitre — Inter 12</p>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Principal</Button>
          <Button variant="sofia">
            <SparklesIcon aria-hidden />
            Action SOFIA
          </Button>
          <Button variant="outline">Secondaire</Button>
          <Button variant="secondary">Tertiaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="link">Lien</Button>
          <Button disabled>Désactivé</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="xs">XS</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra large</Button>
        </div>
      </Section>

      <Section title="Formulaires">
        <div className="grid max-w-xl gap-5">
          <div className="grid gap-2">
            <Label htmlFor="ds-email">Email professionnel</Label>
            <Input id="ds-email" placeholder="vous@etablissement.fr" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-invalid">Champ en erreur</Label>
            <Input id="ds-invalid" aria-invalid defaultValue="adresse@invalide" />
            <p className="text-[0.8125rem] font-medium text-destructive">Adresse email invalide.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ds-note">Note</Label>
            <Textarea id="ds-note" placeholder="Ajouter une note sur la cliente…" />
          </div>
        </div>
      </Section>

      <Section title="Badges et statuts">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge>Propriétaire</Badge>
          <Badge variant="outline">Équipe</Badge>
          <Badge variant="sofia">HOT LEAD</Badge>
          <Badge variant="success">Rendez-vous confirmé</Badge>
          <Badge variant="warning">À relancer</Badge>
          <Badge variant="destructive">No-show</Badge>
          <Badge variant="info">Consultation préalable</Badge>
          <Badge variant="muted">Bientôt</Badge>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-5 text-sm">
          <span className="flex items-center gap-2">
            <WhatsAppIcon className="size-4" /> WhatsApp <StatusDot status="CONNECTED" />
          </span>
          <span className="flex items-center gap-2">
            <InstagramIcon className="size-4" /> Instagram <StatusDot status="NOT_CONNECTED" />
          </span>
          <span className="flex items-center gap-2">
            <SofiaMark /> SOFIA
          </span>
        </div>
      </Section>

      <Section title="Alertes">
        <div className="grid gap-3 md:grid-cols-2">
          <Alert variant="info">
            <InfoIcon aria-hidden />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription className="text-info/85">La synchronisation du calendrier arrive en phase 7.</AlertDescription>
          </Alert>
          <Alert variant="sofia">
            <SparklesIcon aria-hidden />
            <AlertTitle>SOFIA</AlertTitle>
            <AlertDescription className="text-sofia-strong/85">SOFIA a besoin des prix pour répondre aux demandes de tarifs.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription className="text-warning/90">2 prestations n&apos;ont pas de prix.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Erreur d&apos;intégration</AlertTitle>
            <AlertDescription className="text-destructive/90">WhatsApp a refusé le message : jeton expiré.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Cartes">
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Carte standard</CardTitle>
              <CardDescription>Bordure beige, ombre très légère, coins 14 px.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Contenu de la carte.</CardContent>
            <CardFooter className="justify-end">
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardFooter>
          </Card>
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-md">
            <p className="text-sm text-primary-foreground/70">Carte héros</p>
            <p className="mt-3 font-heading text-4xl font-semibold tabular">12 480 €</p>
            <p className="mt-1 text-sm text-primary-foreground/60">Réservée à l&apos;indicateur principal</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Chargement</CardTitle>
              <CardDescription>Squelettes pendant le chargement des données.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Progress value={62} className="h-1.5" aria-label="Exemple de progression" />
            </CardContent>
          </Card>
        </div>
      </Section>
    </main>
  );
}
