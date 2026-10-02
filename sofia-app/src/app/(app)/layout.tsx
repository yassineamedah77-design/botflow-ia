import { resendVerificationEmailAction, switchOrganizationAction } from "@/app/(app)/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { AppShell } from "@/components/app/app-shell";
import type { ChannelKey, ChannelStatus } from "@/components/app/navigation";
import { VerifyEmailBanner } from "@/components/app/verify-email-banner";
import { permissionsFor } from "@/lib/auth/roles";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listIntegrations, listUserOrganizations, type IntegrationProvider } from "@/server/services/organizations";

const CHANNEL_PROVIDERS: Record<ChannelKey, IntegrationProvider> = {
  whatsapp: "WHATSAPP_CLOUD",
  instagram: "INSTAGRAM_MESSAGING",
  website: "WEBSITE_WIDGET",
};

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireTenant();
  const [organizations, integrations] = await Promise.all([
    listUserOrganizations(ctx.user.id),
    withTenant(ctx.organization.id, (tx) => listIntegrations(tx, ctx.organization.id)),
  ]);

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
      }}
      actions={{ switchOrganization: switchOrganizationAction, signOut: signOutAction }}
      banner={
        ctx.user.emailVerifiedAt ? null : <VerifyEmailBanner email={ctx.user.email} action={resendVerificationEmailAction} />
      }
    >
      {children}
    </AppShell>
  );
}
