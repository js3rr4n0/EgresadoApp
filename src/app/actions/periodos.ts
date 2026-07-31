"use server";

import { db } from "@/lib/db";
import { periodos, usuarios, propuestas } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type PeriodoData = {
  nombre: string;
  inicioRecepcion: string;
  finRecepcion: string;
  maxAprobacionPropuesta: string;
  maxInicioProceso: string;
  maxPrimerInforme: string;
  maxSegundoInforme: string;
  maxTercerInforme: string;
  maxCuartoInforme: string;
  visitaAsesorInicio: string;
  visitaAsesorFin: string;
  maxInformeFinal: string;
  maxAprobacionFinal: string;
};

export async function createPeriodo(data: PeriodoData) {
  try {
    await db.insert(periodos).values({
      ...data,
      activo: true,
    });
    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating periodo:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePeriodo(id: number, data: PeriodoData) {
  try {
    await db
      .update(periodos)
      .set({
        ...data,
      })
      .where(eq(periodos.id, id));

    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating periodo:", error);
    return { success: false, error: error.message };
  }
}

export async function togglePeriodoActivo(id: number, current: boolean) {
  try {
    await db
      .update(periodos)
      .set({ activo: !current })
      .where(eq(periodos.id, id));
    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePeriodo(id: number) {
  try {
    const [periodo] = await db.select().from(periodos).where(eq(periodos.id, id)).limit(1);
    if (!periodo) {
      return { success: false, error: "El ciclo académico no existe." };
    }

    // 1. Validar usuarios activos en la cohorte
    const activeUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(usuarios)
      .where(and(eq(usuarios.cohorte, periodo.nombre), eq(usuarios.activo, true)));

    const countActive = Number(activeUsers[0]?.count || 0);

    // Revisar usuarios con cohortesAsignadas
    const allUsers = await db.select().from(usuarios).where(eq(usuarios.activo, true));
    const activeInCohortesAsignadas = allUsers.filter((u) => {
      if (u.cohorte === periodo.nombre) return true;
      if (Array.isArray(u.cohortesAsignadas)) {
        return (u.cohortesAsignadas as any[]).some(
          (c) => c.cohorte === periodo.nombre && c.activa !== false
        );
      }
      return false;
    }).length;

    const totalActive = Math.max(countActive, activeInCohortesAsignadas);

    if (totalActive > 0) {
      return {
        success: false,
        error: `No se puede eliminar la cohorte "${periodo.nombre}" porque existen ${totalActive} usuario(s) activo(s) asignados a ella.`,
      };
    }

    // 2. Validar si existen propuestas en este periodo
    const propRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(propuestas)
      .where(eq(propuestas.periodoId, id));

    const propCount = Number(propRes[0]?.count || 0);
    if (propCount > 0) {
      return {
        success: false,
        error: `No se puede eliminar el ciclo "${periodo.nombre}" porque existen ${propCount} propuesta(s) de egresados vinculadas a este ciclo.`,
      };
    }

    await db.delete(periodos).where(eq(periodos.id, id));
    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    if (error.code === "23503") {
      return {
        success: false,
        error: "No se puede eliminar porque existen registros vinculados a este ciclo.",
      };
    }
    return { success: false, error: error.message };
  }
}
