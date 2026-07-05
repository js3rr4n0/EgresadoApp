import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardSidebar, { type NavItem } from "@/components/DashboardSidebar";
import { IconDashboard, IconCheckCircle, IconBuilding } from "@/components/icons";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/decanato", icon: <IconDashboard /> },
  { label: "Propuestas", href: "/decanato/propuestas", icon: <IconCheckCircle /> },
  { label: "Empresas", href: "/decanato/empresas", icon: <IconBuilding /> },
];

export default async function DecanatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "decanato") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar
        role="decanato"
        roleName="Decanato"
        userName={session.nombreCompleto}
        navItems={navItems}
        accentColor="bg-emerald-600"
      />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
