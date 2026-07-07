"use server";

import { db } from "@/lib/db";
import { empresas, supervisores } from "@/lib/schema";
import { eq, desc, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type SupervisorData = {
  id?: number;
  titulo?: string;
  especialidad?: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
};

export type EmpresaData = {
  nombre: string;
  area?: string;
  descripcion?: string;
  antecedentes?: string;
  direccion?: string;
  organigramaUrl?: string;
  mapaUrl?: string;
  supervisores: SupervisorData[];
};

export async function getEmpresas() {
  try {
    const data = await db.select().from(empresas).orderBy(desc(empresas.id));
    // Fetch all supervisors to group them on the client, or group here
    const sups = await db.select().from(supervisores);
    
    const nestedData = data.map(emp => ({
      ...emp,
      supervisores: sups.filter(s => s.empresaId === emp.id)
    }));

    return { success: true, data: nestedData };
  } catch (error) {
    return { success: false, error: "Error al cargar las empresas" };
  }
}

export async function createEmpresa(data: EmpresaData) {
  try {
    const { supervisores: sups, ...empresaFields } = data;
    
    // 1. Insert Empresa
    const [nuevaEmpresa] = await db.insert(empresas).values({
      ...empresaFields,
      verificada: true,
      habilitada: true,
    }).returning({ id: empresas.id });

    // 2. Insert Supervisores
    if (sups && sups.length > 0) {
      const supsToInsert = sups.map(s => ({
        ...s,
        empresaId: nuevaEmpresa.id,
      }));
      await db.insert(supervisores).values(supsToInsert);
    }

    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmpresa(id: number, data: EmpresaData) {
  try {
    const { supervisores: sups, ...empresaFields } = data;

    // 1. Update Empresa
    await db.update(empresas).set({
      ...empresaFields,
      actualizadaEn: new Date(),
    }).where(eq(empresas.id, id));

    // 2. Upsert Supervisores
    if (sups && sups.length > 0) {
      const keepIds = sups.filter(s => s.id).map(s => s.id as number);
      
      // Safe approach: Fetch existing
      const existingSups = await db.select({ id: supervisores.id }).from(supervisores).where(eq(supervisores.empresaId, id));
      const existingIds = existingSups.map(s => s.id);
      
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
      if (toDelete.length > 0) {
        for (const delId of toDelete) {
          await db.delete(supervisores).where(eq(supervisores.id, delId));
        }
      }

      // Update or Insert
      for (const s of sups) {
        if (s.id) {
          await db.update(supervisores).set({ ...s, actualizadoEn: new Date() }).where(eq(supervisores.id, s.id));
        } else {
          await db.insert(supervisores).values({ ...s, empresaId: id });
        }
      }
    } else {
      // If no supervisors, delete all (if safe)
      await db.delete(supervisores).where(eq(supervisores.empresaId, id));
    }

    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar un supervisor porque ya está asignado a un Tema de Grado (Propuesta)." };
    }
    return { success: false, error: error.message };
  }
}

export async function toggleEmpresaStatus(id: number, currentStatus: boolean) {
  try {
    await db.update(empresas).set({ habilitada: !currentStatus }).where(eq(empresas.id, id));
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar el estado" };
  }
}

export async function deleteEmpresa(id: number) {
  try {
    await db.delete(empresas).where(eq(empresas.id, id));
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar la empresa porque ya tiene registros académicos vinculados a ella." };
    }
    return { success: false, error: error.message };
  }
}
