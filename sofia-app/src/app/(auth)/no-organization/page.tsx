import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createOrganizationAction } from "@/app/(app)/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { CreateOrganizationForm } from "@/components/auth/create-organization-form";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth/dal";
import { env } from "@/server/env";
import { listUserOrganizations } from "@/server/services/organizations";

export const metadata: Metadata = { title: "Aucun établissement" };

export default async function NoOrganizationPage() {
  const session = await requireSession();
  if ((await listUserOrganizations(session.userId)).length > 0) {
    redirect("/dashboard");
  }

  return (
    <>
      <AuthHeading
        title="Aucun établissement"
        description={
          env().SIGNUP_ENABLED
            ? "Votre compte n'est rattaché à aucun établissement. Créez le vôtre, ou demandez une invitation au responsable de votre équipe."
            : "Votre compte n'est rattaché à aucun établissement. Demandez une invitation au responsable de votre équipe."
        }
      />
      {env().SIGNUP_ENABLED ? <CreateOrganizationForm action={createOrganizationAction} /> : null}
      <form action={signOutAction} className="mt-4">
        <Button type="submit" variant="ghost" className="w-full">
          Me déconnecter
        </Button>
      </form>
    </>
  );
}
