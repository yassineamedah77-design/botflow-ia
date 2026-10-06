import type { Metadata } from "next";
import Link from "next/link";

import { acceptInvitationAction, acceptInvitationNewAccountAction, signOutAction } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ConfirmTokenForm } from "@/components/auth/confirm-token-form";
import { InvitationSignupForm } from "@/components/auth/invitation-signup-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { getCurrentSession } from "@/server/auth/dal";
import { getInvitationPreview } from "@/server/services/members";

export const metadata: Metadata = { title: "Invitation", referrer: "no-referrer" };

const UNAVAILABLE = {
  invalid: {
    title: "Invitation introuvable",
    description: "Ce lien d'invitation n'est pas valide ou a été annulé. Demandez une nouvelle invitation au responsable de l'établissement.",
  },
  expired: {
    title: "Invitation expirée",
    description: "Cette invitation a expiré. Demandez au responsable de l'établissement de vous en renvoyer une.",
  },
  used: {
    title: "Invitation déjà utilisée",
    description: "Cette invitation a déjà été acceptée. Connectez-vous pour accéder à l'établissement.",
  },
} as const;

export default async function InvitationPage(props: PageProps<"/invitations/[token]">) {
  const { token } = await props.params;
  const [preview, session] = await Promise.all([getInvitationPreview(token), getCurrentSession()]);

  if (preview.status !== "valid") {
    const copy = UNAVAILABLE[preview.status];
    return (
      <>
        <AuthHeading title={copy.title} description={copy.description} />
        <Link href="/login" className={buttonVariants({ size: "xl", variant: "outline", className: "w-full" })}>
          Aller à la connexion
        </Link>
      </>
    );
  }

  const intro = (
    <>
      {preview.invitedByName ? `${preview.invitedByName} vous invite` : "Vous êtes invité·e"} à rejoindre{" "}
      <strong className="font-semibold text-foreground">{preview.organizationName}</strong> sur SOFIA avec le rôle{" "}
      <strong className="font-semibold text-foreground">{ROLE_LABELS[preview.role]}</strong>.
    </>
  );

  if (session) {
    if (session.user.email !== preview.email) {
      return (
        <>
          <AuthHeading
            title="Mauvais compte"
            description={
              <>
                Cette invitation est destinée à <strong className="text-foreground">{preview.email}</strong>, mais vous êtes
                connecté·e avec {session.user.email}. Déconnectez-vous puis rouvrez le lien de l&apos;invitation.
              </>
            }
          />
          <form action={signOutAction}>
            <Button type="submit" size="xl" variant="outline" className="w-full">
              Me déconnecter
            </Button>
          </form>
        </>
      );
    }
    return (
      <>
        <AuthHeading title={`Rejoindre ${preview.organizationName}`} description={intro} />
        <ConfirmTokenForm action={acceptInvitationAction} token={token} label="Rejoindre l'équipe" />
      </>
    );
  }

  if (preview.accountExists) {
    return (
      <>
        <AuthHeading
          title={`Rejoindre ${preview.organizationName}`}
          description={
            <>
              {intro} Un compte SOFIA existe déjà pour {preview.email} : connectez-vous pour accepter.
            </>
          }
        />
        <Link
          href={`/login?next=${encodeURIComponent(`/invitations/${token}`)}`}
          className={buttonVariants({ size: "xl", className: "w-full" })}
        >
          Me connecter pour accepter
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title={`Rejoindre ${preview.organizationName}`} description={intro} />
      <InvitationSignupForm action={acceptInvitationNewAccountAction} token={token} email={preview.email} />
    </>
  );
}
