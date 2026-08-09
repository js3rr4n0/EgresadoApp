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

    const { rawSql } = await import("@/lib/db");
    try {
      await rawSql`ALTER TABLE actividades ADD COLUMN IF NOT EXISTS descripcion_anterior text;`;
      await rawSql`ALTER TABLE actividades ADD COLUMN IF NOT EXISTS es_nueva boolean DEFAULT false;`;
      await rawSql`ALTER TABLE actividades ADD COLUMN IF NOT EXISTS es_modificada boolean DEFAULT false;`;
    } catch (e) {
      // Ignored if already exist
    }

    // 1. Update the dates in cartasAceptacion if they changed
    const existingCarta = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
    if (existingCarta.length > 0 && !existingCarta[0].bloqueada) {
      await db.update(cartasAceptacion).set({
        fechaInicio,
        fechaFin
      }).where(eq(cartasAceptacion.propuestaId, propuestaId));
    } else if (existingCarta.length === 0) {
      await db.insert(cartasAceptacion).values({
        propuestaId,
        fechaInicio,
        fechaFin,
        bloqueada: false
      });
    }

    // 2. Fetch existing activities to calculate diffs (modified or newly added)
    const existingActs = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId));
    const hasPriorActs = existingActs.length > 0;

    // 3. Delete old activities
    await db.delete(actividades).where(eq(actividades.propuestaId, propuestaId));

    // 4. Insert new activities with diff flags
    if (actividadesData.length > 0) {
      const toInsert = actividadesData.map(a => {
        const descTrimmed = a.descripcion ? a.descripcion.trim() : "";
        const match = existingActs.find(
          (old) => old.periodo === a.periodo && old.semana === a.semana && old.numero === a.numero
        );

        let descAnt: string | null = null;
        let isMod = false;
        let isNew = false;

        if (match) {
          if (match.descripcion !== descTrimmed) {
            descAnt = match.descripcionAnterior || match.descripcion;
            isMod = true;
          } else {
            descAnt = match.descripcionAnterior || null;
            isMod = match.esModificada || false;
            isNew = match.esNueva || false;
          }
        } else if (hasPriorActs) {
          isNew = true;
        }

        return {
          propuestaId,
          periodo: a.periodo,
          semana: a.semana,
          numero: a.numero,
          titulo: a.titulo ? a.titulo.trim() : null,
          descripcion: descTrimmed,
          descripcionAnterior: descAnt,
          esModificada: isMod,
          esNueva: isNew,
        };
      });

      await db.insert(actividades).values(toInsert);
    }

    revalidatePath("/egresado");
    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error saving actividades:", error);
    return { success: false, error: "Error al guardar las actividades." };
  }
}
