"use server";

import { db } from "@/lib/db";
import { usuarios, carreras, carrerasSedes, facultades, bitacoraUsuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { alcanceAdmin, usuarioEnAlcance, type Alcance } from "@/lib/permisos";

/**
 * Administrador de facultad (C3, respuesta 3): crea y edita coordinadores y asesores de su facultad. El
 * superadministrador puede todo. Devuelve el alcance o un error.
 */
async function permitirGestion(rol: string | null, objetivoId?: number): Promise<{ alcance: Alcance } | { error: string }> {
  const alcance = await alcanceAdmin();
  if (!alcance) return { error: "No autorizado" };
  if (alcance.superadmin) return { alcance };
  if (rol !== null && !["coordinador", "asesor"].includes(rol)) return { error: "Solo puedes gestionar coordinadores y asesores de tu facultad." };
  if (objetivoId !== undefined) {
    const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, objetivoId));
    if (!u || !["coordinador", "asesor"].includes(u.rol) || !(await usuarioEnAlcance(alcance, objetivoId))) {
      return { error: "Ese usuario no es de tu facultad o no puedes gestionarlo." };
    }
  }
  return { alcance };
}
import { sedesPorCarrera } from "@/lib/carrerasSedes";
import { and, eq, desc, inArray } from "drizzle-orm";
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
      .from(carreras)
      .where(eq(carreras.activo, true))
      .orderBy(carreras.nombre);
    // Las sedes donde también se ofrece cada carrera (Ilobasco), para filtrarlas por facultad sin duplicarlas.
    const sedes = sedesPorCarrera(await db.select({ carreraId: carrerasSedes.carreraId, facultadId: carrerasSedes.facultadId }).from(carrerasSedes));
    return { success: true, data: data.map((c) => ({ ...c, sedes: sedes.get(c.id) ?? [] })) };
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
    const cohorte = formData.get("cohorte") as string | null;
    const cohortesAsignadasRaw = formData.get("cohortesAsignadas") as string | null;
    const carrerasAsignadasRaw = formData.get("carrerasAsignadas") as string | null;
    const carreraId = formData.get("carreraId") ? Number(formData.get("carreraId")) : null;
    let facultadId = formData.get("facultadId") ? Number(formData.get("facultadId")) : null;
    const activo = formData.get("activo") === "on";

    if (!nombreCompleto || !correo || !password || !rol) {
      return { success: false, error: "Faltan campos obligatorios" };
    }
    const permiso = await permitirGestion(rol);
    if ("error" in permiso) return { success: false, error: permiso.error };
    if (!permiso.alcance.superadmin) facultadId = permiso.alcance.facultadId;

    // Determine facultadId if a carrera is selected and facultadId not explicitly set
    if (!facultadId && carreraId) {
      const carrera = await db.select().from(carreras).where(eq(carreras.id, carreraId)).limit(1);
      if (carrera.length > 0) {
        facultadId = carrera[0].facultadId;
      }
    }

    let carrerasAsignadasParsed = null;
    if (carrerasAsignadasRaw) {
      try {
        carrerasAsignadasParsed = JSON.parse(carrerasAsignadasRaw);
      } catch (e) {}
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(usuarios).values({
      nombreCompleto,
      correo,
      passwordHash,
      rol,
      carnet: rol === "egresado" ? carnet : null,
      cohorte: rol === "egresado" ? cohorte : null,
      carreraId: (rol === "egresado" || rol === "coordinador" || rol === "asesor") ? carreraId : null,
      facultadId: (rol === "egresado" || rol === "coordinador" || rol === "asesor" || rol === "decanato") ? facultadId : null,
      cohortesAsignadas: (rol === "asesor" || rol === "decanato" || rol === "coordinador") && cohortesAsignadasRaw ? JSON.parse(cohortesAsignadasRaw) : null,
      carrerasAsignadas: (rol === "coordinador" || rol === "asesor" || rol === "decanato") ? carrerasAsignadasParsed : null,
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
    const alcance = await alcanceAdmin();
    if (!alcance) return { success: false, error: "No autorizado" };
    const data = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        correo: usuarios.correo,
        rol: usuarios.rol,
        carnet: usuarios.carnet,
        cohorte: usuarios.cohorte,
        cohortesAsignadas: usuarios.cohortesAsignadas,
        carrerasAsignadas: usuarios.carrerasAsignadas,
        activo: usuarios.activo,
        carrera: carreras.nombre,
        facultad: facultades.nombre,
        facultadId: usuarios.facultadId,
        carreraId: usuarios.carreraId,
      })
      .from(usuarios)
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .leftJoin(facultades, eq(usuarios.facultadId, facultades.id))
      // Administrador de facultad: los usuarios de su facultad, sin administradores
      .where(alcance.superadmin ? undefined : and(eq(usuarios.facultadId, alcance.facultadId!), inArray(usuarios.rol, ["coordinador", "asesor", "egresado"])))
      .orderBy(desc(usuarios.id));

    const allCarreras = await db.select().from(carreras);
    const carrerasMap = new Map(allCarreras.map((c) => [c.id, c.nombre]));

    const result = data.map((u) => {
      let carrerasAsignadasNombres: string[] = [];
      if (Array.isArray(u.carrerasAsignadas)) {
        carrerasAsignadasNombres = (u.carrerasAsignadas as number[])
          .map((id) => carrerasMap.get(id))
          .filter((name): name is string => Boolean(name));
      }
      return {
        ...u,
        carrerasAsignadasNombres,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, error: "Error al cargar los usuarios" };
  }
}

export async function toggleUserStatus(userId: number, newStatus: boolean) {
  try {
    const permiso = await permitirGestion(null, userId);
    if ("error" in permiso) return { success: false, error: permiso.error };
    await db
      .update(usuarios)
      .set({ activo: newStatus })
      .where(eq(usuarios.id, userId));

    // Entrega V5: el cambio de estado de un asesor queda en su bitácora aunque se haga desde Usuarios (aquí sin motivo).
    const [u] = await db.select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, userId));
    if (u?.rol === "asesor") {
      const session = await getSession();
      await db.insert(bitacoraUsuarios).values({
        usuarioId: userId,
        adminId: session?.userId ?? null,
        tipo: "estado",
        detalle: { activo: newStatus, motivo: "Cambio hecho desde Gestión de usuarios, sin motivo registrado.", origen: "usuarios" },
      });
      revalidatePath("/admin/asesores");
    }

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar el estado" };
  }
}

