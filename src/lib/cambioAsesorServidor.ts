import "server-only";
// D8 (specs/COORDINADOR_ASIGNACION.md): lectura del cambio de asesor, permisos para atenderlo y el paso que ocurre
// cuando el nuevo asesor responde la solicitud de asesoría.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { historialEstados, notificaciones, propuestas, solicitudesCambioAsesor, usuarios } from "@/lib/schema";
import type { SessionPayload } from "@/lib/session";
import { alcanceAdmin, puedeVerPropuesta } from "@/lib/permisos";
import { reglaDePropuesta } from "@/lib/asignacionServidor";
import { CAMBIO_ABIERTO, type EstadoCambio } from "@/lib/cambioAsesor";

export interface CambioAsesor {
  id: number;
  propuestaId: number;
  numero: number;
  titulo: string;
  tipo: string;
  solicitante: string;
  rolSolicitante: "egresado" | "asesor";
  asesorActual: string;
  asesorActualId: number;
  motivo: string;
  estado: EstadoCambio;
  nuevoAsesor: string | null;
  respuesta: string | null;
  resueltoPor: string | null;
  resueltoEn: string | null;
  creadaEn: string;
}

/** Coordinador de la propuesta (o permitido para su carrera), administración de su facultad o superadministración. */
export async function puedeAtenderCambio(session: SessionPayload, propuestaId: number): Promise<boolean> {
  if (session.rol === "admin") return true;
  if (session.rol === "decanato") {
    const a = await alcanceAdmin();
    return !!a && (await puedeVerPropuesta(a, propuestaId));
  }
  if (session.rol !== "coordinador") return false;
  const [p] = await db.select({ coordinadorId: propuestas.coordinadorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (p?.coordinadorId === session.userId) return true;
  const regla = await reglaDePropuesta(propuestaId);
  return !!regla?.coordinadores?.includes(session.userId);
}

async function nombres(ids: (number | null)[]) {
  const lista = [...new Set(ids.filter((x): x is number => x != null))];
  const filas = lista.length ? await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, lista)) : [];
  return (id: number | null) => (id == null ? null : filas.find((f) => f.id === id)?.nombre ?? `Usuario ${id}`);
}

async function aCambios(filas: (typeof solicitudesCambioAsesor.$inferSelect)[]): Promise<CambioAsesor[]> {
  if (!filas.length) return [];
  const props = await db
    .select({ id: propuestas.id, numero: propuestas.numero, titulo: propuestas.titulo, tipo: propuestas.tipo })
    .from(propuestas)
    .where(inArray(propuestas.id, [...new Set(filas.map((f) => f.propuestaId))]));
  const n = await nombres(filas.flatMap((f) => [f.solicitanteId, f.asesorActualId, f.nuevoAsesorId, f.resueltoPor]));
  return filas.map((f) => {
    const p = props.find((x) => x.id === f.propuestaId);
    return {
      id: f.id,
      propuestaId: f.propuestaId,
      numero: p?.numero ?? 0,
      titulo: p?.titulo || `Propuesta #${p?.numero ?? ""}`,
      tipo: p?.tipo ?? "",
      solicitante: n(f.solicitanteId) ?? "",
      rolSolicitante: f.rolSolicitante as "egresado" | "asesor",
      asesorActual: n(f.asesorActualId) ?? "",
      asesorActualId: f.asesorActualId,
      motivo: f.motivo,
      estado: f.estado as EstadoCambio,
      nuevoAsesor: n(f.nuevoAsesorId),
      respuesta: f.respuesta,
      resueltoPor: n(f.resueltoPor),
      resueltoEn: f.resueltoEn ? f.resueltoEn.toISOString() : null,
      creadaEn: f.creadaEn.toISOString(),
    };
  });
}

/** D8: lo mismo para otras solicitudes de la propuesta (bajas, empresas). */
export const puedeAtenderPropuesta = puedeAtenderCambio;

