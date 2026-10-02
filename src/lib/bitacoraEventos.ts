// Tipos de evento de la bitácora del proceso y su etiqueta. Módulo puro (servidor y cliente).

export const TIPOS_EVENTO = {
  actividad_borrador: "Borrador de actividad",
  actividad_imagen: "Imagen de soporte",
  actividad_enviada: "Actividad enviada",
  semana_enviada: "Semana enviada",
  actividad_aprobada: "Actividad aprobada",
  actividad_observada: "Actividad con observaciones",
  cambio_solicitado: "Solicitud de cambio",
  cambio_aprobado: "Cambio aprobado",
  cambio_rechazado: "Cambio rechazado",
  informe_enviado: "Informe enviado",
  informe_aprobado: "Informe aprobado",
  informe_observado: "Informe con correcciones",
  comentarios_asesor: "Comentarios para el decanato",
  nota_seguimiento: "Nota de seguimiento",
  visita_actualizada: "Informe de visita",
  visita_completada: "Visita completada",
  alerta_cierre: "Aviso de cierre",
  periodo_cerrado: "Cierre de período",
} as const;

export type TipoEvento = keyof typeof TIPOS_EVENTO;

export const ACTORES: Record<string, string> = {
  egresado: "Egresado",
  asesor: "Asesor",
  coordinador: "Coordinación",
  admin: "Administración",
  sistema: "Sistema",
};

/** Filtros de la bitácora por parte involucrada. */
export const FILTROS_BITACORA = [
  { id: "todos", label: "Todo" },
  { id: "egresado", label: "Egresado" },
  { id: "asesor", label: "Asesor" },
  { id: "sistema", label: "Sistema" },
] as const;

export type FiltroBitacora = (typeof FILTROS_BITACORA)[number]["id"];

export function leerFiltroBitacora(valor?: string): FiltroBitacora {
  return FILTROS_BITACORA.some((f) => f.id === valor) ? (valor as FiltroBitacora) : "todos";
}

export const DESCRIPCION_BITACORA =
  "Registro de todo lo que realizan el egresado, su asesor y el sistema durante el proceso. Es visible para el egresado, su asesor y la coordinación.";
