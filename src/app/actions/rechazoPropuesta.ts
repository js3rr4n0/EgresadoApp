"use server";
// Rechazo por requisitos (A2): la administración antes de asignar, o el coordinador antes de que un asesor acepte.
// La propuesta pasa a «rechazada», se cancela la asignación en curso y se avisa a todo el equipo con el motivo.

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { historialEstados, integrantesProyecto, propuestas, rechazosPropuesta, solicitudesAsesor, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { alcanceAdmin, puedeAsignarPropuesta } from "@/lib/permisos";
import { notificarEquipo } from "@/lib/notificarEquipo";
import { puedeRechazarEnEstado, revisarRechazo, textoMotivo, type EntradaRechazo, type FuncionRechazo } from "@/lib/rechazoPropuesta";

export async function rechazarPropuestaRequisitos(propuestaId: number, entrada: EntradaRechazo): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return { success: false, error: "La propuesta no existe." };

  // Quién rechaza: el coordinador a cargo, o la administración con permiso de asignar esa propuesta
  let funcion: FuncionRechazo;
  if (prop.coordinadorId != null && prop.coordinadorId === session.userId) {
    funcion = "coordinador";
  } else {
    const alcance = await alcanceAdmin();
    if (!alcance || !(await puedeAsignarPropuesta(alcance, propuestaId))) return { success: false, error: "No tienes permiso para rechazar esta propuesta." };
    funcion = "administracion";
  }
  if (!puedeRechazarEnEstado(funcion, prop)) {
    return {
      success: false,
      error: funcion === "administracion"
        ? "La administración solo rechaza propuestas pendientes de asignación. Una vez asignada, la revisa el coordinador o el asesor."
        : "Solo puedes rechazar mientras la propuesta espera la asignación de asesor.",
    };
  }

  // Integrantes (para los motivos de documentos)
  const miembros = await db
    .select({ id: integrantesProyecto.egresadoId, nombre: usuarios.nombreCompleto })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(usuarios.id, integrantesProyecto.egresadoId))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  const [lider] = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.egresadoId));
  const gente = [...(lider ? [lider] : []), ...miembros.filter((m) => m.id !== prop.egresadoId)];
  const nombres = Object.fromEntries(gente.map((g) => [g.id, g.nombre]));

  const e: EntradaRechazo = {
    motivos: (Array.isArray(entrada?.motivos) ? entrada.motivos : []).slice(0, 30).map((m) => ({
      clave: String(m?.clave ?? ""),
      ...(m?.integranteId != null ? { integranteId: Number(m.integranteId) } : {}),
    })),
    mensaje: String(entrada?.mensaje ?? "").trim().slice(0, 3000),
  };
  const problemas = revisarRechazo(e, gente.map((g) => g.id));
  if (problemas.length) return { success: false, error: problemas.join(" ") };

  await db.insert(rechazosPropuesta).values({
    propuestaId,
    motivos: e.motivos,
    mensaje: e.mensaje,
    rechazadoPor: session.userId,
    funcion,
    estadoAnterior: prop.estado,
  });
  // Se cancela la asignación en curso: el coordinador y las solicitudes de asesoría que nadie respondió
  await db.delete(solicitudesAsesor).where(and(eq(solicitudesAsesor.propuestaId, propuestaId), eq(solicitudesAsesor.estado, "pendiente")));
  await db.update(propuestas).set({ estado: "rechazada", coordinadorId: null, asesorId: null, bloqueada: false }).where(eq(propuestas.id, propuestaId));
  await db.insert(historialEstados).values({ propuestaId, de: prop.estado, a: "rechazada", usuarioId: session.userId });

  const quien = funcion === "coordinador" ? "el coordinador" : "la administración";
  const lista = e.motivos.map((m) => textoMotivo(m, nombres)).join("; ");
  await notificarEquipo(
    propuestaId,
    "propuesta_rechazada",
    `Tu propuesta #${prop.numero} fue rechazada por ${quien} porque no cumple los requisitos previos (${lista}). Mensaje: "${e.mensaje}". Puedes modificarla y enviarla de nuevo.`,
  );

  revalidatePath("/admin/propuestas");
  revalidatePath(`/admin/propuestas/${propuestaId}`);
  revalidatePath("/coordinador");
  revalidatePath("/egresado");
  revalidatePath("/admin", "layout");
  return { success: true };
}

/** Líder de una propuesta rechazada (A3). */
async function propuestaRechazadaDelLider(propuestaId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { error: "No autorizado" } as const;
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop || prop.egresadoId !== session.userId) return { error: "Solo el líder del equipo puede hacerlo." } as const;
  if (prop.estado !== "rechazada") return { error: "La propuesta no está rechazada." } as const;
  return { session, prop } as const;
}

/**
 * A3: el líder reabre la propuesta rechazada para corregirla. Vuelve a redacción con todos sus datos; la revisión del
 * documento (R6) y las ratificaciones se piden de nuevo. Al reenviarla empieza otra vez desde la asignación.
 */
export async function modificarPropuestaRechazada(propuestaId: number): Promise<{ success: boolean; error?: string }> {
  const r = await propuestaRechazadaDelLider(propuestaId);
  if ("error" in r) return { success: false, error: r.error };
  const { revisionesPropuesta, ratificacionesPropuesta } = await import("@/lib/schema");
  await db.update(propuestas).set({ estado: "redactando", enviadaEn: null, bloqueada: false }).where(eq(propuestas.id, propuestaId));
  await db.delete(revisionesPropuesta).where(eq(revisionesPropuesta.propuestaId, propuestaId)).catch(() => undefined);
  await db.delete(ratificacionesPropuesta).where(eq(ratificacionesPropuesta.propuestaId, propuestaId));
  await db.insert(historialEstados).values({ propuestaId, de: "rechazada", a: "redactando", usuarioId: r.session.userId });
  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

/** A3: el líder elimina la propuesta rechazada (con todos sus datos). Se avisa al resto del equipo. */
export async function eliminarPropuestaRechazada(propuestaId: number): Promise<{ success: boolean; error?: string }> {
  const r = await propuestaRechazadaDelLider(propuestaId);
  if ("error" in r) return { success: false, error: r.error };
  const { notificaciones } = await import("@/lib/schema");
  const { destinatariosPropuesta } = await import("@/lib/notificarEquipo");
  const otros = (await destinatariosPropuesta(propuestaId)).filter((id) => id !== r.session.userId);
  // Las tablas relacionadas se borran en cascada
  await db.delete(propuestas).where(eq(propuestas.id, propuestaId));
  if (otros.length) {
    await db.insert(notificaciones).values(
      otros.map((usuarioId) => ({ usuarioId, tipo: "propuesta_eliminada", mensaje: `El líder eliminó la propuesta #${r.prop.numero} después de que fue rechazada por requisitos.` })),
    );
  }
  revalidatePath("/egresado");
  return { success: true };
}
