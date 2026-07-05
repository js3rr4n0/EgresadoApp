"use server";

import { db } from "@/lib/db";
import { empresas } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getEmpresas() {
  try {
    const data = await db
      .select()
      .from(empresas)
      .orderBy(desc(empresas.id));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al cargar las empresas" };
  }
}

export async function toggleEmpresaStatus(id: number, currentStatus: boolean) {
  try {
    await db
      .update(empresas)
      .set({ habilitada: !currentStatus })
      .where(eq(empresas.id, id));
    
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar el estado de la empresa" };
  }
}
