"use server";
// A5: el superadministrador elimina una propuesta con justificación. Queda un registro (propuestas_eliminadas) y se
// avisa al equipo. Todo lo relacionado se borra en cascada.

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { empresas, integrantesProyecto, notificaciones, propuestas, propuestasEliminadas, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { puedeEliminarEnEstado, revisarEliminacion } from "@/lib/eliminarPropuesta";

export async function eliminarPropuestaConJustificacion(
  propuestaId: number,
  justificacion: string,
  confirmacion: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  // Solo el superadministrador elimina propuestas (C3)
  if (!session || session.rol !== "admin") return { success: false, error: "Solo el superadministrador puede eliminar propuestas." };
  const texto = String(justificacion ?? "").trim().slice(0, 3000);
  const problemas = revisarEliminacion(texto, String(confirmacion ?? ""));
  if (problemas.length) return { success: false, error: problemas.join(" ") };

  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return { success: false, error: "La propuesta no existe." };
  if (!puedeEliminarEnEstado(prop.estado)) {
    return { success: false, error: "La propuesta ya está en ejecución: no se elimina. Corresponde gestionar una baja." };
  }

  // Quiénes la redactaban (para el registro y el aviso)
  const [lider] = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet }).from(usuarios).where(eq(usuarios.id, prop.egresadoId));
  const miembros = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(usuarios.id, integrantesProyecto.egresadoId))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  const integrantes = [
    ...(lider ? [{ ...lider, lider: true }] : []),
    ...miembros.filter((m) => m.id !== prop.egresadoId).map((m) => ({ ...m, lider: false })),
  ];
  const [emp] = prop.empresaId ? await db.select({ nombre: empresas.nombre }).from(empresas).where(eq(empresas.id, prop.empresaId)) : [];

  await db.insert(propuestasEliminadas).values({
    propuestaId,
    numero: prop.numero,
    titulo: prop.titulo,
    tipo: prop.tipo,
    estado: prop.estado,
    integrantes,
    empresa: emp?.nombre ?? null,
    justificacion: texto,
    eliminadaPor: session.userId,
  });
  await db.delete(propuestas).where(eq(propuestas.id, propuestaId));
  if (integrantes.length) {
    await db.insert(notificaciones).values(
      integrantes.map((i) => ({
        usuarioId: i.id,
        tipo: "propuesta_eliminada",
        mensaje: `La administración eliminó la propuesta #${prop.numero}${prop.titulo ? ` («${prop.titulo}»)` : ""}. Motivo: «${texto.replace(/[.\s]+$/, "")}».`,
      })),
    );
  }

  revalidatePath("/admin/propuestas");
  revalidatePath("/admin", "layout");
  revalidatePath("/egresado");
  return { success: true };
}
