"use server";
// Confirmación de la revisión del documento antes de enviar (R6). Solo el líder, con la propuesta en redacción.

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { propuestas, revisionesPropuesta } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { huellaRevision } from "@/lib/revisionPropuestaServidor";

export async function confirmarRevision(propuestaId: number, confirmar: boolean): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };
  const [prop] = await db.select({ egresadoId: propuestas.egresadoId, estado: propuestas.estado, bloqueada: propuestas.bloqueada }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop || prop.egresadoId !== session.userId) return { success: false, error: "Solo el líder del equipo confirma la revisión." };
  if (prop.estado !== "redactando" || prop.bloqueada) return { success: false, error: "La propuesta no se puede modificar en su estado actual." };

  if (confirmar) {
    const huella = await huellaRevision(propuestaId);
    await db
      .insert(revisionesPropuesta)
      .values({ propuestaId, huella, confirmadaPor: session.userId, confirmadaEn: new Date() })
      .onConflictDoUpdate({ target: revisionesPropuesta.propuestaId, set: { huella, confirmadaPor: session.userId, confirmadaEn: new Date() } });
  } else {
    await db.delete(revisionesPropuesta).where(eq(revisionesPropuesta.propuestaId, propuestaId));
  }
  revalidatePath("/egresado/redactar");
  return { success: true };
}
