import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PreferenciasNotificacionesVista from "@/components/PreferenciasNotificacionesVista";

export default async function PreferenciasNotificacionesAsesorPage() {
  const session = await getSession();
  if (!session || session.rol !== "asesor") redirect("/login");
  return <PreferenciasNotificacionesVista />;
}
