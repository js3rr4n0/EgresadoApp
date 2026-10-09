import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { actividades } from "@/lib/schema";

/** La revisión es por semana: el enlace de una actividad abre su semana, posicionado en esa actividad. */
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

  const [actividad] = await db
    .select({ periodo: actividades.periodo, semana: actividades.semana, propuestaId: actividades.propuestaId })
    .from(actividades)
    .where(eq(actividades.id, id))
    .limit(1);
  if (!actividad || String(actividad.propuestaId) !== propuestaId) notFound();

  redirect(`/asesor/seguimiento/${propuestaId}/semana/${actividad.periodo}/${actividad.semana}?actividad=${id}`);
}
