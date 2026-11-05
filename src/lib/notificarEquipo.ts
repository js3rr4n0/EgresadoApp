import { db } from "@/lib/db";
import { integrantesProyecto, notificaciones, propuestas } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

/** Dueño (líder) de la propuesta más sus integrantes aceptados. En pasantía es solo el dueño. */
export async function destinatariosPropuesta(propuestaId: number): Promise<number[]> {
  const [prop] = await db.select({ egresadoId: propuestas.egresadoId }).from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) return [];
  const integrantes = await db
    .select({ egresadoId: integrantesProyecto.egresadoId })
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  return [...new Set([prop.egresadoId, ...integrantes.map((i) => i.egresadoId)])];
}

/**
 * Envía la misma notificación a todo el equipo de la propuesta (H3: antes solo la recibía el líder).
 */
export async function notificarEquipo(propuestaId: number, tipo: string, mensaje: string) {
  const ids = await destinatariosPropuesta(propuestaId);
  if (ids.length === 0) return;
  await db.insert(notificaciones).values(ids.map((usuarioId) => ({ usuarioId, tipo, mensaje, leida: false, creadoEn: new Date() })));
}
