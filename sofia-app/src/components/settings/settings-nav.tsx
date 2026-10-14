"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/settings", label: "Établissement" },
  { href: "/settings/account", label: "Mon compte" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Paramètres" className="mb-8 flex gap-1 border-b border-border">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
