import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Top of every page of the public demo: where the visitor is, and the way back to the website. */
export function DemoBanner({ organizationName }: { organizationName: string }) {
  return (
    <div className="border-b border-sofia/25 bg-sofia-soft px-4 py-2.5 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-sofia-strong sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 sm:items-center">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
          <span>
            <strong className="font-semibold">Démo SOFIA</strong> · Votre copie privée de {organizationName}, effacée sous 24 heures.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/demo/institut" className={buttonVariants({ size: "sm" })}>
            <ExternalLinkIcon aria-hidden />
            Site de l&apos;institut
          </Link>
          <Link
            href="/demo"
            className={buttonVariants({ size: "sm", variant: "outline", className: "border-sofia/30 bg-transparent text-sofia-strong hover:bg-sofia/10" })}
          >
            Recommencer
          </Link>
        </div>
      </div>
    </div>
  );
}
