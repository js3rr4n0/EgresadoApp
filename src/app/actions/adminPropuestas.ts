"use server";

import { db } from "@/lib/db";
import { propuestas, historialEstados } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function reviewPropuesta(
  propuestaId: number,
  estado: string,
  asesorId: number | null,
  observaciones: string
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };

    const estadoAnterior = propuesta.estado;

    await db.update(propuestas)
      .set({
        estado,
        asesorId,
        observaciones: observaciones || null
      })
      .where(eq(propuestas.id, propuestaId));

    if (estadoAnterior !== estado) {
      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: estado,
        usuarioId: session.userId,
      });
    }

    revalidatePath(`/admin/propuestas/${propuestaId}`);
    revalidatePath("/admin/propuestas");

    return { success: true };
  } catch (error: any) {
    console.error("Error al revisar propuesta:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}
