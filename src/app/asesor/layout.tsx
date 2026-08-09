import { redirect } from "next/navigation";
import { getSession, deleteSession } from "@/lib/session";
import NotificationBell from "@/components/NotificationBell";
import Link from "next/link";

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
    <div className="min-h-screen bg-muted-bg flex flex-col font-sans">
      {/* Asesor Top Header */}
      <header className="bg-brand-red text-white shadow-md sticky top-0 z-40 no-print">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/asesor" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-lg">
                A
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-wide block leading-tight">Panel de Asesor</span>
                <span className="text-[10px] text-white/80 font-semibold block">UNICAES - Gestión de Egresados</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell roleName="asesor" />

            <div className="flex items-center gap-3 border-l border-white/20 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold leading-tight">{session.nombreCompleto}</p>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider inline-block mt-0.5">
                  Rol: Asesor
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-white/20 border border-white/40 flex items-center justify-center font-bold text-xs shadow-inner">
                {session.nombreCompleto?.substring(0, 2).toUpperCase() || "AS"}
              </div>

              <form action={async () => {
                "use server";
                await deleteSession();
                redirect("/login");
              }}>
                <button 
                  type="submit"
                  title="Cerrar Sesión"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-bold flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden md:inline">Salir</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-4 text-center text-xs text-muted no-print">
        <div className="max-w-[1400px] mx-auto px-4">
          Sistema de Seguimiento de Egresados - Universidad Católica de El Salvador (UNICAES) © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
