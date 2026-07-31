import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";
import NotificationBell from "@/components/NotificationBell";

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
    <div className="flex flex-col lg:flex-row min-h-screen bg-muted-bg print:bg-white print:block">
      <AdminSidebar />
      <div className="flex-1 lg:ml-[280px] w-full min-w-0 print:ml-0 print:w-full flex flex-col">
        {/* Top Header with Notification Bell */}
        <header className="bg-brand-red text-white shadow-md print:hidden">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-base sm:text-lg tracking-wide">Panel de Administración</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                UNICAES
              </span>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell roleName="admin" />
              
              <div className="flex items-center gap-3 border-l border-white/20 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold leading-tight">{session.nombreCompleto}</p>
                  <p className="text-[10px] text-white/80 uppercase font-bold">Administrador</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs">
                  {session.nombreCompleto?.substring(0, 2).toUpperCase() || "AD"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 overflow-x-hidden print:p-0 print:max-w-none print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
