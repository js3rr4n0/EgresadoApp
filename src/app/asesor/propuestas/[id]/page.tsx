import { getDetallePropuestaAsesor } from "@/app/actions/asesor";
import { redirect } from "next/navigation";
import PropuestaProgresoClient from "./PropuestaProgresoClient";

export default async function AsesorPropuestaProgresoPage({
  params,
}: {
  params: { id: string };
}) {
  const pId = parseInt(params.id);
  if (isNaN(pId)) redirect("/asesor");

  const res = await getDetallePropuestaAsesor(pId);
  if (!res.success || !res.data) {
    redirect("/asesor");
  }

  return <PropuestaProgresoClient data={res.data as any} />;
}
