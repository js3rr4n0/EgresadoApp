import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { solicitudesCoordinacion } from "@/lib/solicitudesCoordinacionServidor";
import { leerSolicitudes } from "@/lib/solicitudesServidor";
import { puedeAtenderPropuesta } from "@/lib/cambioAsesorServidor";
import TablaSolicitudesCoordinacion from "@/components/coordinador/TablaSolicitudesCoordinacion";
import SolicitudesTable from "@/components/solicitudes/SolicitudesTable";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitudes | Coordinación" };

/**
 * D8 (specs/COORDINADOR_ASIGNACION.md): lo que atiende el coordinador además de asignar: bajas, cambios de asesor y
 * solicitudes de empresa de egresados de sus propuestas. Las de la carta (firmantes, supervisor o «sin supervisor») las
 * valida la administración.
 */
export default async function SolicitudesCoordinadorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const sp = await searchParams;
  const filas = await solicitudesCoordinacion(session);

  // Solicitudes de empresa de sus propuestas (solo el coordinador; la administración las ve en Gestión de Empresas)
  let empresa: Awaited<ReturnType<typeof leerSolicitudes>> | null = null;
  if (session.rol === "coordinador") {
    const todas = await leerSolicitudes("empresa");
    const visibles = [];
    for (const s of todas.solicitudes) {
      if (s.tipo !== "carta" && s.propuestaId && (await puedeAtenderPropuesta(session, s.propuestaId))) visibles.push(s);
    }
    empresa = { ...todas, solicitudes: visibles };
  }
  const pendientesEmpresa = empresa?.solicitudes.filter((s) => s.estado === "pendiente") ?? [];
  const resueltasEmpresa = empresa?.solicitudes.filter((s) => s.estado !== "pendiente") ?? [];

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Solicitudes">
        Bajas, cambios de asesor y solicitudes de empresa de las propuestas de tu coordinación. Aprobar una baja anula la propuesta; aprobar un cambio de asesor envía la solicitud al nuevo asesor y, al aceptarla, la propuesta pasa a él con todo su trabajo.
      </EncabezadoCoordinacion>

      <TablaSolicitudesCoordinacion filas={filas} base="/coordinador/solicitudes" sp={sp} rutaPropuesta={(id) => `/coordinador/propuestas/${id}`} />

      {empresa ? (
        <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
            <div>
              <h2 className="font-bold text-card-dark">Solicitudes de empresa</h2>
              <p className="text-xs text-muted">
                Empresas nuevas y actualizaciones de empresas o supervisores pedidas por egresados de tus propuestas. Las de la carta de
                aceptación las valida la administración.
              </p>
            </div>
            <span className={`rounded-lg px-3 py-1 text-xs font-bold ${pendientesEmpresa.length ? "bg-brand-red text-white" : "bg-gray-100 text-gray-600"}`}>
              {pendientesEmpresa.length === 1 ? "1 pendiente" : `${pendientesEmpresa.length} pendientes`}
            </span>
          </header>
          {pendientesEmpresa.length > 0 ? (
            <SolicitudesTable solicitudes={pendientesEmpresa} allEmpresas={empresa.allEmpresas} allSucursales={empresa.allSucursales} allSupervisores={empresa.allSupervisores} />
          ) : (
            <p className="px-5 py-4 text-sm text-muted">No hay solicitudes de empresa pendientes.</p>
          )}
          {resueltasEmpresa.length > 0 && (
            <details className="border-t border-border">
              <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-gray-600 hover:text-brand-red">Resueltas ({resueltasEmpresa.length})</summary>
              <SolicitudesTable solicitudes={resueltasEmpresa} allEmpresas={empresa.allEmpresas} allSucursales={empresa.allSucursales} allSupervisores={empresa.allSupervisores} />
            </details>
          )}
        </section>
      ) : (
        <p className="text-xs text-muted">
          Las solicitudes de empresa se atienden en <Link href="/admin/empresas" className="font-bold text-brand-red hover:underline">Gestión de Empresas</Link>.
        </p>
      )}
    </div>
  );
}
