// Preferencias de notificaciones por correo. Módulo puro (servidor y cliente).
// El envío real de correos aún no está conectado: esta lógica decide si una notificación se enviaría.

export const ROLES_NOTIFICACION = [
  { id: "egresado", label: "Egresado" },
  { id: "asesor", label: "Asesor" },
  { id: "admin", label: "Administrador" },
] as const;

export type RolNotificacion = (typeof ROLES_NOTIFICACION)[number]["id"];

export function leerRolNotificacion(valor?: string): RolNotificacion {
  return ROLES_NOTIFICACION.some((r) => r.id === valor) ? (valor as RolNotificacion) : "egresado";
}

/** Notificaciones de demostración (todavía no asociadas a eventos reales) con su configuración inicial. */
export const NOTIFICACIONES_DEMO = [
  { clave: "notificacion_1", nombre: "Notificación 1", correoHabilitado: true, obligatoria: false },
  { clave: "notificacion_2", nombre: "Notificación 2", correoHabilitado: true, obligatoria: true },
  { clave: "notificacion_3", nombre: "Notificación 3", correoHabilitado: true, obligatoria: false },
  { clave: "notificacion_4", nombre: "Notificación 4", correoHabilitado: true, obligatoria: true },
  { clave: "notificacion_5", nombre: "Notificación 5", correoHabilitado: false, obligatoria: false },
];

export interface ConfigCorreo {
  correoHabilitado: boolean;
  obligatoria: boolean;
}

/** Si el usuario puede cambiar la preferencia: solo cuando el correo está habilitado y la notificación no es obligatoria. */
export function esConfigurable(c: ConfigCorreo) {
  return c.correoHabilitado && !c.obligatoria;
}

/**
 * Decide si la notificación se enviaría por correo: requiere el correo habilitado por el administrador y, si no es
 * obligatoria, que el usuario no la haya desactivado (sin preferencia guardada se envía).
 * La notificación interna del sistema se muestra siempre, con independencia de este resultado.
 */
export function seEnviariaCorreo(c: ConfigCorreo, preferencia: boolean | null | undefined) {
  if (!c.correoHabilitado) return false;
  if (c.obligatoria) return true;
  return preferencia ?? true;
}
