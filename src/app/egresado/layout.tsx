import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import { IconDashboard, IconUpload, IconDocument, IconBookOpen } from "@/components/icons";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/egresado", icon: <IconDashboard /> },
  { label: "Mis Documentos", href: "/egresado/documentos", icon: <IconUpload /> },
  { label: "Mis Propuestas", href: "/egresado/propuestas", icon: <IconDocument /> },
  { label: "Plan de Trabajo", href: "/egresado/plan", icon: <IconBookOpen /> },
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

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        role="egresado"
        roleName="Egresado"
        userName={session.nombreCompleto}
        navItems={navItems}
        accentColor="bg-amber-600"
      />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
