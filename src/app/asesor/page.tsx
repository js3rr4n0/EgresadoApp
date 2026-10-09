import { getMisPropuestasAsesor, getSolicitudesAsesor } from "@/app/actions/asesor";
import { getResumenSeguimientoAsesor } from "@/app/actions/registrosActividad";
import AsesorDashboardClient from "./AsesorDashboardClient";

export default async function AsesorPage() {
  const [propuestasRes, solicitudesRes, seguimientoRes] = await Promise.all([
    getMisPropuestasAsesor(),
    getSolicitudesAsesor(),
    getResumenSeguimientoAsesor(),
  ]);

  const propuestas = propuestasRes.success && propuestasRes.data ? propuestasRes.data : [];
  const solicitudes = solicitudesRes.success && solicitudesRes.data ? solicitudesRes.data : [];
  const seguimiento = seguimientoRes.success && seguimientoRes.estudiantes ? seguimientoRes.estudiantes : [];
  const bandeja = seguimientoRes.success && seguimientoRes.bandeja ? seguimientoRes.bandeja : [];
  const diasPlazoRevision = seguimientoRes.success && seguimientoRes.diasPlazoRevision ? seguimientoRes.diasPlazoRevision : 3;

  return (
    <AsesorDashboardClient
      initialPropuestas={propuestas}
      initialSolicitudes={solicitudes}
      seguimiento={seguimiento}
      bandeja={bandeja}
      diasPlazoRevision={diasPlazoRevision}
    />
  );
}
