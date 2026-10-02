import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { SignupForm } from "@/components/auth/signup-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/server/auth/dal";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage() {
  if (await getCurrentSession()) {
    redirect("/dashboard");
  }

  if (!env().SIGNUP_ENABLED) {
    return (
      <>
        <AuthHeading
          title="Inscriptions sur invitation"
          description="Les espaces SOFIA sont ouverts par l'équipe BotFlow IA lors de la mise en place de votre établissement. Si vous avez reçu une invitation, utilisez le lien présent dans l'email."
        />
        <Link href="/login" className={buttonVariants({ size: "xl", className: "w-full" })}>
          J&apos;ai déjà un compte
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Créez votre espace SOFIA"
        description="Quelques secondes suffisent. Vous connecterez ensuite vos canaux et vos prestations."
      />
      <SignupForm action={signUpAction} />
    </>
  );
}
