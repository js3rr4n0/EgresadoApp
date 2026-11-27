// Rechazo por requisitos (specs/REVISAR_PROPUESTA_ADMIN.md, A2). Módulo puro: motivos, validación y quién puede rechazar.
//
// Respuestas del usuario: la administración revisa la estructura y los requisitos previos **solo antes de asignar**
// (propuesta enviada, sin coordinador ni asesor). El coordinador hace lo mismo mientras la tiene para asignar asesor
// (coordinador asignado, sin asesor que haya aceptado). El contenido lo revisa el asesor.

export interface MotivoRechazo {
  clave: string;
  texto: string;
  /** El motivo se marca por integrante (documentos de soporte). */
  porIntegrante?: boolean;
}

export const MOTIVOS_RECHAZO: MotivoRechazo[] = [
  { clave: "doc_inscripcion", texto: "Comprobante de inscripción incorrecto (por ejemplo, se subió el recibo de pago en lugar de la hoja de inscripción)", porIntegrante: true },
  { clave: "doc_servicio", texto: "Constancia de servicio social incorrecta o ilegible", porIntegrante: true },
  { clave: "doc_notas", texto: "Certificación global de notas incorrecta o ilegible", porIntegrante: true },
  { clave: "carta", texto: "Carta de aceptación incorrecta o incompleta" },
  { clave: "firma", texto: "La firma de la carta no coincide con la persona registrada en la empresa" },
  { clave: "empresa", texto: "Datos de la empresa, de los firmantes o del supervisor incorrectos" },
  { clave: "estructura", texto: "La propuesta no cumple la estructura o los requisitos de la ficha" },
  { clave: "otro", texto: "Otro motivo (explícalo en el mensaje)" },
];

export const MIN_MENSAJE_RECHAZO = 20;

export interface MotivoMarcado {
  clave: string;
  integranteId?: number;
}

export interface EntradaRechazo {
  motivos: MotivoMarcado[];
  mensaje: string;
}

/** Problemas de lo marcado (lista vacía si se puede rechazar). */
export function revisarRechazo(e: EntradaRechazo, integrantesIds: number[]): string[] {
  const p: string[] = [];
  if (!e.motivos.length) p.push("Marca al menos un motivo.");
  for (const m of e.motivos) {
    const def = MOTIVOS_RECHAZO.find((x) => x.clave === m.clave);
    if (!def) p.push("Hay un motivo que no existe.");
    else if (def.porIntegrante && (m.integranteId == null || !integrantesIds.includes(m.integranteId))) {
      p.push(`Indica de qué integrante es: «${def.texto.split(" (")[0]}».`);
    }
  }
  if (e.mensaje.trim().length < MIN_MENSAJE_RECHAZO) p.push(`Escribe el mensaje al egresado (al menos ${MIN_MENSAJE_RECHAZO} caracteres).`);
  return p;
}

/** Texto de un motivo marcado, con el nombre del integrante cuando aplica. */
export function textoMotivo(m: MotivoMarcado, nombres: Record<number, string>): string {
  const def = MOTIVOS_RECHAZO.find((x) => x.clave === m.clave);
  const base = def ? def.texto.split(" (")[0] : m.clave;
  return m.integranteId != null && nombres[m.integranteId] ? `${base}: ${nombres[m.integranteId]}` : base;
}

export type FuncionRechazo = "administracion" | "coordinador";

/** ¿Está la propuesta en el momento en que esa función puede rechazarla? */
export function puedeRechazarEnEstado(
  funcion: FuncionRechazo,
  p: { estado: string; coordinadorId: number | null; asesorId: number | null },
): boolean {
  if (p.asesorId != null) return false;
  if (funcion === "administracion") return p.estado === "enviada" && p.coordinadorId == null;
  return p.estado === "coordinador_asignado";
}
