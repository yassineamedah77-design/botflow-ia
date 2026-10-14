import { MonitorSmartphoneIcon } from "lucide-react";
import type { Metadata } from "next";

import {
  changePasswordAction,
  resendVerificationEmailAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
  updateProfileAction,
} from "@/app/(app)/actions";
import { ChangePasswordForm, ProfileForm, SessionActionButton } from "@/components/settings/account-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { requireTenant } from "@/server/auth/dal";
import { listUserSessions } from "@/server/auth/sessions";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const ctx = await requireTenant();
  const sessions = await listUserSessions(ctx.user.id);
  const now = new Date();
  const otherSessions = sessions.filter((session) => session.id !== ctx.sessionId);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card size="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Profil
              {ctx.user.emailVerifiedAt ? (
                <Badge variant="success">Email confirmé</Badge>
              ) : (
                <Badge variant="warning">Email à confirmer</Badge>
              )}
            </CardTitle>
            <CardDescription>Votre nom apparaît auprès de votre équipe et dans les conversations reprises en main.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <ProfileForm action={updateProfileAction} name={ctx.user.name} email={ctx.user.email} />
            {ctx.user.emailVerifiedAt ? null : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning-soft px-3.5 py-3 text-[0.8125rem] text-warning">
                <span>Adresse non confirmée.</span>
                <SessionActionButton action={resendVerificationEmailAction} label="Renvoyer l'email" variant="ghost" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card size="lg">
          <CardHeader>
            <CardTitle className="text-base">Mot de passe</CardTitle>
            <CardDescription>Après modification, vos autres appareils sont déconnectés automatiquement.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm action={changePasswordAction} />
          </CardContent>
        </Card>
      </div>

      <Card size="lg">
        <CardHeader>
          <CardTitle className="text-base">Sessions actives</CardTitle>
          <CardDescription>
            Les appareils connectés à votre compte. Déconnectez ceux que vous ne reconnaissez pas, puis changez votre mot de
            passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {sessions.map((session) => {
              const current = session.id === ctx.sessionId;
              return (
                <li key={session.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <MonitorSmartphoneIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {describeUserAgent(session.userAgent)}
                        {current ? <Badge variant="outline">Cet appareil</Badge> : null}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                        {session.ipAddress ?? "Adresse IP inconnue"} · actif {formatRelativeTime(session.lastActiveAt, now)} ·
                        connecté {formatRelativeTime(session.createdAt, now)}
                      </p>
                    </div>
                  </div>
                  {current ? null : (
                    <SessionActionButton action={revokeSessionAction.bind(null, session.id)} label="Déconnecter" />
                  )}
                </li>
              );
            })}
          </ul>
          {otherSessions.length > 0 ? (
            <div className="mt-5 flex justify-end border-t border-border pt-5">
              <SessionActionButton action={revokeOtherSessionsAction} label="Déconnecter tous les autres appareils" variant="destructive" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
