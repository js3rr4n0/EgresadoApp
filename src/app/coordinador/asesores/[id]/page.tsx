import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { carrerasDeCoordinador, leerDetalleAsesor } from "@/lib/asesoresServidor";
import DetalleAsesorVista from "@/components/asesores/DetalleAsesor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle de asesor | Coordinación" };

export default async function DetalleAsesorCoordinadorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // El administrador de facultad ve sus asesores en su panel (C3)
  if (session?.rol === "decanato") redirect("/admin/asesores");
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await leerDetalleAsesor(id);
  if (!d) notFound();
  if (session.rol === "coordinador") {
    const mias = await carrerasDeCoordinador(session.userId);
    if (mias.length && !d.fila.carreraIds.some((c) => mias.includes(c))) notFound();
  }
  return <DetalleAsesorVista d={d} rutaBase="/coordinador/asesores" gestionar={false} />;
}
