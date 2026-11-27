// D8 (specs/COORDINADOR_ASIGNACION.md): reglas del cambio de asesor (módulo puro, sirve en cliente y servidor).

export type EstadoCambio = "pendiente" | "esperando_asesor" | "por_reasignar" | "completada" | "rechazada";

export const NOMBRE_ESTADO_CAMBIO: Record<EstadoCambio, string> = {
  pendiente: "Pendiente",
  esperando_asesor: "Esperando al nuevo asesor",
  por_reasignar: "Elegir otro asesor",
  completada: "Asesor cambiado",
  rechazada: "Rechazada",
};

/** Estados en que la solicitud sigue abierta (no se puede pedir otra). */
export const CAMBIO_ABIERTO: EstadoCambio[] = ["pendiente", "esperando_asesor", "por_reasignar"];
/** Estados que esperan una acción del coordinador o la administración. */
export const CAMBIO_POR_ATENDER: EstadoCambio[] = ["pendiente", "por_reasignar"];

/** Estados de la propuesta en que se puede pedir el cambio: tiene asesor y el trabajo no terminó. */
export const ESTADOS_CAMBIO_PERMITIDO = ["aprobada", "primer_contacto_completado", "en_ejecucion", "coordinador_asignado"];

export const MIN_MOTIVO_CAMBIO = 20;
export const MIN_RESPUESTA_CAMBIO = 10;

export function revisarMotivo(motivo: string): string | null {
  return motivo.trim().length < MIN_MOTIVO_CAMBIO ? `Explica el motivo del cambio (al menos ${MIN_MOTIVO_CAMBIO} caracteres).` : null;
}
