"use server";
// «Firmas verificadas» de la carta (A4): la marca la administración que revisa la propuesta (o el coordinador a cargo).
// Es solo un registro: no bloquea la asignación (respuesta 6).

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { propuestas, verificacionesFirmas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { alcanceAdmin, puedeVerPropuesta } from "@/lib/permisos";
import { huellaFirmas } from "@/lib/verificacionFirmasServidor";

export async function marcarFirmasVerificadas(propuestaId: number, verificadas: boolean): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const [prop] = await db.select({ coordinadorId: propuestas.coordinadorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return { success: false, error: "La propuesta no existe." };
  if (prop.coordinadorId !== session.userId) {
    const alcance = await alcanceAdmin();
    if (!alcance || !(await puedeVerPropuesta(alcance, propuestaId))) return { success: false, error: "No tienes permiso sobre esta propuesta." };
  }

  if (verificadas) {
    const huella = await huellaFirmas(propuestaId);
    if (!huella) return { success: false, error: "La propuesta no tiene carta de aceptación." };
    await db
      .insert(verificacionesFirmas)
      .values({ propuestaId, huella, verificadaPor: session.userId, verificadaEn: new Date() })
      .onConflictDoUpdate({ target: verificacionesFirmas.propuestaId, set: { huella, verificadaPor: session.userId, verificadaEn: new Date() } });
  } else {
    await db.delete(verificacionesFirmas).where(eq(verificacionesFirmas.propuestaId, propuestaId));
  }
  revalidatePath(`/admin/propuestas/${propuestaId}`);
  return { success: true };
}
