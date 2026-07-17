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

export async function enviarPropuesta(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    await db.update(propuestas)
      .set({ estado: "enviada", enviadaEn: new Date() })
      .where(eq(propuestas.id, propuestaId));

    revalidatePath("/egresado");
    return { success: true };
  } catch (error: any) {
    console.error("Error al enviar propuesta:", error);
    return { success: false, error: "Error al enviar la propuesta." };
  }
}
