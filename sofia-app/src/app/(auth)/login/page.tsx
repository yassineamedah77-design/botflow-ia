import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeRedirectPath } from "@/lib/navigation";
import { getCurrentSession } from "@/server/auth/dal";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;

  if (await getCurrentSession()) {
    redirect(safeRedirectPath(next));
  }

  return (
    <>
      <AuthHeading title="Bon retour" description="Connectez-vous à l'espace SOFIA de votre établissement." />
      {searchParams.expired ? (
        <Alert variant="info" className="mb-5">
          <InfoIcon aria-hidden />
          <AlertDescription className="text-info">Votre session a expiré. Reconnectez-vous pour continuer.</AlertDescription>
        </Alert>
      ) : null}
      <LoginForm action={signInAction} next={next} signupEnabled={env().SIGNUP_ENABLED} />
    </>
  );
}
