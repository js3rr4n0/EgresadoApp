// Eliminación de una propuesta por el superadministrador (specs/REVISAR_PROPUESTA_ADMIN.md, A5). Módulo puro.
// Respuesta 4: se permite en cualquier estado **antes de «En ejecución»**; en ejecución ya hay plan, bitácora e
// informes y corresponde otra figura (baja).

export const ESTADOS_SIN_ELIMINAR = ["en_ejecucion"];
export const MIN_JUSTIFICACION_ELIMINAR = 20;
/** Palabra que se escribe para confirmar. */
export const PALABRA_ELIMINAR = "ELIMINAR";

export const puedeEliminarEnEstado = (estado: string) => !ESTADOS_SIN_ELIMINAR.includes(estado);

export function revisarEliminacion(justificacion: string, confirmacion: string): string[] {
  const p: string[] = [];
  if (justificacion.trim().length < MIN_JUSTIFICACION_ELIMINAR) p.push(`Escribe la justificación (al menos ${MIN_JUSTIFICACION_ELIMINAR} caracteres).`);
  if (confirmacion.trim().toUpperCase() !== PALABRA_ELIMINAR) p.push(`Escribe ${PALABRA_ELIMINAR} para confirmar.`);
  return p;
}
