import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import { IconDashboard, IconClipboard, IconDocument } from "@/components/icons";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/asesor", icon: <IconDashboard /> },
  { label: "Propuestas Asignadas", href: "/asesor/propuestas", icon: <IconDocument /> },
  { label: "Planes de Trabajo", href: "/asesor/planes", icon: <IconClipboard /> },
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
    <div className="flex min-h-screen">
      <DashboardSidebar
        role="asesor"
        roleName="Asesor"
        userName={session.nombreCompleto}
        navItems={navItems}
        accentColor="bg-violet-600"
      />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
