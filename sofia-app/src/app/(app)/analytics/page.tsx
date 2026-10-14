import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Analytics"
      description="Combien SOFIA vous fait-elle récupérer, et sur quel canal ?"
      phase={9}
      capabilities={[
        "Leads entrants et qualifiés, RDV générés et confirmés, no-shows et no-shows récupérés",
        "CA généré et CA récupéré, séparés entre montants confirmés et estimés",
        "Taux de conversion et temps de réponse moyen",
        "Conversations par jour, leads par semaine et performance par canal",
      ]}
    />
  );
}
