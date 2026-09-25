import "server-only";
import { db } from "@/lib/db";
import { actividades, registrosActividad, cartasAceptacion } from "@/lib/schema";
import { eq, and, asc, inArray, max } from "drizzle-orm";
import { generarPeriodosPasantia, fechaLocalDesdeISO, aISOLocal, type Posicion } from "@/lib/periodosPasantia";

export const DESCRIPTOR_MIN_PALABRAS = 401;
export const DESCRIPTOR_MAX_PALABRAS = 500;
export const ESTADOS_REGISTRADOS = ["enviado", "observado", "aprobado"];

type Actividad = typeof actividades.$inferSelect;
type RegistroActividad = typeof registrosActividad.$inferSelect;

export function contarPalabras(texto: string): number {
  return texto
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function codigoActividad(a: { periodo: number; semana: number; numero: number }) {
  return `${a.periodo}.${a.semana}.${a.numero}`;
}

/** Reglas de contenido obligatorio de una actividad; devuelve la lista de problemas (vacía si es válida). */
export function validarContenidoRegistro(r: Pick<RegistroActividad, "marcoTeorico" | "citaApa" | "descriptor">): string[] {
  const problemas: string[] = [];
  if (!r.marcoTeorico || r.marcoTeorico.trim().length < 10) {
    problemas.push("Debe redactar el marco teórico.");
  }
  if (!r.citaApa || r.citaApa.trim().length < 5) {
    problemas.push("Debe incluir la cita/referencia en formato APA 7.");
  }
  if (!r.descriptor) {
    problemas.push("Debe redactar el descriptor de la actividad.");
  } else {
    const n = contarPalabras(r.descriptor);
    if (n < DESCRIPTOR_MIN_PALABRAS || n > DESCRIPTOR_MAX_PALABRAS) {
      problemas.push(
        `El descriptor debe tener entre ${DESCRIPTOR_MIN_PALABRAS} y ${DESCRIPTOR_MAX_PALABRAS} palabras (actualmente tiene ${n}).`
      );
    }
  }
  return problemas;
}

/** Asegura que exista un registro (estado 'pendiente') para cada actividad vigente de la propuesta. */
export async function ensureRegistros(propuestaId: number) {
  const acts = await db
    .select()
    .from(actividades)
    .where(and(eq(actividades.propuestaId, propuestaId), eq(actividades.eliminada, false)))
    .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));

  if (acts.length === 0) return { actividades: [] as Actividad[], registros: [] as RegistroActividad[] };

  const actIds = acts.map((a) => a.id);
  let registros = await db.select().from(registrosActividad).where(inArray(registrosActividad.actividadId, actIds));

  const conRegistro = new Set(registros.map((r) => r.actividadId));
  const faltantes = acts.filter((a) => !conRegistro.has(a.id));

  if (faltantes.length > 0) {
    await db.insert(registrosActividad).values(faltantes.map((a) => ({ actividadId: a.id, estado: "pendiente" })));
    registros = await db.select().from(registrosActividad).where(inArray(registrosActividad.actividadId, actIds));
  }

  return { actividades: acts, registros };
}

/** Agrupa actividades por (periodo, semana) en orden del Gantt; la semana N+1 se habilita cuando la N está completa. */
export function calcularHabilitacion(acts: Actividad[], registrosPorActividad: Map<number, RegistroActividad>) {
  const grupos: {
    periodo: number;
    semana: number;
    actividades: { actividad: Actividad; registro: RegistroActividad | undefined }[];
  }[] = [];

  const indexPorClave = new Map<string, number>();
  for (const a of acts) {
    const clave = `${a.periodo}.${a.semana}`;
    if (!indexPorClave.has(clave)) {
      indexPorClave.set(clave, grupos.length);
      grupos.push({ periodo: a.periodo, semana: a.semana, actividades: [] });
    }
    grupos[indexPorClave.get(clave)!].actividades.push({ actividad: a, registro: registrosPorActividad.get(a.id) });
  }

  const gruposConEstado = grupos.map((g) => ({
    ...g,
    completo: g.actividades.every((x) => ESTADOS_REGISTRADOS.includes(x.registro?.estado || "")),
  }));

  let grupoActualIdx = gruposConEstado.findIndex((g) => !g.completo);
  if (grupoActualIdx === -1) grupoActualIdx = gruposConEstado.length - 1;

  return gruposConEstado.map((g, idx) => ({
    ...g,
    estadoGrupo: g.completo
      ? ("completada" as const)
      : idx === grupoActualIdx
        ? ("habilitada" as const)
        : ("bloqueada" as const),
  }));
}

/** Semana en la que se encuentra el egresado (primer grupo incompleto del cronograma). */
export async function getPosicionActual(propuestaId: number): Promise<Posicion | null> {
  const { actividades: acts, registros } = await ensureRegistros(propuestaId);
  if (acts.length === 0) return null;
  const grupos = calcularHabilitacion(acts, new Map(registros.map((r) => [r.actividadId, r])));
  const actual = grupos.find((g) => g.estadoGrupo === "habilitada") || grupos[grupos.length - 1];
  return { mes: actual.periodo, semana: actual.semana };
}

export interface PeriodoPropuesta {
  num: number;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  semanas: number;
}

/**
 * Estructura de meses y semanas del cronograma de la propuesta.
 * Se calcula con la misma regla del editor del Gantt a partir de la fecha de inicio de la carta de aceptación.
 * Las semanas de un mes nunca son menos que las que ya existen en el cronograma (datos históricos).
 */
export async function getPeriodosPropuesta(propuestaId: number): Promise<PeriodoPropuesta[]> {
  const semanasEnGantt = await db
    .select({ periodo: actividades.periodo, maxSemana: max(actividades.semana) })
    .from(actividades)
    .where(and(eq(actividades.propuestaId, propuestaId), eq(actividades.eliminada, false)))
    .groupBy(actividades.periodo);
  const maxSemanaPorPeriodo = new Map(semanasEnGantt.map((s) => [s.periodo, s.maxSemana || 0]));

  const [carta] = await db
    .select({ fechaInicio: cartasAceptacion.fechaInicio })
    .from(cartasAceptacion)
    .where(eq(cartasAceptacion.propuestaId, propuestaId))
    .limit(1);

  if (carta?.fechaInicio) {
    return generarPeriodosPasantia(fechaLocalDesdeISO(carta.fechaInicio)).map((p) => ({
      num: p.num,
      nombre: p.nombre,
      inicio: aISOLocal(p.inicio),
      fin: aISOLocal(p.fin),
      semanas: Math.max(p.semanas, maxSemanaPorPeriodo.get(p.num) || 0),
    }));
  }

  return Array.from(maxSemanaPorPeriodo.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([num, semanas]) => ({ num, nombre: `Mes ${num}`, inicio: null, fin: null, semanas }));
}
