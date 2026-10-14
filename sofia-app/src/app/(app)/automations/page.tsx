import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Automatisations" };

export default async function AutomationsPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Automatisations"
      description="Les relances qui récupèrent les prospects silencieux et les rendez-vous manqués."
      phase={8}
      capabilities={[
        "Relance des prospects sans réponse : +2 h, +24 h, +72 h (délais modifiables)",
        "Rappels de rendez-vous et récupération des no-shows avec proposition d'un nouveau créneau",
        "Respect du consentement et des règles WhatsApp (fenêtre de 24 h, modèles approuvés)",
        "Arrêt immédiat des messages si la cliente le demande",
      ]}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Les réglages par défaut de chaque automatisation sont déjà enregistrés pour votre établissement, désactivés tant
        qu&apos;aucun canal n&apos;est connecté.
      </p>
    </ModulePlaceholder>
  );
}
