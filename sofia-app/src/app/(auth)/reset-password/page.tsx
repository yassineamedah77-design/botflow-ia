import type { Metadata } from "next";
import Link from "next/link";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { isAuthTokenUsable } from "@/server/auth/tokens";
import { withSystem } from "@/server/db/context";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  // The token is in the URL: never leak it through the Referer header.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const { token } = await props.searchParams;
  const usable =
    typeof token === "string" &&
    token.length >= 20 &&
    token.length <= 200 &&
    (await withSystem((tx) => isAuthTokenUsable(tx, token, "PASSWORD_RESET")));

  if (!usable) {
    return (
      <>
        <AuthHeading
          title="Lien expiré"
          description="Ce lien de réinitialisation est invalide, a déjà été utilisé ou a expiré (il est valable une heure). Demandez-en un nouveau."
        />
        <Link href="/forgot-password" className={buttonVariants({ size: "xl", className: "w-full" })}>
          Recevoir un nouveau lien
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Nouveau mot de passe"
        description="Choisissez un nouveau mot de passe. Vos autres sessions seront déconnectées par sécurité."
      />
      <ResetPasswordForm action={resetPasswordAction} token={token} />
    </>
  );
}
