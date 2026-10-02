import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Réactivation" };

export default async function ReactivationPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Réactivation"
      description="Faire revenir les clientes qui n'ont pas réservé depuis longtemps."
      phase={8}
      capabilities={[
        "Détection des clientes inactives depuis 60, 90 ou 120 jours",
        "Campagnes ciblées : segment, délai d'inactivité, message personnalisé, canal et date d'envoi",
        "SOFIA prend le relais sur chaque réponse et propose un rendez-vous",
        "Uniquement auprès des clientes ayant donné leur consentement",
      ]}
    />
  );
}
