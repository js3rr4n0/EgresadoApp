"use server";
// D8 (specs/COORDINADOR_ASIGNACION.md): cambio de asesor. Lo pide el egresado líder o el asesor actual; lo atiende el
// coordinador o la administración: rechaza con respuesta, o aprueba eligiendo el nuevo asesor (mismas reglas que al
// asignar: configuración de la cohorte y cupo). El nuevo asesor recibe una solicitud de asesoría; al aceptarla, la
// propuesta pasa a él con todo su trabajo. Mientras tanto sigue con el asesor actual (respuesta 2).

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { notificaciones, propuestas, solicitudesAsesor, solicitudesCambioAsesor, usuarios } from "@/lib/schema";
import { CAMBIO_ABIERTO, ESTADOS_CAMBIO_PERMITIDO, MIN_RESPUESTA_CAMBIO, revisarMotivo } from "@/lib/cambioAsesor";
import { puedeAtenderCambio } from "@/lib/cambioAsesorServidor";
import { opcionesAsesor, reglaDePropuesta } from "@/lib/asignacionServidor";

type Resultado = { success: true; message?: string } | { success: false; error: string };

function refrescar(propuestaId: number) {
  for (const r of ["/coordinador/solicitudes", "/admin/solicitudes", "/egresado", "/asesor", `/asesor/propuestas/${propuestaId}`, `/coordinador/propuestas/${propuestaId}`]) revalidatePath(r);
  revalidatePath("/coordinador", "layout");
  revalidatePath("/admin", "layout");
}

export async function solicitarCambioAsesor(propuestaId: number, motivo: string): Promise<Resultado> {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "egresado" && session.rol !== "asesor")) return { success: false, error: "No autorizado" };
    const error = revisarMotivo(motivo);
    if (error) return { success: false, error };

    const [p] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
    if (!p) return { success: false, error: "Propuesta no encontrada." };
    if (!p.asesorId) return { success: false, error: "La propuesta todavía no tiene asesor." };
    if (!ESTADOS_CAMBIO_PERMITIDO.includes(p.estado)) return { success: false, error: "En el estado actual de la propuesta no se puede pedir un cambio de asesor." };
    if (session.rol === "egresado" && p.egresadoId !== session.userId) return { success: false, error: "Solo el líder del equipo puede pedir el cambio de asesor." };
    if (session.rol === "asesor" && p.asesorId !== session.userId) return { success: false, error: "Solo el asesor de la propuesta puede pedir el cambio." };

    const abiertas = await db
      .select({ id: solicitudesCambioAsesor.id })
      .from(solicitudesCambioAsesor)
      .where(and(eq(solicitudesCambioAsesor.propuestaId, propuestaId), inArray(solicitudesCambioAsesor.estado, CAMBIO_ABIERTO)));
    if (abiertas.length) return { success: false, error: "Ya hay una solicitud de cambio de asesor en curso para esta propuesta." };

    await db.insert(solicitudesCambioAsesor).values({
      propuestaId,
      solicitanteId: session.userId,
      rolSolicitante: session.rol,
      asesorActualId: p.asesorId,
      motivo: motivo.trim(),
    });
    // Avisar al coordinador (si la propuesta lo tiene) y a la otra parte
    const avisar = [p.coordinadorId, session.rol === "egresado" ? p.asesorId : p.egresadoId].filter((x): x is number => x != null);
    if (avisar.length) {
      await db.insert(notificaciones).values(
        avisar.map((usuarioId) => ({
          usuarioId,
          tipo: "cambio_asesor",
          mensaje: `${session.nombreCompleto} pidió cambio de asesor para la propuesta «${p.titulo || `#${p.numero}`}». Motivo: "${motivo.trim()}"`,
        })),
      );
    }
    refrescar(propuestaId);
    return { success: true, message: "Solicitud enviada. La atenderá la coordinación o la administración." };
  } catch (e) {
    console.error("solicitarCambioAsesor:", e);
    return { success: false, error: "No se pudo enviar la solicitud." };
  }
}

async function leerParaAtender(id: number) {
  const session = await getSession();
  if (!session) return { error: "No autorizado" } as const;
  const [c] = await db.select().from(solicitudesCambioAsesor).where(eq(solicitudesCambioAsesor.id, id));
  if (!c) return { error: "La solicitud no existe." } as const;
  if (!(await puedeAtenderCambio(session, c.propuestaId))) return { error: "No autorizado" } as const;
  return { session, c } as const;
}

