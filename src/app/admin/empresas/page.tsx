import { alcanceAdmin } from "@/lib/permisos";
import { redirect } from "next/navigation";
import EmpresasManager, { type NotasEmpresa } from "@/components/EmpresasManager";
import { valoracionesDeEmpresas } from "@/lib/valoracionesServidor";
import { getEmpresas } from "@/app/actions/empresas";
import { leerProcesosEmpresas } from "@/lib/procesosEmpresas";
import { calcularEstadisticas, type EstadisticasEmpresa, type ProcesoEmpresa } from "@/lib/estadisticasEmpresas";
import { isoDia } from "@/lib/seguimientoCohortes";
import { leerReportesVigentes } from "@/lib/bitacoraEmpresaServidor";
import { leerSolicitudes } from "@/lib/solicitudesServidor";
import SolicitudesTable from "@/components/solicitudes/SolicitudesTable";

export const metadata = {
  title: "Gestión de Empresas | Admin",
};

export const dynamic = "force-dynamic";

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  // Administrador de facultad (C3): ve el catálogo en solo lectura
  const alcance = await alcanceAdmin();
  if (!alcance) redirect("/login");

  const [{ success, data, error }, procesos, reportes, valoracionesEmp, { editar }] = await Promise.all([
    getEmpresas(),
    leerProcesosEmpresas(),
    leerReportesVigentes(),
    valoracionesDeEmpresas(),
    searchParams,
  ]);
  const notas: Record<number, NotasEmpresa> = {};
  for (const [id, v] of Object.entries(valoracionesEmp)) {
    notas[Number(id)] = { egresados: v.egresados.promedio, asesores: v.asesores.promedio, general: v.general };
  }

  if (!success) {
    return (
      <div className="w-full text-center py-20 text-red-500 font-bold">
        {error}
      </div>
    );
  }

  const porEmpresa = new Map<number, ProcesoEmpresa[]>();
  procesos.forEach((p) => porEmpresa.set(p.empresaId, [...(porEmpresa.get(p.empresaId) ?? []), p]));
  const hoy = isoDia(new Date());
  const estadisticas: Record<number, EstadisticasEmpresa> = {};
  porEmpresa.forEach((lista, id) => (estadisticas[id] = calcularEstadisticas(lista, hoy)));

  const editarId = editar ? Number(editar) : null;
  // Solicitudes de empresa: lo primero que ve el superadministrador (ajustes del 26-nov-2026)
  const solicitudes = alcance.superadmin ? await leerSolicitudes("empresa") : null;
  const pendientes = solicitudes?.solicitudes.filter((x) => x.estado === "pendiente") ?? [];
  const resueltas = solicitudes?.solicitudes.filter((x) => x.estado !== "pendiente") ?? [];

  // Va debajo del título «Gestión de Empresas» y antes de la tabla
  const bloqueSolicitudes = solicitudes ? (
        <section id="solicitudes" className={`rounded-xl border shadow-sm overflow-hidden bg-white ${pendientes.length ? "border-brand-red/40" : "border-border"}`}>
          <header className={`px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${pendientes.length ? "bg-brand-red text-white" : "bg-gray-50 border-b border-border"}`}>
            <div>
              <h2 className={`text-lg font-bold ${pendientes.length ? "" : "text-card-dark"}`}>Solicitudes de empresas</h2>
              <p className={`text-sm ${pendientes.length ? "text-white/85" : "text-muted"}`}>
                Empresas nuevas y actualizaciones de datos de empresas o supervisores enviadas por los egresados.
              </p>
            </div>
            <span className={`self-start md:self-auto px-3 py-1 rounded-lg text-sm font-bold ${pendientes.length ? "bg-white text-brand-red" : "bg-gray-200 text-gray-600"}`}>
              {pendientes.length === 1 ? "1 pendiente" : `${pendientes.length} pendientes`}
            </span>
          </header>
          {pendientes.length > 0 ? (
            <SolicitudesTable solicitudes={pendientes} allEmpresas={solicitudes.allEmpresas} allSucursales={solicitudes.allSucursales} allSupervisores={solicitudes.allSupervisores} />
          ) : (
            <p className="px-5 py-4 text-sm text-muted">No hay solicitudes pendientes.</p>
          )}
          {resueltas.length > 0 && (
            <details className="border-t border-border">
              <summary className="px-5 py-3 text-sm font-bold text-gray-600 cursor-pointer hover:text-brand-red">Historial de solicitudes resueltas ({resueltas.length})</summary>
              <SolicitudesTable solicitudes={resueltas} allEmpresas={solicitudes.allEmpresas} allSucursales={solicitudes.allSucursales} allSupervisores={solicitudes.allSupervisores} />
            </details>
          )}
        </section>
  ) : null;

  return (
    <div className="w-full">
      <EmpresasManager initialEmpresas={data || []} estadisticas={estadisticas} reportes={reportes} notas={notas} editarId={alcance.superadmin && Number.isFinite(editarId) ? editarId : null} soloLectura={!alcance.superadmin} alInicio={bloqueSolicitudes} />
    </div>
  );
}
