"use server";

import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveJustificacion(propuestaId: number, justificacion: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    await db.update(propuestas)
      .set({ justificacionProceso: justificacion })
      .where(eq(propuestas.id, propuestaId));

    revalidatePath("/egresado");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving justificacion:", error);
    return { success: false, error: "Error al guardar la justificación." };
  }
}

// El envío de la propuesta está en actions/propuestas.ts (enviarPropuesta): verifica dueño, estado,
// documentos y, en trabajos en equipo, la ratificación de todos los integrantes.
