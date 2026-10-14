import { CheckIcon, LockIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Facturation" };

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    tagline: "SOFIA sur votre site",
    features: ["Widget site web", "Knowledge Base", "Inbox et CRM"],
  },
  {
    key: "GROWTH",
    name: "Growth",
    tagline: "Tous vos canaux de messagerie",
    features: ["Site web, WhatsApp et Instagram", "Inbox unifiée et CRM", "Prise de rendez-vous"],
  },
  {
    key: "PRO",
    name: "Pro",
    tagline: "Toute la récupération de chiffre d'affaires",
    features: ["Tous les canaux", "Relances, no-show et réactivation", "Analytics et CA récupéré"],
  },
] as const;

export default async function BillingPage() {
  const ctx = await requireTenant();

  if (!ctx.can("billing:read")) {
    return (
      <>
        <PageHeader title="Facturation" />
        <Alert>
          <LockIcon aria-hidden />
          <AlertDescription>La facturation est réservée aux propriétaires de l&apos;établissement.</AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Facturation" description="Votre formule SOFIA et la gestion de l'abonnement." />
      <Alert variant="info" className="mb-8">
        <LockIcon aria-hidden />
        <AlertDescription className="text-info/85">
          Le paiement en ligne (Stripe) et le changement de formule depuis l&apos;application arrivent en phase 10. D&apos;ici
          là, la formule est gérée avec l&apos;équipe BotFlow IA.
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.key === ctx.organization.plan;
          return (
            <Card key={plan.key} size="lg" className={cn(current && "border-foreground/30 ring-1 ring-foreground/10")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {current ? <Badge>Formule actuelle</Badge> : null}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-sofia" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