/** Última solicitud de cambio de la propuesta (abierta o no), para mostrarla a quien la pidió. */
export async function ultimoCambio(propuestaId: number): Promise<CambioAsesor | null> {
  try {
    const filas = await db.select().from(solicitudesCambioAsesor).where(eq(solicitudesCambioAsesor.propuestaId, propuestaId)).orderBy(desc(solicitudesCambioAsesor.id)).limit(1);
    return (await aCambios(filas))[0] ?? null;
  } catch {
    return null; // tabla todavía no creada en esta base
  }
}

/** Solicitudes de cambio que ve quien atiende: el coordinador, las de sus propuestas; la administración, las de su alcance. */
export async function cambiosParaAtender(session: SessionPayload): Promise<CambioAsesor[]> {
  try {
    const filas = await db.select().from(solicitudesCambioAsesor).orderBy(desc(solicitudesCambioAsesor.id));
    const visibles: typeof filas = [];
    for (const f of filas) if (await puedeAtenderCambio(session, f.propuestaId)) visibles.push(f);
    return aCambios(visibles);
  } catch {
    return [];
  }
}

/**
 * Lo llama `responderSolicitudAsesor`: si la solicitud de asesoría era la de un cambio, completa el cambio (al aceptar,
 * la propuesta ya quedó con el nuevo asesor y conserva su estado y su trabajo) o lo deja para elegir otro asesor.
 */
export async function alResponderSolicitudDeCambio(solicitudAsesorId: number, aceptada: boolean, asesorId: number) {
  try {
    const [c] = await db
      .select()
      .from(solicitudesCambioAsesor)
      .where(and(eq(solicitudesCambioAsesor.solicitudAsesorId, solicitudAsesorId), eq(solicitudesCambioAsesor.estado, "esperando_asesor")));
    if (!c) return;
    await db.update(solicitudesCambioAsesor).set({ estado: aceptada ? "completada" : "por_reasignar" }).where(eq(solicitudesCambioAsesor.id, c.id));
    const [p] = await db.select({ estado: propuestas.estado, egresadoId: propuestas.egresadoId, coordinadorId: propuestas.coordinadorId }).from(propuestas).where(eq(propuestas.id, c.propuestaId));
    const n = await nombres([asesorId, c.asesorActualId]);
    if (aceptada) {
      await db.insert(historialEstados).values({ propuestaId: c.propuestaId, de: p?.estado ?? "", a: "cambio_asesor", usuarioId: asesorId });
      const avisar = [...new Set([p?.egresadoId, c.asesorActualId, c.solicitanteId].filter((x): x is number => x != null))];
      await db.insert(notificaciones).values(
        avisar.map((usuarioId) => ({
          usuarioId,
          tipo: "cambio_asesor",
          mensaje: usuarioId === c.asesorActualId
            ? `La propuesta #${c.propuestaId} pasó a ${n(asesorId)} por el cambio de asesor. Ya no la verás en tu lista.`
            : `El cambio de asesor se completó: ${n(asesorId)} asesora ahora la propuesta. El trabajo hecho se conserva.`,
        })),
      );
    } else if (c.resueltoPor || p?.coordinadorId) {
      await db.insert(notificaciones).values({
        usuarioId: (c.resueltoPor ?? p!.coordinadorId)!,
        tipo: "cambio_asesor",
        mensaje: `${n(asesorId)} rechazó asesorar la propuesta #${c.propuestaId} por el cambio de asesor. Elige otro asesor en Solicitudes.`,
      });
    }
  } catch (e) {
    console.warn("No se pudo actualizar el cambio de asesor:", e);
  }
}

/** Cuántas solicitudes de cambio esperan a quien atiende (para el menú). */
export async function cambiosPorAtender(session: SessionPayload): Promise<number> {
  const lista = await cambiosParaAtender(session);
  return lista.filter((c) => c.estado === "pendiente" || c.estado === "por_reasignar").length;
}

export const cambioAbierto = (c: CambioAsesor | null) => !!c && CAMBIO_ABIERTO.includes(c.estado);
