// Firmantes y supervisor de la carta de aceptación (specs/REDACTAR_PROPUESTA_AJUSTES.md, R5). Módulo puro: lo usan
// el formulario de la carta, la acción que lo guarda, la aprobación en Gestión de Empresas y el envío.
//
// - Se eligen de la empresa de la propuesta. Los que no están se agregan con nombre completo, título, cargo, correo y
//   teléfono, y van a la administración en una sola solicitud de empresa de tipo «carta» (respuesta 6).
// - «Sin supervisor empresarial» lleva un motivo y siempre va como solicitud para que la administración lo valide.
// - Con la solicitud pendiente se puede seguir redactando, pero no enviar la propuesta.

export interface PersonaNueva {
  nombreCompleto: string;
  titulo: string;
  cargo: string;
  correo: string;
  telefono: string;
}

/** Lo que guarda la solicitud de tipo «carta» en `solicitudes_empresa.datos`. */
export interface DatosSolicitudCarta {
  origen: "carta";
  empresaId: number;
  sucursalId: number | null;
  firmantesNuevos: PersonaNueva[];
  supervisorNuevo: PersonaNueva | null;
  sinSupervisor: { motivo: string } | null;
}

export interface EntradaPersonasCarta {
  firmanteIds: number[];
  firmantesNuevos: PersonaNueva[];
  /** Supervisor de la empresa elegido; null si es nuevo o sin supervisor. */
  supervisorId: number | null;
  supervisorNuevo: PersonaNueva | null;
  sinSupervisor: boolean;
  motivoSinSupervisor: string;
}

export const MAX_FIRMANTES = 3;
export const MIN_MOTIVO = 20;

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

/** Problemas de una persona nueva ("" si está completa). */
export function revisarPersona(p: PersonaNueva, quien: string): string {
  if (p.nombreCompleto.trim().split(/\s+/).length < 2) return `${quien}: escribe el nombre completo (nombres y apellidos).`;
  if (!p.titulo.trim()) return `${quien}: falta el título (por ejemplo, Ingeniero, Licenciada, Máster).`;
  if (!p.cargo.trim()) return `${quien}: falta el cargo.`;
  if (!correoValido(p.correo)) return `${quien}: el correo no es válido.`;
  if (p.telefono.replace(/\D/g, "").length < 8) return `${quien}: el teléfono debe tener al menos 8 dígitos.`;
  return "";
}

/** Problemas de lo elegido en la carta (lista vacía si se puede guardar). */
export function revisarEntrada(e: EntradaPersonasCarta): string[] {
  const p: string[] = [];
  const firmantes = e.firmanteIds.length + e.firmantesNuevos.length;
  if (firmantes === 0) p.push("Elige al menos un firmante de la carta.");
  if (firmantes > MAX_FIRMANTES) p.push(`La carta admite hasta ${MAX_FIRMANTES} firmantes.`);
  e.firmantesNuevos.forEach((f, i) => {
    const r = revisarPersona(f, `Firmante nuevo ${i + 1}`);
    if (r) p.push(r);
  });
  const opciones = [e.supervisorId != null, !!e.supervisorNuevo, e.sinSupervisor].filter(Boolean).length;
  if (opciones !== 1) p.push("Elige el supervisor de la empresa, agrega uno nuevo o indica que no hay supervisor empresarial.");
  if (e.supervisorNuevo) {
    const r = revisarPersona(e.supervisorNuevo, "Supervisor nuevo");
    if (r) p.push(r);
  }
  if (e.sinSupervisor && e.motivoSinSupervisor.trim().length < MIN_MOTIVO) {
    p.push(`Explica por qué no hay supervisor empresarial (al menos ${MIN_MOTIVO} caracteres).`);
  }
  return p;
}

export type EstadoSolicitudCarta = { id: number; estado: "pendiente" | "aprobada" | "rechazada"; datos: DatosSolicitudCarta; motivoRechazo: string | null; fecha: string | null };

export interface EstadoPersonasCarta {
  /** Firmantes y supervisor resueltos o en revisión: el paso se puede dar por hecho. */
  completo: boolean;
  /** Hay una solicitud esperando a la administración: no se puede enviar la propuesta. */
  pendiente: boolean;
  /** Todo validado: se puede enviar. */
  listo: boolean;
}

/** Estado de firmantes y supervisor a partir de la carta guardada y la última solicitud de tipo «carta». */
export function estadoPersonasCarta(
  carta: { firmanteIds?: number[] | null; supervisorId?: number | null; sinSupervisor?: boolean | null } | null | undefined,
  ultima: EstadoSolicitudCarta | null,
): EstadoPersonasCarta {
  const pendiente = ultima?.estado === "pendiente";
  const firmantes = (carta?.firmanteIds?.length ?? 0) > 0 || (pendiente && (ultima!.datos.firmantesNuevos?.length ?? 0) > 0);
  const sinSupValidado = !!carta?.sinSupervisor && ultima?.estado === "aprobada" && !!ultima.datos.sinSupervisor;
  const supervisor =
    carta?.supervisorId != null ||
    (pendiente && (!!ultima!.datos.supervisorNuevo || !!ultima!.datos.sinSupervisor)) ||
    sinSupValidado;
  const completo = firmantes && supervisor;
  return { completo, pendiente, listo: completo && !pendiente };
}

/** Nombre para mostrar de un firmante o supervisor guardado (los nuevos guardan el nombre completo en `nombres`). */
export const nombrePersona = (p: { titulo?: string | null; nombres: string; apellidos?: string | null }) =>
  [p.titulo, p.nombres, p.apellidos].filter((x) => x && x.trim()).join(" ");

/**
 * Nombres y apellidos a partir del nombre completo, para guardarlo en la empresa (el editor de empresas pide los dos):
 * con 2 palabras, 1 y 1; con 3, 1 y 2; con 4 o más, 2 y el resto.
 */
export function dividirNombre(completo: string): { nombres: string; apellidos: string } {
  const p = completo.trim().split(/\s+/).filter(Boolean);
  const n = p.length <= 3 ? 1 : 2;
  return { nombres: p.slice(0, n).join(" "), apellidos: p.slice(n).join(" ") };
}
