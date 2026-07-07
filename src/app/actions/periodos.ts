"use server";

import { db } from "@/lib/db";
import { periodos } from "@/lib/schema";
import { eq } from "drizzle-orm";
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
    await db.update(periodos)
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
    await db.update(periodos)
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
    await db.delete(periodos).where(eq(periodos.id, id));
    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    // Podría fallar por llaves foráneas en propuestas
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar porque ya existen propuestas de egresados vinculadas a este ciclo." };
    }
    return { success: false, error: error.message };
  }
}
