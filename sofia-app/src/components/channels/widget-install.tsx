"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** The one line to paste on the website, with a copy button. */
export function WidgetInstall({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Code copié. Collez-le sur votre site, juste avant </body>.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Copie impossible : sélectionnez le code et copiez-le à la main.");
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative min-w-0">
        <pre className="max-w-full overflow-x-auto rounded-xl border border-border bg-[#161514] p-4 pr-14 font-mono text-[0.8125rem] leading-relaxed text-[#f3efe9]">
          <code data-testid="widget-snippet">{snippet}</code>
        </pre>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={copy}
          className="absolute top-2.5 right-2.5 size-8"
          aria-label={copied ? "Code copié" : "Copier le code"}
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </Button>
      </div>
      <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
        Collez cette ligne sur toutes les pages de votre site, juste avant la balise <code className="font-mono">&lt;/body&gt;</code>. Sur WordPress,
        une extension d&apos;insertion de code (par exemple WPCode) le fait en un clic ; sur Wix, Webflow et Shopify, utilisez le champ « code
        personnalisé » de pied de page. Le widget s&apos;affiche uniquement sur les domaines autorisés ci-dessous.
      </p>
    </div>
  );
}
