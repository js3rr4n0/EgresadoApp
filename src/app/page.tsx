import { redirect } from "next/navigation";
import { getSession, getDashboardPath } from "@/lib/session";

/**
 * Root page — redirects to login or user's dashboard.
 * The proxy handles this too, but this is a fallback.
 */
export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(getDashboardPath(session.rol));
  }
  redirect("/login");
}
