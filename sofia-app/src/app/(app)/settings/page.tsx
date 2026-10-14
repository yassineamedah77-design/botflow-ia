import type { Metadata } from "next";

import { updateOrganizationSettingsAction } from "@/app/(app)/actions";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Paramètres" };

const PLAN_LABELS = { STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" } as const;

export default async function SettingsPage() {
  const ctx = await requireTenant();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card size="lg" className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Établissement</CardTitle>
          <CardDescription>Nom, fuseau horaire et langues dans lesquelles SOFIA peut répondre.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            action={updateOrganizationSettingsAction}
            canEdit={ctx.can("org:update")}
            initial={{
              name: ctx.organization.name,
              timezone: ctx.organization.timezone,
              defaultLanguage: ctx.organization.defaultLanguage,
              allowedLanguages: ctx.organization.allowedLanguages,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Formule</dt>
              <dd className="mt-1">
                <Badge variant="outline">{PLAN_LABELS[ctx.organization.plan]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Identifiant</dt>
              <dd className="mt-1 font-mono text-[0.8125rem]">{ctx.organization.slug}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
