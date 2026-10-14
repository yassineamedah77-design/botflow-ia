import type { Metadata } from "next";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Mot de passe oublié"
        description="Indiquez l'email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe."
      />
      <ForgotPasswordForm action={forgotPasswordAction} />
    </>
  );
}
