"use server";

import { db } from "@/lib/db";
import { facultades, carreras, carrerasSedes } from "@/lib/schema";
import { sedesPorCarrera } from "@/lib/carrerasSedes";
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
        titulo: carreras.titulo,
        facultadId: carreras.facultadId,
        facultadNombre: facultades.nombre,
      })
      .from(carreras)
      .innerJoin(facultades, eq(carreras.facultadId, facultades.id))
      .orderBy(facultades.nombre, carreras.nombre);
    const sedes = sedesPorCarrera(await db.select({ carreraId: carrerasSedes.carreraId, facultadId: carrerasSedes.facultadId }).from(carrerasSedes));
    return { success: true, data: data.map((c) => ({ ...c, sedes: sedes.get(c.id) ?? [] })) };
  } catch (error) {
    return { success: false, error: "Error al cargar carreras" };
  }
}

export async function createCarrera(formData: FormData) {
  try {
    const nombre = formData.get("nombre") as string;
    const codigo = formData.get("codigo") as string;
    const facultadId = Number(formData.get("facultadId"));
    const titulo = (formData.get("titulo") as string | null)?.trim() || null;
    
    if (!nombre || !facultadId) return { success: false, error: "Nombre y Facultad son requeridos" };

    const [nueva] = await db.insert(carreras).values({ nombre, codigo, facultadId, titulo }).returning({ id: carreras.id });
    await guardarSedes(nueva.id, facultadId, formData);
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
    const titulo = (formData.get("titulo") as string | null)?.trim() || null;
    
    if (!nombre || !facultadId) return { success: false, error: "Nombre y Facultad son requeridos" };

    await db.update(carreras).set({ nombre, codigo, facultadId, activo, titulo }).where(eq(carreras.id, id));
    await guardarSedes(id, facultadId, formData);
    revalidatePath("/admin/facultades");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Error al actualizar la carrera" };
  }
}

/** Otras sedes donde se ofrece la carrera (casillas "sedes"); su propia facultad no cuenta como sede. */
async function guardarSedes(carreraId: number, facultadId: number, formData: FormData) {
  const sedes = [...new Set(formData.getAll("sedes").map(Number))].filter((x) => x && x !== facultadId);
  await db.delete(carrerasSedes).where(eq(carrerasSedes.carreraId, carreraId));
  if (sedes.length) await db.insert(carrerasSedes).values(sedes.map((f) => ({ carreraId, facultadId: f })));
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
