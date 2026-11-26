import { getMisPropuestasAsesor, getSolicitudesAsesor } from "@/app/actions/asesor";
import { getResumenSeguimientoAsesor } from "@/app/actions/registrosActividad";
import AsesorDashboardClient from "./AsesorDashboardClient";
import { getBandejaFichasAsesor } from "@/app/actions/bandejaFichas";
import { getSession } from "@/lib/session";
import AvisoValoraciones from "@/components/valoraciones/AvisoValoraciones";

export default async function AsesorPage() {
  const [propuestasRes, solicitudesRes, seguimientoRes, fichas] = await Promise.all([
    getMisPropuestasAsesor(),
    getSolicitudesAsesor(),
    getResumenSeguimientoAsesor(),
    getBandejaFichasAsesor(),
  ]);

  const propuestas = propuestasRes.success && propuestasRes.data ? propuestasRes.data : [];
  const solicitudes = solicitudesRes.success && solicitudesRes.data ? solicitudesRes.data : [];
  const seguimiento = seguimientoRes.success && seguimientoRes.estudiantes ? seguimientoRes.estudiantes : [];
  const bandeja = seguimientoRes.success && seguimientoRes.bandeja ? seguimientoRes.bandeja : [];
  const diasPlazoRevision = seguimientoRes.success && seguimientoRes.diasPlazoRevision ? seguimientoRes.diasPlazoRevision : 3;

  const session = await getSession();

  return (
    <div className="space-y-6">
      {/* Valoraciones pendientes de procesos cerrados (entrega V3) */}
      {session?.rol === "asesor" && <AvisoValoraciones usuarioId={session.userId} rol="asesor" />}
      <AsesorDashboardClient
        initialPropuestas={propuestas}
        initialSolicitudes={solicitudes}
        seguimiento={seguimiento}
        bandeja={bandeja}
        diasPlazoRevision={diasPlazoRevision}
        bandejaFichas={fichas.tienePropuestas ? fichas.entradas : null}
      />
    </div>
  );
}
