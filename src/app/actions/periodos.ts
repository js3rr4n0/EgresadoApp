"use server";

import { db } from "@/lib/db";
import { periodos } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPeriodos() {
  try {
    const data = await db
      .select()
      .from(periodos)
      .orderBy(desc(periodos.id));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al cargar los periodos" };
  }
}

export async function crearPeriodo(formData: FormData) {
  try {
    const inicioRecepcion = formData.get("inicioRecepcion") as string;
    const finRecepcion = formData.get("finRecepcion") as string;
    const fechaPrimerInforme = formData.get("fechaPrimerInforme") as string;
    const fechaInformeFinal = formData.get("fechaInformeFinal") as string;

    if (!inicioRecepcion || !finRecepcion || !fechaPrimerInforme || !fechaInformeFinal) {
      return { success: false, error: "Faltan fechas obligatorias" };
    }

    // Desactivar todos los periodos anteriores
    await db.update(periodos).set({ activo: false });

    // Crear el nuevo periodo
    await db.insert(periodos).values({
      inicioRecepcion,
      finRecepcion,
      fechaPrimerInforme,
      fechaInformeFinal,
      activo: true, // El nuevo siempre es el activo
    });

    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating periodo:", error);
    return { success: false, error: "Error al crear el periodo" };
  }
}

export async function activarPeriodo(id: number) {
  try {
    // Desactivar todos
    await db.update(periodos).set({ activo: false });
    // Activar el seleccionado
    await db.update(periodos).set({ activo: true }).where(eq(periodos.id, id));
    
    revalidatePath("/admin/periodos");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al cambiar el periodo activo" };
  }
}
