import { PageHeader } from "@/components/app/page-header";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";

export default function KnowledgeLayout({ children }: LayoutProps<"/knowledge">) {
  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Tout ce que SOFIA a le droit de dire sur votre établissement. Ce qui n'est pas ici, elle ne l'invente pas : elle vérifie ou passe la main à votre équipe."
      />
      <KnowledgeNav />
      {children}
    </>
  );
}
