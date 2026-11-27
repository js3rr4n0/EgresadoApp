// Estado y acción de cada propuesta en la tabla «Mis propuestas» del egresado (specs/SEGUIMIENTO_PROPUESTA_EGRESADO.md,
// T3). Módulo puro. Tonos: gris (borrador o en espera), rojo (le toca al egresado), azul grisáceo (en proceso), verde
// (aprobada o en ejecución).

export type TonoFila = "borrador" | "accion" | "proceso" | "ok";

export interface FilaPropuesta {
  id: number;
  estado: string;
  observaciones: string | null;
}

export function estadoFila(p: FilaPropuesta, bloqueadaPorOtra: boolean): { texto: string; tono: TonoFila } {
  if (p.estado === "rechazada") return { texto: "Rechazada", tono: "accion" };
  if (p.observaciones) return { texto: "Ajustes solicitados", tono: "accion" };
  switch (p.estado) {
    case "redactando":
      return bloqueadaPorOtra ? { texto: "En espera", tono: "borrador" } : { texto: "En redacción", tono: "borrador" };
    case "pend_revision_datos":
    case "pend_empresa_nueva":
      return { texto: "Empresa en revisión", tono: "proceso" };
    case "empresa_rechazada":
    case "datos_rechazados":
      return { texto: "Empresa rechazada", tono: "accion" };
    case "enviada":
    case "coordinador_asignado":
      return { texto: "Enviada", tono: "proceso" };
    case "aprobada":
      return { texto: "Aprobada", tono: "ok" };
    case "primer_contacto_completado":
      return { texto: "Primer contacto completado", tono: "ok" };
    case "en_ejecucion":
      return { texto: "En ejecución", tono: "ok" };
    case "anulada":
      return { texto: "Anulada", tono: "borrador" };
    default:
      return { texto: p.estado.replace(/_/g, " "), tono: "proceso" };
  }
}

export interface AccionFila {
  texto: string;
  href: string;
  /** Se abre en otra pestaña (el documento). */
  externa?: boolean;
  principal?: boolean;
}

/** Qué puede hacer el egresado con la propuesta desde la tabla. */
export function accionFila(p: FilaPropuesta): AccionFila {
  if (p.estado === "rechazada") return { texto: "Ver motivo", href: `#rechazo-${p.id}`, principal: true };
  if (p.observaciones) return { texto: "Corregir observaciones", href: `/egresado/redactar?id=${p.id}`, principal: true };
  if (["redactando", "empresa_rechazada", "datos_rechazados"].includes(p.estado)) return { texto: "Continuar redacción", href: `/egresado/redactar?id=${p.id}`, principal: true };
  if (["pend_revision_datos", "pend_empresa_nueva"].includes(p.estado)) return { texto: "Ver propuesta", href: `/egresado/redactar?id=${p.id}` };
  return { texto: "Ver documento", href: `/egresado/redactar/imprimir?id=${p.id}`, externa: true };
}
