import { XIcon } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { requireTenant } from "@/server/auth/dal";

/** A focused frame for the setup: no sidebar, one way out to the dashboard. */
export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  const ctx = await requireTenant();
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
              <Logo size="sm" />
            </Link>
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {ctx.organization.name} · Mise en route
            </span>
          </div>
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <XIcon aria-hidden />
            Quitter
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
