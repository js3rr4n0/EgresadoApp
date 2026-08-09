import { getDetallePropuestaAsesor } from "@/app/actions/asesor";
import { getOrCreateInformePrimerContacto } from "@/app/actions/informes";
import { redirect } from "next/navigation";
import PropuestaProgresoClient from "./PropuestaProgresoClient";

export default async function AsesorPropuestaProgresoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const pId = parseInt(p.id, 10);
  if (isNaN(pId)) redirect("/asesor");

  const res = await getDetallePropuestaAsesor(pId);
  if (!res.success || !res.data) {
    redirect("/asesor");
  }

  const informeRes = await getOrCreateInformePrimerContacto(pId);
  const informeData = informeRes.success ? informeRes.informe : null;

  return (
    <PropuestaProgresoClient
      data={res.data as any}
      informeData={informeData}
    />
  );
}
