"use client";

import { cn } from "cn";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/knowledge", label: "Vue d'ensemble" },
  { href: "/knowledge/faq", label: "Questions fréquentes" },
  { href: "/knowledge/promotions", label: "Promotions" },
  { href: "/knowledge/practitioners", label: "Praticiens" },
  { href: "/knowledge/closures", label: "Fermetures" },
  { href: "/knowledge/documents", label: "Documents" },
  { href: "/knowledge/test", label: "Tester SOFIA", highlight: true },
];

export function KnowledgeNav() {
  const pathname = usePathname();
  return (
    // The tabs scroll on their own on a phone: the page itself never scrolls sideways.
    <nav aria-label="Knowledge Base" className="-mx-4 mb-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-border">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                link.highlight && !active && "text-sofia-strong",
              )}
            >
              {link.highlight ? <SparklesIcon className="size-3.5" aria-hidden /> : null}
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
