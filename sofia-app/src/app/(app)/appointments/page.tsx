import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/app/module-placeholder";
import { requireTenant } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Rendez-vous" };

export default async function AppointmentsPage() {
  await requireTenant();
  return (
    <ModulePlaceholder
      title="Rendez-vous"
      description="Les réservations prises par SOFIA et par votre équipe, synchronisées avec votre agenda."
      phase={7}
      capabilities={[
        "Créneaux calculés à partir de vos horaires, durées de prestation et praticiens, sans double réservation",
        "Agenda SOFIA intégré, Google Calendar et Calendly",
        "Confirmation, déplacement et annulation par SOFIA ou par l'équipe",
        "Rappels automatiques 48 h, 24 h et quelques heures avant",
      ]}
    />
  );
}
