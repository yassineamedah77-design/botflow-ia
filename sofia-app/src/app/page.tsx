import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/dal";
import { env } from "@/server/env";

export default async function RootPage() {
  if (await getCurrentSession()) redirect("/dashboard");
  redirect(env().DEMO_MODE ? "/demo" : "/login");
}
