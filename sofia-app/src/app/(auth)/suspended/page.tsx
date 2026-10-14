import type { Metadata } from "next";

import { signOutAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Établissement suspendu" };

export default async function SuspendedPage() {
  await requireSession();
  return (
    <>
      <AuthHeading
        title="Établissement suspendu"
        description="L'accès à cet établissement est temporairement suspendu. Contactez l'équipe BotFlow IA pour le rétablir. Vos données sont conservées."
      />
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="xl" className="w-full">
          Me déconnecter
        </Button>
      </form>
    </>
  );
}
