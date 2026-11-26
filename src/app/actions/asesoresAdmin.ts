"use server";

// Entrega V5 (specs/VALORACIONES_EMPRESAS_ASESORES.md): habilitar o deshabilitar un asesor con motivo obligatorio,
// que queda en bitacora_usuarios con la fecha y el administrador.

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { alcanceAdmin, usuarioEnAlcance } from "@/lib/permisos";
import { bitacoraUsuarios, usuarios } from "@/lib/schema";
import { MINIMO_MOTIVO } from "@/lib/bitacoraEmpresa";

type Resultado = { success: true } | { success: false; error: string };

export async function cambiarEstadoAsesor(asesorId: number, activar: boolean, motivo: string): Promise<Resultado> {
  try {
    // Superadministrador o administrador de facultad con asesores de su facultad (C3)
    const alcance = await alcanceAdmin();
    if (!alcance || !(await usuarioEnAlcance(alcance, asesorId))) return { success: false, error: "No autorizado." };
    const s = alcance.session;

    const texto = (motivo ?? "").trim();
    if (texto.length < MINIMO_MOTIVO) {
      return { success: false, error: `Escribe el motivo de la decisión (al menos ${MINIMO_MOTIVO} caracteres).` };
    }

    const [asesor] = await db
      .select({ activo: usuarios.activo })
      .from(usuarios)
      .where(and(eq(usuarios.id, asesorId), eq(usuarios.rol, "asesor")));
    if (!asesor) return { success: false, error: "El asesor no existe." };
    if (asesor.activo === activar) return { success: false, error: activar ? "El asesor ya está habilitado." : "El asesor ya está deshabilitado." };

    await db.update(usuarios).set({ activo: activar }).where(eq(usuarios.id, asesorId));
    await db.insert(bitacoraUsuarios).values({
      usuarioId: asesorId,
      adminId: s.userId,
      tipo: "estado",
      detalle: { activo: activar, motivo: texto, origen: "asesores" },
    });

    revalidatePath("/admin/asesores");
    revalidatePath(`/admin/asesores/${asesorId}`);
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (e) {
    console.error("Error al cambiar el estado del asesor:", e);
    return { success: false, error: "No se pudo actualizar el estado del asesor." };
  }
}
