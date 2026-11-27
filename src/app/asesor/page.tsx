import { getSolicitudesAsesor } from "@/app/actions/asesor";
import { getResumenSeguimientoAsesor } from "@/app/actions/registrosActividad";
import AsesorDashboardClient from "./AsesorDashboardClient";
import { getBandejaFichasAsesor } from "@/app/actions/bandejaFichas";
import { getSession } from "@/lib/session";
import AvisoValoraciones from "@/components/valoraciones/AvisoValoraciones";
import { procesosAsesor } from "@/lib/procesosAsesorServidor";
import type { PestanaAsesor } from "./ProcesosAsesor";

export const dynamic = "force-dynamic";

export default async function AsesorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  const [solicitudesRes, seguimientoRes, fichas, procesos, sp] = await Promise.all([
    getSolicitudesAsesor(),
    getResumenSeguimientoAsesor(),
    getBandejaFichasAsesor(),
    session?.rol === "asesor" ? procesosAsesor(session.userId) : Promise.resolve([]),
    searchParams,
  ]);

  const solicitudes = solicitudesRes.success && solicitudesRes.data ? solicitudesRes.data : [];
  const seguimiento = seguimientoRes.success && seguimientoRes.estudiantes ? seguimientoRes.estudiantes : [];
  const bandeja = seguimientoRes.success && seguimientoRes.bandeja ? seguimientoRes.bandeja : [];
  const diasPlazoRevision = seguimientoRes.success && seguimientoRes.diasPlazoRevision ? seguimientoRes.diasPlazoRevision : 3;
  const bandejaFichas = fichas.tienePropuestas ? fichas.entradas : null;

  // S2 (specs/DASHBOARD_ASESOR.md): la pestaña pedida; si no, la que tenga pendientes («Antes de la ejecución» primero,
  // porque tiene plazo); si ninguna, la que tenga procesos.
  const pedida = Array.isArray(sp.etapa) ? sp.etapa[0] : sp.etapa;
  const antes = procesos.filter((p) => p.pestana === "propuesta");
  const pendEjecucion = (bandejaFichas?.length ?? 0) + bandeja.length;
  const etapa: PestanaAsesor =
    pedida === "propuesta" || pedida === "ejecucion"
      ? pedida
      : antes.some((p) => p.pendientesAsesor > 0)
        ? "propuesta"
        : pendEjecucion > 0
          ? "ejecucion"
          : antes.length
            ? "propuesta"
            : "ejecucion";

  return (
    <div className="space-y-6">
      <AsesorDashboardClient
        avisos={session?.rol === "asesor" ? <AvisoValoraciones usuarioId={session.userId} rol="asesor" /> : null}
        procesos={procesos}
        etapa={etapa}
        initialSolicitudes={solicitudes}
        seguimiento={seguimiento}
        bandeja={bandeja}
        diasPlazoRevision={diasPlazoRevision}
        bandejaFichas={bandejaFichas}
      />
    </div>
  );
}
