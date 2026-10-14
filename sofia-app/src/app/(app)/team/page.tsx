import type { Metadata } from "next";

import {
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "@/app/(app)/actions";
import { PageHeader } from "@/components/app/page-header";
import {
  ConfirmActionButton,
  InlineActionButton,
  InviteMemberDialog,
  MemberRoleSelect,
} from "@/components/team/team-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assignableRoles, canManageMember, invitableRoles, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { formatDate, formatRelativeTime, initials } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listMembers, listPendingInvitations } from "@/server/services/members";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const ctx = await requireTenant();
  const { members, invitations } = await withTenant(ctx.organization.id, async (tx) => ({
    members: await listMembers(tx, ctx.organization.id),
    invitations: await listPendingInvitations(tx, ctx.organization.id),
  }));
  const now = new Date();
  const canInvite = ctx.can("members:invite");
  const canChangeRoles = ctx.can("members:update_role");
  const canRemove = ctx.can("members:remove");
  const ownerCount = members.filter((member) => member.role === "OWNER").length;

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Les personnes qui travaillent avec SOFIA dans votre établissement, et ce que chacune peut faire."
        actions={canInvite ? <InviteMemberDialog action={inviteMemberAction} roles={invitableRoles(ctx.role)} /> : null}
      />

      <Card size="lg">
        <CardHeader>
          <CardTitle className="text-base">Membres</CardTitle>
          <CardDescription>
            {members.length} membre{members.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const self = member.userId === ctx.user.id;
              const manageable = !self && canManageMember(ctx.role, member.role);
              return (
                <li key={member.membershipId} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {member.name}
                        {self ? <Badge variant="muted">Vous</Badge> : null}
                      </p>
                      <p className="truncate text-[0.8125rem] text-muted-foreground">
                        {member.email} · membre depuis le {formatDate(member.joinedAt, { timeZone: ctx.organization.timezone })}
                        {member.lastLoginAt ? ` · vu ${formatRelativeTime(member.lastLoginAt, now)}` : " · jamais connecté"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:shrink-0">
                    {manageable && canChangeRoles ? (
                      <MemberRoleSelect
                        membershipId={member.membershipId}
                        role={member.role}
                        roles={assignableRoles(ctx.role)}
                        action={changeMemberRoleAction}
                        label={`Rôle de ${member.name}`}
                      />
                    ) : (
                      <Badge variant={member.role === "OWNER" ? "default" : "outline"}>{ROLE_LABELS[member.role]}</Badge>
                    )}
                    {manageable && canRemove ? (
                      <ConfirmActionButton
                        action={removeMemberAction.bind(null, member.membershipId)}
                        triggerLabel="Retirer"
                        title={`Retirer ${member.name} ?`}
                        description="Cette personne perdra immédiatement l'accès à l'établissement. Son compte SOFIA reste actif pour ses autres établissements."
                        confirmLabel="Retirer de l'équipe"
                      />
                    ) : null}
                    {self && members.length > 1 && !(member.role === "OWNER" && ownerCount <= 1) ? (
                      <ConfirmActionButton
                        action={removeMemberAction.bind(null, member.membershipId)}
                        triggerLabel="Quitter"
                        title="Quitter cet établissement ?"
                        description="Vous perdrez l'accès à ses conversations et réglages. Un membre devra vous inviter à nouveau pour revenir."
                        confirmLabel="Quitter l'établissement"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {canInvite ? (
        <Card size="lg" className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Invitations en attente</CardTitle>
            <CardDescription>Les liens d&apos;invitation sont personnels et expirent au bout de 7 jours.</CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune invitation en attente.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {invitation.email}
                        <Badge variant="outline">{ROLE_LABELS[invitation.role]}</Badge>
                      </p>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        Invité·e {invitation.invitedByName ? `par ${invitation.invitedByName} ` : ""}
                        {formatRelativeTime(invitation.createdAt, now)} · expire {formatRelativeTime(invitation.expiresAt, now)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 md:shrink-0">
                      <InlineActionButton action={resendInvitationAction.bind(null, invitation.id)} label="Renvoyer" />
                      <ConfirmActionButton
                        action={revokeInvitationAction.bind(null, invitation.id)}
                        triggerLabel="Annuler"
                        title="Annuler cette invitation ?"
                        description={`Le lien envoyé à ${invitation.email} ne fonctionnera plus.`}
                        confirmLabel="Annuler l'invitation"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rôles</CardTitle>
          <CardDescription>Chaque action est vérifiée côté serveur selon le rôle, quelle que soit l&apos;interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3">
            {ROLES.map((role) => (
              <div key={role} className="rounded-xl border border-border bg-muted/30 p-4">
                <dt className="text-sm font-semibold">{ROLE_LABELS[role]}</dt>
                <dd className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
