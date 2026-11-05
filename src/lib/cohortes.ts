import { db } from "@/lib/db";
import { periodos, propuestas, usuarios } from "@/lib/schema";
import { and, asc, desc, eq } from "drizzle-orm";

/**
 * Período (cohorte) que corresponde a un egresado. Antes se tomaba "el" activo con `.limit(1)` sin orden y, con
 * dos activos, la base decidía (O4). Ahora, en este orden:
 *   1. el activo cuyo nombre coincide con `usuarios.cohorte`;
 *   2. el activo en el que el egresado ya tiene su propuesta más reciente (datos donde la cohorte no coincide);
 *   3. el primer activo por id, que es lo que la base devolvía en la práctica.
 */
export async function periodoDelEgresado(egresadoId: number) {
  const [u] = await db.select({ cohorte: usuarios.cohorte }).from(usuarios).where(eq(usuarios.id, egresadoId)).limit(1);
  if (u?.cohorte) {
    const [propio] = await db
      .select()
      .from(periodos)
      .where(and(eq(periodos.activo, true), eq(periodos.nombre, u.cohorte)))
      .limit(1);
    if (propio) return propio;
  }
  const [conPropuesta] = await db
    .select({ periodo: periodos })
    .from(propuestas)
    .innerJoin(periodos, eq(propuestas.periodoId, periodos.id))
    .where(and(eq(propuestas.egresadoId, egresadoId), eq(periodos.activo, true)))
    .orderBy(desc(propuestas.id))
    .limit(1);
  if (conPropuesta) return conPropuesta.periodo;
  return primerPeriodoActivo();
}

/** El primer período activo por id. Para pantallas que no son de un egresado concreto. */
export async function primerPeriodoActivo() {
  const [p] = await db.select().from(periodos).where(eq(periodos.activo, true)).orderBy(asc(periodos.id)).limit(1);
  return p ?? null;
}

/** Cohorte registrada de un usuario (texto igual a `periodos.nombre`), o null. */
export async function cohorteDe(usuarioId: number): Promise<string | null> {
  const [u] = await db.select({ cohorte: usuarios.cohorte }).from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  return u?.cohorte ?? null;
}

/**
 * Regla del trabajo en equipo (proyecto e investigación): todos los integrantes deben ser de la misma cohorte
 * que la propuesta. Devuelve el mensaje de error, o null si el egresado puede unirse.
 */
export async function errorCohorteEquipo(propuestaId: number, egresadoId: number): Promise<string | null> {
  const [prop] = await db
    .select({ cohorte: periodos.nombre })
    .from(propuestas)
    .innerJoin(periodos, eq(propuestas.periodoId, periodos.id))
    .where(eq(propuestas.id, propuestaId))
    .limit(1);
  if (!prop) return null; // Propuesta sin cohorte registrada (datos antiguos): no se puede comparar.
  const cohorte = await cohorteDe(egresadoId);
  if (cohorte === prop.cohorte) return null;
  return `MISMA_COHORTE: Todos los integrantes deben ser de la cohorte ${prop.cohorte}${cohorte ? ` (este egresado es de ${cohorte})` : " y este egresado no tiene cohorte registrada"}.`;
}

/**
 * Si la ficha de la propuesta lo pide (participantes.mismaCarrera), el egresado debe ser de la misma carrera que
 * el líder. Devuelve el mensaje de error, o null si puede unirse (o si la ficha no lo pide).
 */
export async function errorCarreraEquipo(propuestaId: number, egresadoId: number): Promise<string | null> {
  const { fichaDePropuesta } = await import("@/lib/fichas/fichaDePropuesta");
  const f = await fichaDePropuesta(propuestaId);
  if (!f?.version || !f.definicion.participantes.mismaCarrera) return null;
  const [prop] = await db.select({ lider: propuestas.egresadoId }).from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) return null;
  const [lider] = await db.select({ carreraId: usuarios.carreraId }).from(usuarios).where(eq(usuarios.id, prop.lider)).limit(1);
  const [otro] = await db.select({ carreraId: usuarios.carreraId }).from(usuarios).where(eq(usuarios.id, egresadoId)).limit(1);
  if (lider?.carreraId && lider.carreraId === otro?.carreraId) return null;
  return "MISMA_CARRERA: La ficha de esta propuesta pide que todos los integrantes sean de la misma carrera que el líder.";
}
