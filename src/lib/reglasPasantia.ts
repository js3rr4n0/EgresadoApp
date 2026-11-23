// Reglas de la ejecución de una pasantía (entrega W2, specs/fichas/PASANTIA_FICHA.md). Módulo puro.
// Con ficha, salen de su primera etapa de ejecución: duración, períodos, días por período, semanas por período, límites
// del registro de actividades y páginas mínimas del informe. Sin ficha (fase 1), son los valores de siempre.
// Notas del 23-nov-2026: casi nunca cambian, pero la ficha debe permitir una pasantía «especial» para una carrera.

import { DIAS_POR_PERIODO, DURACION_PASANTIA_DIAS, SEMANAS_POR_PERIODO } from "./periodosPasantia";
import { CONCLUSION_MAX_PALABRAS, CONCLUSION_MIN_PALABRAS, DESCRIPTOR_MAX_PALABRAS, DESCRIPTOR_MIN_PALABRAS } from "./reglasRegistroActividad";
import { PAGINAS_MINIMAS_INFORME } from "./metricaPaginas";
import { MAX_IMAGENES_ACTIVIDAD } from "./fuenteImagen";
import { configFinalFase1, configPeriodoFase1, leerConfigFinal, leerConfigPeriodo, type ConfigDocumentoFinal, type ConfigInformePeriodo } from "./fichas/documentoFinalPasantia";

export interface ReglasPasantia {
  /** Días entre el inicio y el fin (= períodos × días por período). */
  duracionDias: number;
  periodos: number;
  diasPorPeriodo: number;
  semanasPorPeriodo: number;
  /** Palabras de la descripción y de la conclusión técnica de cada actividad. */
  descripcion: { min: number; max: number };
  conclusion: { min: number; max: number };
  /** Imágenes de soporte por actividad (la principal y las adicionales). */
  imagenes: number;
  /** Páginas mínimas de cada informe de período (0 = sin mínimo). */
  paginasMinimas: number;
  /** Las reglas salen de una ficha (no de los valores de la fase 1). */
  deFicha: boolean;
  /** Entrega W3: contenido del documento final y partes del informe de período. */
  documentoFinal: ConfigDocumentoFinal;
  informePeriodo: ConfigInformePeriodo;
}

export const REGLAS_FASE1: ReglasPasantia = {
  duracionDias: DURACION_PASANTIA_DIAS,
  periodos: DURACION_PASANTIA_DIAS / DIAS_POR_PERIODO,
  diasPorPeriodo: DIAS_POR_PERIODO,
  semanasPorPeriodo: SEMANAS_POR_PERIODO,
  descripcion: { min: DESCRIPTOR_MIN_PALABRAS, max: DESCRIPTOR_MAX_PALABRAS },
  conclusion: { min: CONCLUSION_MIN_PALABRAS, max: CONCLUSION_MAX_PALABRAS },
  imagenes: MAX_IMAGENES_ACTIVIDAD,
  paginasMinimas: PAGINAS_MINIMAS_INFORME,
  deFicha: false,
  documentoFinal: configFinalFase1(),
  informePeriodo: configPeriodoFase1(),
};

interface EjecucionLeida {
  tipo: string;
  unidad?: "dias" | "meses";
  periodos?: number;
  duracionPeriodo?: number;
  subperiodos?: number;
  registro?: { descripcion?: { min: number; max: number }; conclusion?: { min: number; max: number }; imagenes?: number };
  informe?: { paginasMinimas?: number; documentoFinal?: unknown; periodo?: unknown };
}

const entero = (v: unknown, min: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min;

/** Reglas de una definición de ficha (su primera etapa de ejecución); sin definición o sin ejecución, las de la fase 1. */
export function reglasDeDefinicion(def: { etapas?: unknown[] } | null | undefined): ReglasPasantia {
  const ejec = (def?.etapas ?? []).find((e) => (e as EjecucionLeida).tipo === "ejecucion") as EjecucionLeida | undefined;
  if (!ejec) return REGLAS_FASE1;
  const periodos = entero(ejec.periodos, 1) ? ejec.periodos : REGLAS_FASE1.periodos;
  const base = entero(ejec.duracionPeriodo, 1) ? ejec.duracionPeriodo : REGLAS_FASE1.diasPorPeriodo;
  const diasPorPeriodo = ejec.unidad === "meses" ? base * 30 : base;
  const rango = (r: { min: number; max: number } | undefined, porDefecto: { min: number; max: number }) =>
    r && entero(r.min, 0) && entero(r.max, 0) ? { min: r.min, max: r.max } : porDefecto;
  return {
    duracionDias: periodos * diasPorPeriodo,
    periodos,
    diasPorPeriodo,
    semanasPorPeriodo: entero(ejec.subperiodos, 1) ? ejec.subperiodos : REGLAS_FASE1.semanasPorPeriodo,
    descripcion: rango(ejec.registro?.descripcion, REGLAS_FASE1.descripcion),
    conclusion: rango(ejec.registro?.conclusion, REGLAS_FASE1.conclusion),
    imagenes: entero(ejec.registro?.imagenes, 1) ? ejec.registro!.imagenes! : REGLAS_FASE1.imagenes,
    paginasMinimas: entero(ejec.informe?.paginasMinimas, 0) ? ejec.informe!.paginasMinimas! : REGLAS_FASE1.paginasMinimas,
    deFicha: true,
    documentoFinal: leerConfigFinal(ejec.informe?.documentoFinal),
    informePeriodo: leerConfigPeriodo(ejec.informe?.periodo),
  };
}

/** La forma del calendario es la de la fase 1 (cinco períodos de 30 días): se usan las fechas límite de la cohorte. */
export const calendarioFase1 = (r: ReglasPasantia) => r.periodos === REGLAS_FASE1.periodos && r.diasPorPeriodo === REGLAS_FASE1.diasPorPeriodo;

/** Actividades mínimas del cronograma por período: una por semana (fase 1: 4). */
export const minimoActividadesPeriodo = (r: Pick<ReglasPasantia, "semanasPorPeriodo">) => r.semanasPorPeriodo;
