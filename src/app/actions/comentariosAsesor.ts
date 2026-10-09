"use server";

import { db } from "@/lib/db";
import { informesMensuales, propuestas, notasSeguimientoAsesor } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  CATEGORIAS_COMENTARIO,
  validarComentariosCompletos,
  leerNotaSemanal,
  resumenNotaSemanal,
  type ComentariosDecanato,
  type NotaSemanal,
} from "@/lib/comentariosAsesor";
import { registrarEvento } from "@/lib/bitacora";


async function propuestaDelAsesor(propuestaId: number) {
  const session = await getSession();
  if (!session || !session.userId || session.rol !== "asesor") return { error: "No autorizado" as const };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop || prop.asesorId !== session.userId) return { error: "No tiene permisos sobre esta propuesta." as const };
  return { session, prop };
}

/** Guarda (como borrador o completos) los comentarios del asesor para el decanato de un informe aún no aprobado. */
export async function guardarComentariosInforme(informeId: number, datos: ComentariosDecanato) {
  try {
    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const ctx = await propuestaDelAsesor(informe.propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    if (informe.estado === "aprobado") {
      return { success: false, error: "El informe ya fue aprobado; sus comentarios no pueden modificarse." };
    }

    const limpio: ComentariosDecanato = {
      respuestas: Object.fromEntries(CATEGORIAS_COMENTARIO.map((c) => [c.id, (datos.respuestas?.[c.id] || "").trim()])),
      general: (datos.general || "").trim(),
    };
    await db
      .update(informesMensuales)
      .set({ comentariosDecanato: limpio, comentariosDecanatoEn: new Date(), actualizadoEn: new Date() })
      .where(eq(informesMensuales.id, informeId));

    await registrarEvento({
      propuestaId: informe.propuestaId,
      actorId: ctx.session.userId,
      actorRol: "asesor",
      tipo: "comentarios_asesor",
      descripcion: `Registró sus comentarios para el decanato del Informe #${informe.numero} (${
        validarComentariosCompletos(limpio).length === 0 ? "completos" : "en borrador"
      }).`,
      referencia: `informe:${informeId}`,
      agruparMinutos: 60,
    });

    revalidatePath(`/asesor/seguimiento/${informe.propuestaId}/informe/${informeId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar comentarios del asesor:", err);
    return { success: false, error: err.message || "Error al guardar los comentarios" };
  }
}

/** Notas de seguimiento semanal del asesor: el asesor asignado, el coordinador o el administrador. */
export async function getNotasSeguimiento(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false, error: "No autenticado" };
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    const autorizado =
      !!prop &&
      ((session.rol === "asesor" && prop.asesorId === session.userId) || session.rol === "coordinador" || session.rol === "admin");
    if (!autorizado) return { success: false, error: "No tiene permisos sobre esta propuesta." };

    const notas = await db
      .select()
      .from(notasSeguimientoAsesor)
      .where(eq(notasSeguimientoAsesor.propuestaId, propuestaId))
      .orderBy(asc(notasSeguimientoAsesor.periodo), asc(notasSeguimientoAsesor.semana));
    return { success: true, notas };
  } catch (err: any) {
    console.error("Error en getNotasSeguimiento:", err);
    return { success: false, error: err.message || "Error al obtener las notas" };
  }
}

/**
 * Registra o actualiza la nota opcional de una semana, con las mismas preguntas de los comentarios del período (todas
 * opcionales). Las notas se acumulan en los comentarios del informe mensual. Una nota vacía se elimina.
 */
export async function guardarNotaSeguimiento(
  propuestaId: number,
  periodo: number,
  semana: number,
  datos: Omit<NotaSemanal, "semana">
) {
  try {
    const ctx = await propuestaDelAsesor(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    if (!Number.isInteger(periodo) || !Number.isInteger(semana) || periodo < 1 || semana < 1) {
      return { success: false, error: "Semana no válida." };
    }

    const nota = leerNotaSemanal(semana, { ...datos.respuestas, general: datos.general }, null);
    const texto = resumenNotaSemanal(nota);
    const respuestas = { ...nota.respuestas, ...(nota.general ? { general: nota.general } : {}) };
    const condicion = and(
      eq(notasSeguimientoAsesor.propuestaId, propuestaId),
      eq(notasSeguimientoAsesor.periodo, periodo),
      eq(notasSeguimientoAsesor.semana, semana)
    );

    if (!texto) {
      await db.delete(notasSeguimientoAsesor).where(condicion);
    } else {
      await db
        .insert(notasSeguimientoAsesor)
        .values({ propuestaId, periodo, semana, nota: texto, respuestas, asesorId: ctx.session.userId })
        .onConflictDoUpdate({
          target: [notasSeguimientoAsesor.propuestaId, notasSeguimientoAsesor.periodo, notasSeguimientoAsesor.semana],
          set: { nota: texto, respuestas, asesorId: ctx.session.userId, actualizadoEn: new Date() },
        });
    }

    if (texto) {
      await registrarEvento({
        propuestaId,
        actorId: ctx.session.userId,
        actorRol: "asesor",
        tipo: "nota_seguimiento",
        descripcion: `Registró una nota de seguimiento de la Semana ${semana} del Período ${periodo}.`,
        detalle: texto,
        referencia: `nota:${periodo}.${semana}`,
        agruparMinutos: 60,
      });
    }

    revalidatePath(`/asesor/seguimiento/${propuestaId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar nota de seguimiento:", err);
    return { success: false, error: err.message || "Error al guardar la nota" };
  }
}
