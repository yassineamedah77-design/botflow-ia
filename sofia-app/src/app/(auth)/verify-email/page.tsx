import type { Metadata } from "next";

import { verifyEmailAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ConfirmTokenForm } from "@/components/auth/confirm-token-form";

export const metadata: Metadata = { title: "Confirmer mon email", referrer: "no-referrer" };

export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  const { token } = await props.searchParams;

  if (typeof token !== "string" || token.length < 20) {
    return (
      <AuthHeading
        title="Lien incomplet"
        description="Ce lien de confirmation est incomplet. Ouvrez à nouveau le lien reçu par email, ou renvoyez-en un depuis votre compte."
      />
    );
  }

  return (
    <>
      <AuthHeading
        title="Confirmez votre adresse email"
        description="Un clic suffit pour sécuriser votre compte et recevoir les alertes de votre établissement."
      />
      <ConfirmTokenForm
        action={verifyEmailAction}
        token={token}
        label="Confirmer mon adresse"
        successLink={{ href: "/dashboard", label: "Accéder à SOFIA" }}
      />
    </>
  );
}
