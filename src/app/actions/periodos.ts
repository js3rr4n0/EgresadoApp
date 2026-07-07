"use server";

import { db } from "@/lib/db";
import { periodos } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type PeriodoData = {
  nombre: string;
  inicioRecepcion: string; // YYYY-MM-DD
  finRecepcion: string;
};

// Utilidad para sumar días a una fecha
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

function calculateDates(finRecepcion: string) {
  const maxAprobacionPropuesta = addDays(finRecepcion, 21); // 3 semanas
  const maxInicioProceso = maxAprobacionPropuesta; // 3 semanas exactas
  const maxPrimerInforme = addDays(maxInicioProceso, 30);
  const maxSegundoInforme = addDays(maxInicioProceso, 60);
  const maxTercerInforme = addDays(maxInicioProceso, 90);
  const maxCuartoInforme = addDays(maxInicioProceso, 120);
  const visitaAsesorInicio = addDays(maxInicioProceso, 90);
  const visitaAsesorFin = addDays(maxInicioProceso, 100);
  const maxInformeFinal = addDays(maxInicioProceso, 150);
  const maxAprobacionFinal = addDays(maxInformeFinal, 15);

  return {
    maxAprobacionPropuesta,
    maxInicioProceso,
    maxPrimerInforme,
    maxSegundoInforme,
    maxTercerInforme,
    maxCuartoInforme,
    visitaAsesorInicio,
    visitaAsesorFin,
    maxInformeFinal,
    maxAprobacionFinal,
  };
}

export async function createPeriodo(data: PeriodoData) {
  try {
    const dates = calculateDates(data.finRecepcion);

    await db.insert(periodos).values({
      nombre: data.nombre,
      inicioRecepcion: data.inicioRecepcion,
      finRecepcion: data.finRecepcion,
      ...dates,
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
    const dates = calculateDates(data.finRecepcion);

    await db.update(periodos)
      .set({
        nombre: data.nombre,
        inicioRecepcion: data.inicioRecepcion,
        finRecepcion: data.finRecepcion,
        ...dates,
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
