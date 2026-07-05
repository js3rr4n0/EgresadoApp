"use server";

import { db } from "@/lib/db";
import { facultades, carreras } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// --- Facultades ---

export async function getFacultades() {
  try {
    const data = await db.select().from(facultades).orderBy(facultades.nombre);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al cargar facultades" };
  }
}

export async function createFacultad(formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const codigo = formData.get("codigo") as string;
    if (!nombre) return { success: false, error: "El nombre es requerido" };

    await db.insert(facultades).values({ nombre, codigo });
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al crear la facultad" };
  }
}

export async function deleteFacultad(id: number) {
  try {
    // Check if it has carreras
    const carrerasCount = await db.select({ count: count() }).from(carreras).where(eq(carreras.facultadId, id));
    if (carrerasCount[0].count > 0) {
      return { success: false, error: "No se puede eliminar una facultad que tiene carreras asignadas." };
    }

    await db.delete(facultades).where(eq(facultades.id, id));
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al eliminar la facultad" };
  }
}

export async function updateFacultad(id: number, formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const codigo = formData.get("codigo") as string;
    const activo = formData.get("activo") === "on";
    if (!nombre) return { success: false, error: "El nombre es requerido" };

    await db.update(facultades).set({ nombre, codigo, activo }).where(eq(facultades.id, id));
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar la facultad" };
  }
}

// --- Carreras ---

export async function getCarreras() {
  try {
    const data = await db
      .select({
        id: carreras.id,
        nombre: carreras.nombre,
        codigo: carreras.codigo,
        activo: carreras.activo,
        facultadId: carreras.facultadId,
        facultadNombre: facultades.nombre,
      })
      .from(carreras)
      .innerJoin(facultades, eq(carreras.facultadId, facultades.id))
      .orderBy(carreras.nombre);
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al cargar carreras" };
  }
}

export async function createCarrera(formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const codigo = formData.get("codigo") as string;
    const facultadId = Number(formData.get("facultadId"));
    
    if (!nombre || !facultadId) return { success: false, error: "Nombre y Facultad son requeridos" };

    await db.insert(carreras).values({ nombre, codigo, facultadId });
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al crear la carrera" };
  }
}

export async function updateCarrera(id: number, formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const codigo = formData.get("codigo") as string;
    const facultadId = Number(formData.get("facultadId"));
    const activo = formData.get("activo") === "on";
    
    if (!nombre || !facultadId) return { success: false, error: "Nombre y Facultad son requeridos" };

    await db.update(carreras).set({ nombre, codigo, facultadId, activo }).where(eq(carreras.id, id));
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar la carrera" };
  }
}

export async function deleteCarrera(id: number) {
  try {
    await db.delete(carreras).where(eq(carreras.id, id));
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error: any) {
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar la carrera porque tiene usuarios o registros dependientes." };
    }
    return { success: false, error: "Error al eliminar la carrera" };
  }
}
