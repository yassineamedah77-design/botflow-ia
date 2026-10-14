import { ArrowLeftIcon, LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { ClientFileImport } from "@/components/leads/client-file-import";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listContactImports } from "@/server/services/contact-import";

export const metadata: Metadata = { title: "Importer un fichier clients" };

export default async function ImportClientsPage() {
  const ctx = await requireTenant();
  const imports = ctx.can("leads:import") ? await withTenant(ctx.organization.id, (tx) => listContactImports(tx, ctx.organization.id)) : [];

  return (
    <>
      <Link href="/leads" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Leads
      </Link>
      <PageHeader
        title="Importer votre fichier clients"
        description="Vos anciennes clientes, celles qui ne sont jamais revenues ou plus venues depuis des mois : importez-les pour que SOFIA puisse les réactiver."
      />
      {ctx.can("leads:import") ? (
        <>
          <ClientFileImport />
          {imports.length > 0 ? (
            <section className="mt-12 max-w-4xl" aria-labelledby="imports-history">
              <h2 id="imports-history" className="mb-3 text-sm font-semibold">
                Imports précédents
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
                {imports.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <span className="font-medium">{item.fileName}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(item.createdAt, { timeZone: ctx.organization.timezone })} · {item.createdCount} ajoutés · {item.updatedCount}{" "}
                      complétés · {item.skippedCount} écartés
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <Alert>
          <LockIcon aria-hidden />
          <AlertDescription>L&apos;import d&apos;un fichier clients est réservé aux propriétaires et administrateurs.</AlertDescription>
        </Alert>
      )}
    </>
  );
}
