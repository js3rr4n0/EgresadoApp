import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PreferenciasNotificacionesVista from "@/components/PreferenciasNotificacionesVista";

export default async function PreferenciasNotificacionesEgresadoPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") redirect("/login");
  return <PreferenciasNotificacionesVista />;
}
