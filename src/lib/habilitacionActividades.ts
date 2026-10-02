import "server-only";
import { db } from "@/lib/db";
import { actividades, registrosActividad, cartasAceptacion } from "@/lib/schema";
import { eq, and, asc, inArray, max } from "drizzle-orm";
import {
  generarPeriodosPasantia,
  fechaLocalDesdeISO,
  aISOLocal,
  hoyISOElSalvador,
  NUM_INFORMES_MENSUALES,
  type Posicion,
} from "@/lib/periodosPasantia";
import { estimarPaginas, nivelRitmo, PAGINAS_MINIMAS_INFORME } from "@/lib/metricaPaginas";

export {
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
  contarPalabras,
  validarContenidoRegistro,
} from "@/lib/reglasRegistroActividad";

export const ESTADOS_REGISTRADOS = ["enviado", "observado", "aprobado"];

type Actividad = typeof actividades.$inferSelect;
type RegistroActividad = typeof registrosActividad.$inferSelect;

export function codigoActividad(a: { periodo: number; semana: number; numero: number }) {
  return `${a.periodo}.${a.semana}.${a.numero}`;
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

/**
 * Agrupa actividades por (periodo, semana) en orden del Gantt. La semana N+1 se habilita cuando todas las actividades
 * de la semana N fueron aprobadas por el asesor. Una semana enviada a revisión queda "en_revision" (sin acciones del egresado).
 */
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
    completo: g.actividades.every((x) => x.registro?.estado === "aprobado"),
    enRevision: g.actividades.every((x) => x.registro?.estado === "enviado" || x.registro?.estado === "aprobado"),
  }));

  let grupoActualIdx = gruposConEstado.findIndex((g) => !g.completo);
  if (grupoActualIdx === -1) grupoActualIdx = gruposConEstado.length - 1;

  return gruposConEstado.map((g, idx) => ({
    ...g,
    estadoGrupo: g.completo
      ? ("completada" as const)
      : idx === grupoActualIdx
        ? g.enRevision
          ? ("en_revision" as const)
          : ("habilitada" as const)
        : ("bloqueada" as const),
  }));
}

/** Grupo (semana) en el que se encuentra el egresado: el primero no aprobado por completo, o el último si ya terminó. */
export function grupoActualDe<T extends { estadoGrupo: string }>(grupos: T[]): T | undefined {
  return grupos.find((g) => g.estadoGrupo === "habilitada" || g.estadoGrupo === "en_revision") || grupos[grupos.length - 1];
}

/** Semana en la que se encuentra el egresado (primer grupo incompleto del cronograma). */
export async function getPosicionActual(propuestaId: number): Promise<Posicion | null> {
  const { actividades: acts, registros } = await ensureRegistros(propuestaId);
  if (acts.length === 0) return null;
  const grupos = calcularHabilitacion(acts, new Map(registros.map((r) => [r.actividadId, r])));
  const actual = grupoActualDe(grupos)!;
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

export interface MetricaPaginas {
  minimoPorInforme: number;
  porInforme: { numero: number; paginas: number; minimo: number; inicio: string | null; fin: string | null }[];
  paginasTotales: number;
  minimoTotal: number;
  paginasEsperadasHoy: number;
  nivel: "adecuado" | "atencion" | "critico";
}

/**
 * Extensión estimada de los informes (actividades enviadas o aprobadas) frente al mínimo por informe y al ritmo esperado
 * según el tiempo transcurrido desde el inicio de la pasantía.
 */
export async function calcularMetricaPaginas(
  propuestaId: number,
  acts: Actividad[],
  registros: RegistroActividad[]
): Promise<MetricaPaginas> {
  const periodos = (await getPeriodosPropuesta(propuestaId)).filter((p) => p.num <= NUM_INFORMES_MENSUALES);
  const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));

  const porInforme = Array.from({ length: NUM_INFORMES_MENSUALES }, (_, i) => {
    const numero = i + 1;
    const registrosMes = acts
      .filter((a) => a.periodo === numero)
      .map((a) => registroPorActividad.get(a.id))
      .filter((r): r is RegistroActividad => !!r && ESTADOS_REGISTRADOS.includes(r.estado));
    const periodo = periodos.find((p) => p.num === numero);
    return {
      numero,
      paginas: estimarPaginas(registrosMes),
      minimo: PAGINAS_MINIMAS_INFORME,
      inicio: periodo?.inicio ?? null,
      fin: periodo?.fin ?? null,
    };
  });

  const paginasTotales = Math.round(porInforme.reduce((t, i) => t + i.paginas, 0) * 10) / 10;
  const minimoTotal = PAGINAS_MINIMAS_INFORME * NUM_INFORMES_MENSUALES;

  // Ritmo esperado: proporción del tiempo transcurrido entre el inicio del primer período y el fin del último.
  const inicioPasantia = periodos[0]?.inicio;
  const finPasantia = periodos[periodos.length - 1]?.fin;
  let fraccion = 0;
  if (inicioPasantia && finPasantia) {
    const hoy = Date.parse(hoyISOElSalvador());
    const total = Date.parse(finPasantia) - Date.parse(inicioPasantia);
    fraccion = total > 0 ? Math.min(1, Math.max(0, (hoy - Date.parse(inicioPasantia)) / total)) : 0;
  }
  const paginasEsperadasHoy = Math.round(minimoTotal * fraccion * 10) / 10;

  return {
    minimoPorInforme: PAGINAS_MINIMAS_INFORME,
    porInforme,
    paginasTotales,
    minimoTotal,
    paginasEsperadasHoy,
    nivel: nivelRitmo(paginasTotales, paginasEsperadasHoy),
  };
}
