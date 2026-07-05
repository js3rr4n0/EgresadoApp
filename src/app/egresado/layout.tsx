import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHeader, { type NavItem } from "@/components/DashboardHeader";

const navItems: NavItem[] = [
  { label: "Envío de Propuestas", href: "/egresado" },
  { label: "Foro y Comentarios", href: "/egresado/foro" },
];

export default async function EgresadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // Formatting role string as seen in mockup: Egresado + Carnet
  // In the real DB, the carnet is stored, but let's mock it if not in session, or add it later.
  const roleDisplay = `Egresado 2020PM605`; // TODO: Fetch from DB later

  return (
    <div className="flex flex-col min-h-screen bg-muted-bg">
      <DashboardHeader
        roleName={roleDisplay}
        userName={session.nombreCompleto}
        navItems={navItems}
      />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
