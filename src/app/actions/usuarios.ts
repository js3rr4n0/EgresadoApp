"use server";

import { db } from "@/lib/db";
import { usuarios, carreras, facultades } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getCarreras() {
  try {
    const data = await db
      .select({
        id: carreras.id,
        nombre: carreras.nombre,
        facultadId: carreras.facultadId,
      })
      .from(carreras);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Error al cargar las carreras" };
  }
}

export async function crearUsuario(formData: FormData) {
  try {
    const nombreCompleto = formData.get("nombreCompleto") as string;
    const correo = formData.get("correo") as string;
    const password = formData.get("password") as string;
    const rol = formData.get("rol") as string;
    const carnet = formData.get("carnet") as string | null;
    const carreraId = formData.get("carreraId") ? Number(formData.get("carreraId")) : null;
    const activo = formData.get("activo") === "on";

    if (!nombreCompleto || !correo || !password || !rol) {
      return { success: false, error: "Faltan campos obligatorios" };
    }

    // Determine facultadId if a carrera is selected
    let facultadId: number | null = null;
    if (carreraId) {
      const carrera = await db.select().from(carreras).where(eq(carreras.id, carreraId)).limit(1);
      if (carrera.length > 0) {
        facultadId = carrera[0].facultadId;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(usuarios).values({
      nombreCompleto,
      correo,
      passwordHash,
      rol,
      carnet: rol === "egresado" ? carnet : null,
      carreraId: rol === "egresado" ? carreraId : null,
      facultadId: rol === "egresado" ? facultadId : null,
      activo,
    });

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === '23505') { // Postgres unique violation code
      return { success: false, error: "Ya existe un usuario con este correo" };
    }
    return { success: false, error: "Error al crear el usuario" };
  }
}

export async function getUsuarios() {
  try {
    const data = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        correo: usuarios.correo,
        rol: usuarios.rol,
        carnet: usuarios.carnet,
        activo: usuarios.activo,
        carrera: carreras.nombre,
        facultad: facultades.nombre,
      })
      .from(usuarios)
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .leftJoin(facultades, eq(usuarios.facultadId, facultades.id))
      .orderBy(desc(usuarios.id));

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Error al cargar los usuarios" };
  }
}

export async function toggleUserStatus(userId: number, currentStatus: boolean) {
  try {
    await db
      .update(usuarios)
      .set({ activo: !currentStatus })
      .where(eq(usuarios.id, userId));
    
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar el estado" };
  }
}