export async function rechazarCambioAsesor(id: number, respuesta: string): Promise<Resultado> {
  try {
    const r = await leerParaAtender(id);
    if ("error" in r) return { success: false, error: r.error! };
    if (r.c.estado !== "pendiente") return { success: false, error: "La solicitud ya fue atendida." };
    if (respuesta.trim().length < MIN_RESPUESTA_CAMBIO) return { success: false, error: `Escribe la respuesta (al menos ${MIN_RESPUESTA_CAMBIO} caracteres).` };
    await db
      .update(solicitudesCambioAsesor)
      .set({ estado: "rechazada", respuesta: respuesta.trim(), resueltoPor: r.session.userId, resueltoEn: new Date() })
      .where(eq(solicitudesCambioAsesor.id, id));
    await db.insert(notificaciones).values({
      usuarioId: r.c.solicitanteId,
      tipo: "cambio_asesor",
      mensaje: `Tu solicitud de cambio de asesor fue rechazada. Respuesta: "${respuesta.trim()}"`,
    });
    refrescar(r.c.propuestaId);
    return { success: true, message: "Solicitud rechazada." };
  } catch (e) {
    console.error("rechazarCambioAsesor:", e);
    return { success: false, error: "No se pudo rechazar la solicitud." };
  }
}

export interface OpcionCambio {
  id: number;
  nombreCompleto: string;
  correo: string;
  deLaCarrera: boolean;
  carga: number;
  cupo: number;
  lleno: boolean;
  prioritario: string | null;
}

/** Asesores que pueden tomar la propuesta (sin el actual), con su carga y cupo (D5). */
export async function opcionesCambioAsesor(id: number): Promise<{ success: true; data: OpcionCambio[] } | { success: false; error: string }> {
  const r = await leerParaAtender(id);
  if ("error" in r) return { success: false, error: r.error! };
  const regla = await reglaDePropuesta(r.c.propuestaId);
  if (!regla) return { success: false, error: "Propuesta no encontrada." };
  const { motivoPrioridad } = await import("@/lib/prioridadAsesor");
  const opciones = (await opcionesAsesor(regla)).filter((a) => a.id !== r.c.asesorActualId);
  return {
    success: true,
    data: opciones.map((a) => ({
      id: a.id,
      nombreCompleto: a.nombre,
      correo: a.correo,
      deLaCarrera: a.deLaCarrera,
      carga: a.activos + a.pendientes,
      cupo: a.cupo,
      lleno: a.lleno,
      prioritario: motivoPrioridad(a.prioridad),
    })),
  };
}

export async function aprobarCambioAsesor(id: number, nuevoAsesorId: number, respuesta: string): Promise<Resultado> {
  try {
    const r = await leerParaAtender(id);
    if ("error" in r) return { success: false, error: r.error! };
    const { session, c } = r;
    if (!["pendiente", "por_reasignar"].includes(c.estado)) return { success: false, error: "La solicitud no espera la elección de un asesor." };
    if (nuevoAsesorId === c.asesorActualId) return { success: false, error: "Elige un asesor distinto al actual." };

    const regla = await reglaDePropuesta(c.propuestaId);
    const opcion = regla ? (await opcionesAsesor(regla)).find((a) => a.id === nuevoAsesorId) : null;
    if (!opcion) return { success: false, error: "Ese asesor no participa en la cohorte para la carrera de la propuesta." };
    if (opcion.lleno) return { success: false, error: `${opcion.nombre} tiene el cupo lleno (${opcion.activos + opcion.pendientes} de ${opcion.cupo}). Elige otro asesor.` };

    const [sol] = await db
      .insert(solicitudesAsesor)
      .values({ propuestaId: c.propuestaId, asesorId: nuevoAsesorId, coordinadorId: session.userId, estado: "pendiente", creadaEn: new Date() })
      .returning({ id: solicitudesAsesor.id });
    await db
      .update(solicitudesCambioAsesor)
      .set({
        estado: "esperando_asesor",
        nuevoAsesorId,
        solicitudAsesorId: sol.id,
        // La primera respuesta queda; al reasignar se conserva
        respuesta: c.respuesta ?? (respuesta.trim() || null),
        resueltoPor: session.userId,
        resueltoEn: new Date(),
      })
      .where(eq(solicitudesCambioAsesor.id, id));

    const [p] = await db.select({ titulo: propuestas.titulo, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, c.propuestaId));
    const [u] = await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, nuevoAsesorId));
    await db.insert(notificaciones).values([
      {
        usuarioId: nuevoAsesorId,
        tipo: "solicitud_asesoria",
        mensaje: `Se te propone como nuevo asesor de la propuesta «${p?.titulo || `#${p?.numero}`}» (cambio de asesor; el trabajo ya avanzado se conserva). ¿Estarías dispuesto a asesorarla?`,
      },
      {
        usuarioId: c.solicitanteId,
        tipo: "cambio_asesor",
        mensaje: `Tu solicitud de cambio de asesor fue aprobada. Se envió la solicitud a ${u?.nombre ?? "el nuevo asesor"}; mientras responde, sigue tu asesor actual.`,
      },
    ]);
    refrescar(c.propuestaId);
    return { success: true, message: `Solicitud de asesoría enviada a ${u?.nombre ?? "el nuevo asesor"}.` };
  } catch (e) {
    console.error("aprobarCambioAsesor:", e);
    return { success: false, error: "No se pudo aprobar el cambio." };
  }
}
