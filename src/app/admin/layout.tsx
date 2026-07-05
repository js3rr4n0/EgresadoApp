import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import {
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconBuilding,
  IconUpload,
} from "@/components/icons";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <IconDashboard /> },
  { label: "Usuarios", href: "/admin/usuarios", icon: <IconUsers /> },
  { label: "Fechas Clave", href: "/admin/periodos", icon: <IconCalendar /> },
  { label: "Empresas", href: "/admin/empresas", icon: <IconBuilding /> },
  { label: "Carga CSV", href: "/admin/csv", icon: <IconUpload /> },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        role="admin"
        roleName="Administrador"
        userName={session.nombreCompleto}
        navItems={navItems}
        accentColor="bg-blue-600"
      />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
