import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHeader, { type NavItem } from "@/components/DashboardHeader";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/asesor" },
  { label: "Propuestas Asignadas", href: "/asesor/propuestas" },
  { label: "Planes de Trabajo", href: "/asesor/planes" },
];

export default async function AsesorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted-bg">
      <DashboardHeader
        roleName="Asesor"
        userName={session.nombreCompleto}
        navItems={navItems}
      />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
