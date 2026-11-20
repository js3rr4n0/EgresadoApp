// Cómo se muestra el historial de una propuesta (recorrido integral, H18). El historial guarda cambios de estado y
// también eventos (la solicitud de asesoría, ajustes, bajas) en la columna "a"; esos no cambian el estado de la
// propuesta, así que no se muestran como "Cambio de estado". Módulo puro.

const ESTADOS: Record<string, string> = {
  redactando: "Redactando",
  pend_empresa_nueva: "Empresa nueva en revisión",
  pend_revision_datos: "Corrección de datos en revisión",
  empresa_aprobada: "Empresa aprobada",
  empresa_rechazada: "Empresa rechazada",
  datos_aprobados: "Datos aprobados",
  datos_rechazados: "Datos rechazados",
  enviada: "Enviada",
  coordinador_asignado: "Coordinador asignado",
  aprobada: "Aprobada",
  primer_contacto_completado: "Primer contacto completado",
  en_ejecucion: "En ejecución",
  rechazada: "Rechazada",
  anulada: "Anulada",
};

const EVENTOS: [string, string][] = [
  ["solicitud_asesor_enviada", "Solicitud de asesoría enviada al docente"],
  ["asesor_asignado", "Asesor asignado"],
  ["asesor_acepto", "El asesor aceptó la asesoría"],
  ["asesor_rechazo", "El asesor rechazó la asesoría"],
  ["coordinador_reasignado", "Coordinador reasignado"],
  ["ajustes_solicitados", "Ajustes solicitados"],
  ["ajustes_completados", "Ajustes completados"],
  ["solicitud_baja", "Solicitud de baja"],
];

/** Nombre legible de un estado de la propuesta (o el código, si no se conoce). */
export function nombreEstado(codigo: string | null | undefined): string {
  if (!codigo) return "—";
  return ESTADOS[codigo.split(":")[0]] ?? codigo;
}

export type LineaHistorial =
  | { tipo: "cambio"; de: string; a: string }
  | { tipo: "evento"; texto: string; estado: string };

/** Una fila del historial: un cambio de estado real o un evento que no cambió el estado. */
export function describirHistorial(de: string | null | undefined, a: string | null | undefined): LineaHistorial {
  const base = (a ?? "").split(":")[0];
  if (ESTADOS[base] && base !== de) return { tipo: "cambio", de: nombreEstado(de), a: nombreEstado(base) };
  const evento = EVENTOS.find(([prefijo]) => base.startsWith(prefijo));
  return { tipo: "evento", texto: evento ? evento[1] : nombreEstado(a), estado: nombreEstado(de) };
}
