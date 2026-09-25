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

  return (
    <AsesorDashboardClient
      initialPropuestas={propuestas}
      initialSolicitudes={solicitudes}
      seguimiento={seguimiento}
    />
  );
}
