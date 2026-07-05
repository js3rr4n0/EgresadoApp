import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHeader, { type NavItem } from "@/components/DashboardHeader";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Usuarios", href: "/admin/usuarios" },
  { label: "Fechas Clave", href: "/admin/periodos" },
  { label: "Empresas", href: "/admin/empresas" },
  { label: "Carga CSV", href: "/admin/csv" },
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
    <div className="flex flex-col min-h-screen bg-muted-bg">
      <DashboardHeader
        roleName="Administrador"
        userName={session.nombreCompleto}
        navItems={navItems}
      />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
