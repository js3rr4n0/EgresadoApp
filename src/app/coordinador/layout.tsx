import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardHeader, { type NavItem } from "@/components/DashboardHeader";

const navItems: NavItem[] = [
  { label: "Coordinación de Propuestas", href: "/coordinador" },
];

export default async function CoordinadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted-bg flex flex-col font-sans">
      <DashboardHeader
        roleName="Coordinador"
        userName={session.nombreCompleto}
        navItems={navItems}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-[1400px] mx-auto px-4">
          Sistema de Seguimiento de Egresados - Universidad Católica de El Salvador (UNICAES) © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
