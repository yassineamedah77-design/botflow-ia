import type { Metadata } from "next";

import { DocumentsManager } from "@/components/knowledge/documents-manager";
import { formatDate } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listDocuments } from "@/server/services/knowledge-entries";

import { createDocumentAction, deleteDocumentAction, updateDocumentAction } from "../actions";

export const metadata: Metadata = { title: "Documents · Knowledge Base" };

export default async function KnowledgeDocumentsPage() {
  const ctx = await requireTenant();
  const documents = await withTenant(ctx.organization.id, (tx) => listDocuments(tx, ctx.organization.id));

  return (
    <DocumentsManager
      documents={documents.map((document) => ({
        id: document.id,
        title: document.title,
        content: document.content,
        chunkCount: document.chunkCount,
        updatedLabel: `mis à jour le ${formatDate(document.updatedAt, { timeZone: ctx.organization.timezone })}`,
      }))}
      canEdit={ctx.can("knowledge:write")}
      createAction={createDocumentAction}
      updateAction={updateDocumentAction}
      deleteAction={deleteDocumentAction}
    />
  );
}
