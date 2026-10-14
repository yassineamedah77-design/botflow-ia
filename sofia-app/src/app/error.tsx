"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. The error itself is logged on the server (with
 * its stack) by Next.js; the user only sees a neutral message and the digest
 * that support can match against the logs.
 */
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Erreur inattendue</p>
      <h1 className="mt-3 text-2xl font-semibold">Quelque chose s&apos;est mal passé</h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
        L&apos;incident a été enregistré. Réessayez ; s&apos;il persiste, contactez le support
        {error.digest ? (
          <>
            {" "}
            en indiquant la référence <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <Button className="mt-8" onClick={() => retry()}>
        Réessayer
      </Button>
    </main>
  );
}
