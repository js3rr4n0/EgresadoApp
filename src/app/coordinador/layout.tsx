import { redirect } from "next/navigation";
import { getSession, deleteSession } from "@/lib/session";
import NotificationBell from "@/components/NotificationBell";
import Link from "next/link";

export default async function CoordinadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "coordinador") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Coordinador Top Header */}
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/coordinador" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-lg bg-indigo-700 flex items-center justify-center font-extrabold text-white text-lg border border-indigo-500">
                C
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-wide block leading-tight">Panel de Coordinador</span>
                <span className="text-[10px] text-indigo-200 font-semibold block">UNICAES - Coordinación de Trabajos de Graduación</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell roleName="coordinador" />

            <div className="flex items-center gap-3 border-l border-indigo-700 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold leading-tight">{session.nombreCompleto}</p>
                <span className="text-[10px] bg-indigo-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider inline-block mt-0.5 text-indigo-100">
                  Rol: Coordinador
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-700 border border-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner text-white">
                {session.nombreCompleto?.substring(0, 2).toUpperCase() || "CO"}
              </div>

              <form action={async () => {
                "use server";
                await deleteSession();
                redirect("/login");
              }}>
                <button 
                  type="submit"
                  title="Cerrar Sesión"
                  className="p-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white transition-colors text-xs font-bold flex items-center gap-1 border border-indigo-600"
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
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-[1400px] mx-auto px-4">
          Sistema de Seguimiento de Egresados - Universidad Católica de El Salvador (UNICAES) © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
