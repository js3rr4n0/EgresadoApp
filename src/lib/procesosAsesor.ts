// Panel del asesor (specs/DASHBOARD_ASESOR.md, S1): reglas puras de la etapa de cada proceso, a quién le toca cada
// requisito de los 21 días y el orden por urgencia. Sirve en cliente y servidor.

import { NOMBRE_REQUISITO, type ClaveRequisito, type EstadoRequisito } from "@/lib/seguimientoCohortes";

export type EtapaProceso = "revision" | "ajustes" | "pre_ejecucion" | "ejecucion" | "cerrado";

export const NOMBRE_ETAPA: Record<EtapaProceso, string> = {
  revision: "Revisión de la propuesta",
  ajustes: "Ajustes pedidos al equipo",
  pre_ejecucion: "Pre-ejecución (21 días)",
  ejecucion: "En ejecución",
  cerrado: "Cerrado",
};

/** Etapa del proceso según el estado de la propuesta (ya con asesor). */
export function etapaDe(estado: string): EtapaProceso {
  if (estado === "coordinador_asignado" || estado === "enviada" || estado === "solicitud_asesor_enviada") return "revision";
  // Al pedir ajustes la propuesta vuelve a redacción con el asesor asignado
  if (estado === "redactando") return "ajustes";
  if (estado === "aprobada" || estado === "primer_contacto_completado") return "pre_ejecucion";
  if (estado === "en_ejecucion") return "ejecucion";
  return "cerrado";
}

/** Pestaña del panel: antes de la ejecución o en ejecución (los cerrados no se muestran, respuesta 4). */
export const pestanaDe = (e: EtapaProceso): "propuesta" | "ejecucion" | null =>
  e === "ejecucion" ? "ejecucion" : e === "cerrado" ? null : "propuesta";

export type Responsable = "asesor" | "equipo";

export interface RequisitoProceso {
  clave: ClaveRequisito;
  nombre: string;
  /** Fecha en que se cumplió (AAAA-MM-DD), null si falta, o "no_aplica". */
  estado: EstadoRequisito;
  /** A quién le toca mientras falta. */
  responsable: Responsable;
  /** Qué hay que hacer, en palabras del asesor. */
  accion: string;
}

/**
 * Requisitos de los 21 días con quién debe actuar (respuesta 2): los dictámenes y el primer contacto son del asesor; el
 * plan de trabajo lo elabora el equipo y el asesor lo revisa cuando se envía (en pasantía, el asesor sube el plan firmado).
 */
export function requisitosProceso(tipo: string, requisitos: Record<ClaveRequisito, EstadoRequisito>, estadoPlan: string | null): RequisitoProceso[] {
  const plan: Pick<RequisitoProceso, "responsable" | "accion"> =
    tipo === "pasantia"
      ? { responsable: "asesor", accion: "Sube el plan de trabajo firmado." }
      : estadoPlan === "enviado"
        ? { responsable: "asesor", accion: "El equipo envió el plan: revísalo." }
        : estadoPlan === "observado"
          ? { responsable: "equipo", accion: "El equipo corrige el plan con tus observaciones." }
          : { responsable: "equipo", accion: "El equipo elabora el plan de trabajo." };
  const fijo: Record<Exclude<ClaveRequisito, "plan">, Pick<RequisitoProceso, "responsable" | "accion">> = {
    dictamen_propuesta: { responsable: "asesor", accion: "Sube el dictamen de la propuesta." },
    dictamen_plan: { responsable: "asesor", accion: "Sube el dictamen del plan de trabajo." },
    primer_contacto: { responsable: "asesor", accion: "Envía el informe de primer contacto." },
  };
  return (Object.keys(NOMBRE_REQUISITO) as ClaveRequisito[]).map((clave) => ({
    clave,
    nombre: NOMBRE_REQUISITO[clave],
    estado: requisitos[clave],
    ...(clave === "plan" ? plan : fijo[clave]),
  }));
}

/** Pendientes que dependen del asesor (para los números en rojo y el orden). */
export function pendientesAsesor(etapa: EtapaProceso, requisitos: RequisitoProceso[]): number {
  if (etapa === "revision") return 1; // revisar la propuesta: aprobar o pedir ajustes
  if (etapa !== "pre_ejecucion") return 0;
  return requisitos.filter((r) => r.estado === null && r.responsable === "asesor").length;
}

/** Orden en cada bloque: primero lo que espera al asesor, luego menos días restantes, luego el número. */
export function compararUrgencia(
  a: { pendientesAsesor: number; diasRestantes: number | null; numero: number },
  b: { pendientesAsesor: number; diasRestantes: number | null; numero: number },
): number {
  return (
    Number(b.pendientesAsesor > 0) - Number(a.pendientesAsesor > 0) ||
    (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999) ||
    a.numero - b.numero
  );
}
