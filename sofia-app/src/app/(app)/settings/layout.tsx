import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <PageHeader title="Paramètres" description="Réglages de votre établissement et de votre compte." />
      <SettingsNav />
      {children}
    </>
  );
}
