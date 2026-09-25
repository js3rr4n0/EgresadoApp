import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getRegistroActividadRevision } from "@/app/actions/registrosActividad";
import RevisionActividadClient from "./RevisionActividadClient";

export default async function RevisionActividadPage({
  params,
}: {
  params: Promise<{ propuestaId: string; actividadId: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { propuestaId, actividadId } = await params;
  const id = Number(actividadId);
  if (!Number.isFinite(id)) notFound();

  const res = await getRegistroActividadRevision(id);
  if (!res.success || !res.actividad) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar la actividad."}
      </div>
    );
  }

  return <RevisionActividadClient data={res as any} propuestaId={propuestaId} />;
}
