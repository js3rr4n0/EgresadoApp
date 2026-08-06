import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  getPropuestasPendientesCoordinador,
  getPropuestasAsignadasCoordinador,
  getAsesoresFacultad,
  getSolicitudesBajaCoordinador,
} from "@/app/actions/coordinador";
import CoordinadorDashboardClient from "@/components/coordinador/CoordinadorDashboardClient";

export default async function CoordinadorPage() {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
    redirect("/login");
  }

  const [pendientesRes, asignadasRes, asesoresRes, bajasRes] = await Promise.all([
    getPropuestasPendientesCoordinador(),
    getPropuestasAsignadasCoordinador(),
    getAsesoresFacultad(),
    getSolicitudesBajaCoordinador(),
  ]);

  const pendientes = pendientesRes.success ? pendientesRes.data || [] : [];
  const asignadas = asignadasRes.success ? asignadasRes.data || [] : [];
  const asesores = asesoresRes.success ? asesoresRes.data || [] : [];
  const solicitudesBaja = bajasRes.success ? bajasRes.data || [] : [];

  return (
    <CoordinadorDashboardClient
      pendientes={pendientes}
      asignadas={asignadas}
      asesores={asesores}
      solicitudesBaja={solicitudesBaja}
      isAdmin={session.rol === "admin"}
    />
  );
}
