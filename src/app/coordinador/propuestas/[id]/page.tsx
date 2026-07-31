import { getDetallePropuestaCoordinador } from "@/app/actions/coordinador";
import { redirect } from "next/navigation";
import CoordinadorProgresoClient from "./CoordinadorProgresoClient";

export default async function CoordinadorPropuestaProgresoPage({
  params,
}: {
  params: { id: string };
}) {
  const pId = parseInt(params.id);
  if (isNaN(pId)) redirect("/coordinador");

  const res = await getDetallePropuestaCoordinador(pId);
  if (!res.success || !res.data) {
    redirect("/coordinador");
  }

  return <CoordinadorProgresoClient data={res.data as any} />;
}
