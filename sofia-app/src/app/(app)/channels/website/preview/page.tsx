import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { WidgetPreview } from "@/components/channels/widget-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getWidgetChannel } from "@/server/services/widget-settings";

export const metadata: Metadata = { title: "Aperçu du widget" };

/** A stand-in for the establishment's website, with the real widget on it. */
export default async function WidgetPreviewPage() {
  const ctx = await requireTenant();
  const channel = await withTenant(ctx.organization.id, (tx) => getWidgetChannel(tx, ctx.organization));

  return (
    <>
      <PageHeader
        eyebrow="Site web"
        title="Aperçu du widget"
        description="Le vrai widget, tel que vos visiteuses le verront. Les messages envoyés ici arrivent réellement dans votre inbox."
        actions={
          <Link href="/channels/website" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeftIcon aria-hidden />
            Réglages du widget
          </Link>
        }
      />
      {!channel.settings.enabled ? (
        <Alert className="mb-6">
          <AlertDescription>Le widget est désactivé dans ses réglages : il ne s&apos;affiche donc pas ici non plus.</AlertDescription>
        </Alert>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs" aria-hidden>
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 h-6 flex-1 rounded-md bg-background" />
        </div>
        <div className="grid gap-6 p-8 sm:p-12">
          <div className="h-8 w-2/3 rounded-lg bg-muted" />
          <div className="grid gap-2.5">
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-11/12 rounded bg-muted/70" />
            <div className="h-3 w-4/5 rounded bg-muted/70" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 rounded-xl bg-muted/60" />
            <div className="h-32 rounded-xl bg-muted/60" />
            <div className="h-32 rounded-xl bg-muted/60" />
          </div>
          <div className="h-60" />
        </div>
      </div>
      <WidgetPreview publicId={channel.publicId} />
    </>
  );
}
