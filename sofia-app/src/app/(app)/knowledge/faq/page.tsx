import type { Metadata } from "next";

import { FaqManager } from "@/components/knowledge/faq-manager";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/validation/organization";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listFaqs } from "@/server/services/knowledge-entries";
import { listServiceOptions } from "@/server/services/leads";

import { createFaqAction, deleteFaqAction, updateFaqAction } from "../actions";

export const metadata: Metadata = { title: "Questions fréquentes · Knowledge Base" };

export default async function KnowledgeFaqPage() {
  const ctx = await requireTenant();
  const { faqs, services } = await withTenant(ctx.organization.id, async (tx) => ({
    faqs: await listFaqs(tx, ctx.organization.id),
    services: await listServiceOptions(tx, ctx.organization.id),
  }));
  const languages = ctx.organization.allowedLanguages.filter((language): language is SupportedLanguage =>
    (SUPPORTED_LANGUAGES as readonly string[]).includes(language),
  );

  return (
    <FaqManager
      faqs={faqs}
      services={services}
      languages={languages.length > 0 ? languages : ["fr"]}
      canEdit={ctx.can("knowledge:write")}
      createAction={createFaqAction}
      updateAction={updateFaqAction}
      deleteAction={deleteFaqAction}
    />
  );
}
