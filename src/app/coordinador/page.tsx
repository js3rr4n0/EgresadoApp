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

  const pendientes = pendientesRes?.success && Array.isArray(pendientesRes.data) ? pendientesRes.data : [];
  const asignadas = asignadasRes?.success && Array.isArray(asignadasRes.data) ? asignadasRes.data : [];
  const asesores = asesoresRes?.success && Array.isArray(asesoresRes.data) ? asesoresRes.data : [];
  const solicitudesBaja = bajasRes?.success && Array.isArray(bajasRes.data) ? bajasRes.data : [];

  return (
    <CoordinadorDashboardClient
      pendientes={pendientes}
      asignadas={asignadas}
      asesores={asesores}
      solicitudesBaja={solicitudesBaja}
      isAdmin={session.rol === "admin"}
      usuario={{
        id: session.userId,
        nombreCompleto: session.nombreCompleto,
        correo: session.correo,
        rol: session.rol,
      }}
    />
  );
}
