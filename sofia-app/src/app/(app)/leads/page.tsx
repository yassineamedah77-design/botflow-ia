import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Leads"
      description="Le CRM intégré : chaque prospect et cliente, de la première question au rendez-vous honoré."
      phase={2}
      capabilities={[
        "Pipeline en 12 étapes, en vue Kanban et en vue tableau",
        "Fiche complète : coordonnées, canal, prestation recherchée, score, valeur potentielle et générée",
        "Historique des conversations, des rendez-vous et des changements de statut",
        "Prochaine relance, notes d'équipe et consentement marketing visibles d'un coup d'œil",
      ]}
    />
  );
}
