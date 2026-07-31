import { getMisPropuestasAsesor, getSolicitudesAsesor } from "@/app/actions/asesor";
import AsesorDashboardClient from "./AsesorDashboardClient";

export default async function AsesorPage() {
  const [propuestasRes, solicitudesRes] = await Promise.all([
    getMisPropuestasAsesor(),
    getSolicitudesAsesor(),
  ]);

  const propuestas = propuestasRes.success && propuestasRes.data ? propuestasRes.data : [];
  const solicitudes = solicitudesRes.success && solicitudesRes.data ? solicitudesRes.data : [];

  return (
    <AsesorDashboardClient
      initialPropuestas={propuestas}
      initialSolicitudes={solicitudes}
    />
  );
}
