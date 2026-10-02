import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/dal";

export default async function RootPage() {
  redirect((await getCurrentSession()) ? "/dashboard" : "/login");
}
