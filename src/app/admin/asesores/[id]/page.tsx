import { notFound, redirect } from "next/navigation";
import { alcanceAdmin } from "@/lib/permisos";
import { leerDetalleAsesor } from "@/lib/asesoresServidor";
import DetalleAsesorVista from "@/components/asesores/DetalleAsesor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle de asesor | Admin" };

export default async function DetalleAsesorAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const alcance = await alcanceAdmin();
  if (!alcance) redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const d = await leerDetalleAsesor(id);
  if (!d) notFound();
  if (!alcance.superadmin && d.fila.facultadId !== alcance.facultadId) notFound();
  return <DetalleAsesorVista d={d} rutaBase="/admin/asesores" gestionar />;
}
