import { markNotificationsReadAction, resendVerificationEmailAction, switchOrganizationAction } from "@/app/(app)/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { AppShell } from "@/components/app/app-shell";
import type { ChannelKey, ChannelStatus } from "@/components/app/navigation";
import { VerifyEmailBanner } from "@/components/app/verify-email-banner";
import { permissionsFor } from "@/lib/auth/roles";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listIntegrations, listUserOrganizations, type IntegrationProvider } from "@/server/services/organizations";
import { getShellFeed } from "@/server/services/shell";

const CHANNEL_PROVIDERS: Record<ChannelKey, IntegrationProvider> = {
  whatsapp: "WHATSAPP_CLOUD",
  instagram: "INSTAGRAM_MESSAGING",
  website: "WEBSITE_WIDGET",
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireTenant();
  const organizationId = ctx.organization.id;
  const [organizations, tenant] = await Promise.all([
    listUserOrganizations(ctx.user.id),
    withTenant(organizationId, async (tx) => ({
      integrations: await listIntegrations(tx, organizationId),
      feed: await getShellFeed(tx, organizationId, ctx.user.id),
    })),
  ]);
  const { integrations } = tenant;

  const channels = Object.fromEntries(
    (Object.entries(CHANNEL_PROVIDERS) as Array<[ChannelKey, IntegrationProvider]>).map(([key, provider]) => [
      key,
      (integrations.find((integration) => integration.provider === provider)?.status ?? "NOT_CONNECTED") as ChannelStatus,
    ]),
  ) as Record<ChannelKey, ChannelStatus>;

  return (
    <AppShell
      data={{
        user: { name: ctx.user.name, email: ctx.user.email },
        role: ctx.role,
        permissions: permissionsFor(ctx.role),
        organization: { id: ctx.organization.id, name: ctx.organization.name, sofiaStatus: ctx.organization.sofiaStatus },
        organizations: organizations.map((organization) => ({
          id: organization.organizationId,
          name: organization.name,
          role: organization.role,
        })),
        channels,
        feed: tenant.feed,
      }}
      actions={{ switchOrganization: switchOrganizationAction, signOut: signOutAction, markNotificationsRead: markNotificationsReadAction }}
      banner={
        ctx.user.emailVerifiedAt ? null : <VerifyEmailBanner email={ctx.user.email} action={resendVerificationEmailAction} />
      }
    >
      {children}
    </AppShell>
  );
}
