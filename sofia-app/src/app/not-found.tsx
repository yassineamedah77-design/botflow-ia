import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10" />
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Erreur 404</p>
      <h1 className="mt-3 text-3xl font-semibold">Page introuvable</h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
        Cette page n&apos;existe pas ou vous n&apos;y avez pas accès.
      </p>
      <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "mt-8" })}>
        Retour au dashboard
      </Link>
    </main>
  );
}
