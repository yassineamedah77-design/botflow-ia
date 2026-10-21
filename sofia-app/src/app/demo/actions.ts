"use server";

import { redirect } from "next/navigation";

import { setSessionCookie } from "@/server/auth/cookies";
import { createDemoSandbox, DemoUnavailableError } from "@/server/demo/sandbox";
import { logger } from "@/server/observability/logger";
import { getRequestMeta } from "@/server/security/request";

/** "Lancer ma démo": a fresh copy of Maison Éclat, then its website. */
export async function startDemoAction() {
  let failure: "limite" | "indisponible" | null = null;
  try {
    const sandbox = await createDemoSandbox(await getRequestMeta());
    await setSessionCookie(sandbox.token, sandbox.expiresAt);
  } catch (error) {
    if (error instanceof DemoUnavailableError && error.reason === "disabled") redirect("/login");
    if (error instanceof DemoUnavailableError) failure = "limite";
    else {
      logger.error("Demo sandbox failed", { error });
      failure = "indisponible";
    }
  }
  redirect(failure ? `/demo?erreur=${failure}` : "/demo/institut");
}
