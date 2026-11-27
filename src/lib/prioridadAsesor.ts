// Prioridad del asesor por empresa (specs/REVISAR_PROPUESTA_ADMIN.md, A6). Módulo puro.
//
// Lo ideal es que el mismo asesor lleve todas las propuestas de una empresa, y que si la empresa se repite en otra
// cohorte se le dé prioridad al asesor que ya trabajó con ella. Respuesta 5: cuenta toda propuesta de esa empresa que el
// asesor aceptó (tiene asesor y no está rechazada ni anulada), de cualquier cohorte; las de la cohorte actual primero.

export interface PrioridadAsesor {
  /** Propuestas de la empresa que asesora en la cohorte de esta propuesta. */
  actual: number;
  /** Cohortes anteriores en que trabajó con la empresa. */
  cohortesAnteriores: string[];
}

export const esPrioritario = (p: PrioridadAsesor | null | undefined) => !!p && (p.actual > 0 || p.cohortesAnteriores.length > 0);

/** «Asesora 2 propuestas de esta empresa en esta cohorte» / «Trabajó con esta empresa en C1-2026». */
export function motivoPrioridad(p: PrioridadAsesor | null | undefined): string | null {
  if (!esPrioritario(p)) return null;
  const partes: string[] = [];
  if (p!.actual > 0) partes.push(p!.actual === 1 ? "Asesora 1 propuesta de esta empresa en esta cohorte" : `Asesora ${p!.actual} propuestas de esta empresa en esta cohorte`);
  if (p!.cohortesAnteriores.length) partes.push(`Trabajó con esta empresa en ${p!.cohortesAnteriores.join(", ")}`);
  return partes.join(" · ");
}

/** Para ordenar: primero quien la asesora en esta cohorte, luego quien trabajó con ella antes, luego el resto. */
export const pesoPrioridad = (p: PrioridadAsesor | null | undefined) => (!p ? 0 : p.actual > 0 ? 2 : p.cohortesAnteriores.length > 0 ? 1 : 0);
