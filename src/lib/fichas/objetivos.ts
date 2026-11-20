// Cantidad de objetivos específicos (reunión del 20-nov-2026, H19 y H27): de 3 a 4 por integrante, y la misma regla en
// la propuesta, el protocolo y el plan de trabajo. El total de un equipo es el rango por integrante por la cantidad de
// integrantes (líder incluido). Módulo puro: lo usan el servidor y las pantallas.
import { esEtapaPropuesta, type DefinicionFicha } from "./tipos";

export interface RangoObjetivos {
  min: number;
  max: number;
}

/** Regla por defecto: de 3 a 4 objetivos específicos por integrante. */
export const OBJETIVOS_POR_INTEGRANTE: RangoObjetivos = { min: 3, max: 4 };

/** Rango por integrante que configuró la ficha en el elemento «objetivos» de la propuesta (o el de la regla). */
export function objetivosPorIntegranteDe(def: DefinicionFicha | null | undefined): RangoObjetivos {
  const esp = def?.etapas.find(esEtapaPropuesta)?.espacios.find((e) => e.elemento === "objetivos");
  const min = Number(esp?.parametros.minEspecificos);
  const max = Number(esp?.parametros.maxEspecificos);
  return Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min ? { min, max } : OBJETIVOS_POR_INTEGRANTE;
}

/** Total de objetivos específicos para un trabajo de `integrantes` personas (al menos 1). */
export function rangoObjetivos(porIntegrante: RangoObjetivos, integrantes: number): RangoObjetivos {
  const n = Math.max(1, Math.floor(integrantes) || 1);
  return { min: porIntegrante.min * n, max: porIntegrante.max * n };
}

/** Texto para las pantallas: "de 3 a 4" o "de 6 a 8 (de 3 a 4 por integrante, 2 integrantes)". */
export function textoRangoObjetivos(porIntegrante: RangoObjetivos, integrantes: number): string {
  const r = rangoObjetivos(porIntegrante, integrantes);
  const n = Math.max(1, Math.floor(integrantes) || 1);
  return n === 1
    ? `de ${r.min} a ${r.max}`
    : `de ${r.min} a ${r.max} (de ${porIntegrante.min} a ${porIntegrante.max} por integrante, ${n} integrantes)`;
}
