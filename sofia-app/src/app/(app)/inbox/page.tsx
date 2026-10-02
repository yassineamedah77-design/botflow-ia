import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Inbox"
      description="Toutes les conversations WhatsApp, Instagram et site web au même endroit."
      phase={2}
      capabilities={[
        "Liste des conversations, fil actif et fiche cliente côte à côte",
        "Filtres par canal, non lus, hot leads, RDV à venir, no-show, à relancer, humain requis",
        "Prise de main d'une conversation : SOFIA se met en retrait, puis la reprend quand vous le décidez",
        "Création de rendez-vous, notes, relance et assignation depuis la conversation",
      ]}
    />
  );
}
