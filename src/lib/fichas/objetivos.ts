// Cantidad de objetivos específicos. Regla vigente (specs/REDACTAR_PROPUESTA_AJUSTES.md, R4): trabajo individual, de 4 a
// 5; en grupo, 4 por integrante (líder incluido). La ficha configura los dos rangos en el elemento «Objetivos» y la misma
// regla rige la propuesta, el protocolo y el plan de trabajo. Módulo puro: lo usan el servidor y las pantallas.
import { esEtapaPropuesta, type DefinicionFicha } from "./tipos";

export interface RangoObjetivos {
  min: number;
  max: number;
}

/** Rango para una sola persona y rango por integrante cuando es en grupo. */
export interface ReglaObjetivos {
  individual: RangoObjetivos;
  porIntegrante: RangoObjetivos;
}

export const OBJETIVOS_INDIVIDUAL: RangoObjetivos = { min: 4, max: 5 };
export const OBJETIVOS_POR_INTEGRANTE: RangoObjetivos = { min: 4, max: 4 };
export const REGLA_OBJETIVOS: ReglaObjetivos = { individual: OBJETIVOS_INDIVIDUAL, porIntegrante: OBJETIVOS_POR_INTEGRANTE };

/** La misma cantidad por persona sea individual o en grupo (lo usa el plan de trabajo sin elemento «Objetivos»). */
export const reglaUniforme = (r: RangoObjetivos): ReglaObjetivos => ({ individual: r, porIntegrante: r });

function rangoDe(parametros: Record<string, unknown> | undefined, claveMin: string, claveMax: string, porDefecto: RangoObjetivos): RangoObjetivos {
  const min = Number(parametros?.[claveMin] ?? porDefecto.min);
  const max = Number(parametros?.[claveMax] ?? porDefecto.max);
  return Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min ? { min, max } : porDefecto;
}

/** Regla que configuró la ficha en el elemento «objetivos» de la propuesta (o la regla vigente). */
export function reglaObjetivosDe(def: DefinicionFicha | null | undefined): ReglaObjetivos {
  const esp = def?.etapas.find(esEtapaPropuesta)?.espacios.find((e) => e.elemento === "objetivos");
  const p = esp?.parametros as Record<string, unknown> | undefined;
  return {
    individual: rangoDe(p, "minIndividual", "maxIndividual", OBJETIVOS_INDIVIDUAL),
    porIntegrante: rangoDe(p, "minPorIntegrante", "maxPorIntegrante", OBJETIVOS_POR_INTEGRANTE),
  };
}

const personas = (integrantes: number) => Math.max(1, Math.floor(integrantes) || 1);

/** Rango por persona que aplica a un trabajo de `integrantes` personas. */
export const rangoPorPersona = (regla: ReglaObjetivos, integrantes: number): RangoObjetivos =>
  personas(integrantes) === 1 ? regla.individual : regla.porIntegrante;

/** Total de objetivos específicos para un trabajo de `integrantes` personas (al menos 1). */
export function rangoObjetivos(regla: ReglaObjetivos, integrantes: number): RangoObjetivos {
  const n = personas(integrantes);
  const r = rangoPorPersona(regla, n);
  return { min: r.min * n, max: r.max * n };
}

const textoRango = (r: RangoObjetivos) => (r.min === r.max ? `${r.min}` : `de ${r.min} a ${r.max}`);

/** Texto para las pantallas: "de 4 a 5" o "12 (4 por integrante, 3 integrantes)". */
export function textoRangoObjetivos(regla: ReglaObjetivos, integrantes: number): string {
  const n = personas(integrantes);
  const total = rangoObjetivos(regla, n);
  return n === 1 ? textoRango(total) : `${textoRango(total)} (${textoRango(regla.porIntegrante)} por integrante, ${n} integrantes)`;
}
