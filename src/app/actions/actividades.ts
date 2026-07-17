"use server";

import { db } from "@/lib/db";
import { actividades, cartasAceptacion } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getActividades(propuestaId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return [];

  const results = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId));
  return results;
}

export async function saveActividades(propuestaId: number, actividadesData: any[], fechaInicio: string, fechaFin: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    // 1. Update the dates in cartasAceptacion if they changed
    const existingCarta = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
    if (existingCarta.length > 0 && !existingCarta[0].bloqueada) {
      await db.update(cartasAceptacion).set({
        fechaInicio,
        fechaFin
      }).where(eq(cartasAceptacion.propuestaId, propuestaId));
    } else if (existingCarta.length === 0) {
      // If for some reason carta wasn't created yet, create a placeholder
      await db.insert(cartasAceptacion).values({
        propuestaId,
        fechaInicio,
        fechaFin,
        bloqueada: false
      });
    }

    // 2. Delete all existing activities for this proposal (full replace strategy)
    await db.delete(actividades).where(eq(actividades.propuestaId, propuestaId));

    // 3. Insert new activities
    if (actividadesData.length > 0) {
      const toInsert = actividadesData.map(a => ({
        propuestaId,
        periodo: a.periodo,
        semana: a.semana,
        numero: a.numero,
        descripcion: a.descripcion
      }));
      await db.insert(actividades).values(toInsert);
    }

    revalidatePath("/egresado");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving actividades:", error);
    return { success: false, error: "Error al guardar las actividades." };
  }
}
