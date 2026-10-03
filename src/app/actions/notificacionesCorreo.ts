"use server";

import { db } from "@/lib/db";
import { configNotificacionesCorreo, preferenciasNotificacionCorreo } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { esConfigurable, leerRolNotificacion, type RolNotificacion } from "@/lib/notificacionesCorreo";

/** Configuración de las notificaciones por correo de un rol (solo administrador). */
export async function getConfiguracionCorreo(rol: RolNotificacion) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false as const, error: "No autorizado" };

    const notificaciones = await db
      .select()
      .from(configNotificacionesCorreo)
      .where(eq(configNotificacionesCorreo.rol, leerRolNotificacion(rol)))
      .orderBy(asc(configNotificacionesCorreo.orden));
    return { success: true as const, notificaciones };
  } catch (err: any) {
    console.error("Error en getConfiguracionCorreo:", err);
    return { success: false as const, error: err.message || "Error al obtener la configuración" };
  }
}

export async function guardarConfiguracionCorreo(
  rol: RolNotificacion,
  cambios: { id: number; correoHabilitado: boolean; obligatoria: boolean }[]
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

    const rolValido = leerRolNotificacion(rol);
    const ahora = new Date();
    for (const c of cambios) {
      await db
        .update(configNotificacionesCorreo)
        .set({ correoHabilitado: !!c.correoHabilitado, obligatoria: !!c.obligatoria, actualizadoEn: ahora })
        .where(and(eq(configNotificacionesCorreo.id, c.id), eq(configNotificacionesCorreo.rol, rolValido)));
    }

    revalidatePath("/admin/notificaciones-correo");
    return { success: true };
  } catch (err: any) {
    console.error("Error en guardarConfiguracionCorreo:", err);
    return { success: false, error: err.message || "Error al guardar la configuración" };
  }
}

/** Preferencias de correo del usuario en sesión, con lo que el administrador configuró para su rol. */
export async function getMisPreferenciasCorreo() {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false as const, error: "No autenticado" };
    const rol = leerRolNotificacion(session.rol);

    const configuraciones = await db
      .select()
      .from(configNotificacionesCorreo)
      .where(eq(configNotificacionesCorreo.rol, rol))
      .orderBy(asc(configNotificacionesCorreo.orden));
    const preferencias = configuraciones.length
      ? await db
          .select()
          .from(preferenciasNotificacionCorreo)
          .where(
            and(
              eq(preferenciasNotificacionCorreo.usuarioId, session.userId),
              inArray(
                preferenciasNotificacionCorreo.configId,
                configuraciones.map((c) => c.id)
              )
            )
          )
      : [];
    const preferenciaPorConfig = new Map(preferencias.map((p) => [p.configId, p.recibirCorreo]));

    return {
      success: true as const,
      notificaciones: configuraciones.map((c) => {
        const preferencia = preferenciaPorConfig.get(c.id);
        return {
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion,
          correoHabilitado: c.correoHabilitado,
          obligatoria: c.obligatoria,
          recibirCorreo: c.obligatoria ? true : (preferencia ?? true),
        };
      }),
    };
  } catch (err: any) {
    console.error("Error en getMisPreferenciasCorreo:", err);
    return { success: false as const, error: err.message || "Error al obtener las preferencias" };
  }
}

/** Guarda las preferencias del usuario; las notificaciones obligatorias o con el correo deshabilitado no se modifican. */
export async function guardarMisPreferenciasCorreo(cambios: { configId: number; recibirCorreo: boolean }[]) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false, error: "No autenticado" };
    const rol = leerRolNotificacion(session.rol);

    const configuraciones = await db
      .select()
      .from(configNotificacionesCorreo)
      .where(eq(configNotificacionesCorreo.rol, rol));
    const configPorId = new Map(configuraciones.map((c) => [c.id, c]));

    for (const c of cambios) {
      const config = configPorId.get(c.configId);
      if (!config || !esConfigurable(config)) continue;
      await db
        .insert(preferenciasNotificacionCorreo)
        .values({ usuarioId: session.userId, configId: c.configId, recibirCorreo: !!c.recibirCorreo })
        .onConflictDoUpdate({
          target: [preferenciasNotificacionCorreo.usuarioId, preferenciasNotificacionCorreo.configId],
          set: { recibirCorreo: !!c.recibirCorreo, actualizadoEn: new Date() },
        });
    }

    revalidatePath("/egresado/notificaciones");
    revalidatePath("/asesor/notificaciones");
    return { success: true };
  } catch (err: any) {
    console.error("Error en guardarMisPreferenciasCorreo:", err);
    return { success: false, error: err.message || "Error al guardar las preferencias" };
  }
}
