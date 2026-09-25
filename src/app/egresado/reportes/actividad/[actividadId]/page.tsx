import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRegistroActividadDetalle } from "@/app/actions/registrosActividad";
import RegistroActividadClient from "./RegistroActividadClient";

export default async function RegistroActividadPage({
  params,
}: {
  params: Promise<{ actividadId: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const { actividadId } = await params;
  const id = Number(actividadId);
  if (!Number.isFinite(id)) notFound();

  const res = await getRegistroActividadDetalle(id);
  if (!res.success || !res.actividad) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar la actividad."}
      </div>
    );
  }

  if (res.rol !== "egresado") {
    redirect("/login");
  }

  return <RegistroActividadClient data={res as any} />;
}