export async function getUsuario(id: number) {
  try {
    const data = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);

    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: "Error al cargar el usuario" };
  }
}

export async function updateUsuario(id: number, formData: FormData) {
  try {
    const nombreCompleto = formData.get("nombreCompleto") as string;
    const correo = formData.get("correo") as string;
    const rol = formData.get("rol") as string;
    const carnet = formData.get("carnet") as string | null;
    const cohorte = formData.get("cohorte") as string | null;
    const cohortesAsignadasRaw = formData.get("cohortesAsignadas") as string | null;
    const carrerasAsignadasRaw = formData.get("carrerasAsignadas") as string | null;
    const carreraId = formData.get("carreraId") ? Number(formData.get("carreraId")) : null;
    let facultadId = formData.get("facultadId") ? Number(formData.get("facultadId")) : null;
    const activo = formData.get("activo") === "on";

    if (!nombreCompleto || !correo || !rol) {
      return { success: false, error: "Faltan campos obligatorios" };
    }
    const permiso = await permitirGestion(rol, id);
    if ("error" in permiso) return { success: false, error: permiso.error };
    if (!permiso.alcance.superadmin) facultadId = permiso.alcance.facultadId;

    if (!facultadId && carreraId) {
      const carrera = await db.select().from(carreras).where(eq(carreras.id, carreraId)).limit(1);
      if (carrera.length > 0) {
        facultadId = carrera[0].facultadId;
      }
    }

    let carrerasAsignadasParsed = null;
    if (carrerasAsignadasRaw) {
      try {
        carrerasAsignadasParsed = JSON.parse(carrerasAsignadasRaw);
      } catch (e) {}
    }

    await db.update(usuarios).set({
      nombreCompleto,
      correo,
      rol,
      carnet: rol === "egresado" ? carnet : null,
      cohorte: rol === "egresado" ? cohorte : null,
      carreraId: (rol === "egresado" || rol === "coordinador" || rol === "asesor") ? carreraId : null,
      facultadId: (rol === "egresado" || rol === "coordinador" || rol === "asesor" || rol === "decanato") ? facultadId : null,
      cohortesAsignadas: (rol === "asesor" || rol === "decanato" || rol === "coordinador") && cohortesAsignadasRaw ? JSON.parse(cohortesAsignadasRaw) : null,
      carrerasAsignadas: (rol === "coordinador" || rol === "asesor" || rol === "decanato") ? carrerasAsignadasParsed : null,
      activo,
    }).where(eq(usuarios.id, id));

    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.code === '23505') { 
      return { success: false, error: "Ya existe un usuario con este correo" };
    }
    return { success: false, error: "Error al actualizar el usuario" };
  }
}

export async function eliminarUsuario(userId: number) {
  try {
    // Solo el superadministrador elimina usuarios (C3)
    const alcance = await alcanceAdmin();
    if (!alcance?.superadmin) return { success: false, error: "Solo el superadministrador puede eliminar usuarios." };
    await db.delete(usuarios).where(eq(usuarios.id, userId));
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    // 23503 is postgres foreign key violation code
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar el usuario porque tiene registros dependientes (ej. propuestas). Se recomienda desactivarlo en su lugar." };
    }
    return { success: false, error: "Error al eliminar el usuario" };
  }
}
