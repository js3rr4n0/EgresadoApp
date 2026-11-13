// Informe final por capítulos (entrega I5, investigación): reglas compartidas por el servidor y la pantalla. Módulo puro.
// Es el documento final de la investigación (la tesis): todo el equipo redacta, cada guardado es una versión nueva,
// el asesor revisa por capítulo (o el documento completo) y al final todos ratifican la versión que se entrega.
import { precargaEspacio, problemasProtocolo, type DatosPropuestaPrecarga } from "./protocolo";
import { PRECARGA_MARCO_REGISTROS, type Espacio, type EtapaInformeFinal } from "./tipos";
import { guardarComoTexto, leerApartado, parteVacia, tipoApartado } from "./apartadosAcademicos";

/** Un capítulo sin contenido: texto vacío, lista vacía o apartado académico con todos sus subapartados vacíos. */
export function contenidoVacio(e: Espacio, contenido: string | null | undefined): boolean {
  const v = (contenido ?? "").trim();
  if (!v || v === "[]") return true;
  const tipo = e.elemento === "apartado" ? tipoApartado(e) : undefined;
  if (!tipo) return false;
  const c = leerApartado(tipo, v);
  return tipo.partes.every((p) => parteVacia(p, c.partes[p.id]));
}

export type EstadoCapitulo = "borrador" | "enviado" | "observado" | "aprobado";
export type EstadoInformeFinal = "redactando" | "entregado" | "aprobado";

export interface EstadoDeCapitulo {
  estado: EstadoCapitulo;
  /** Número de versión que se envió o se aprobó. */
  version: number | null;
  comentario: string | null;
  enviadoEn: string | null;
  revisadoEn: string | null;
  /** Último integrante que estuvo editando (se renueva con el guardado automático). */
  editando: { usuarioId: number; nombre: string; desde: string } | null;
}

export const CAPITULO_NUEVO: EstadoDeCapitulo = { estado: "borrador", version: null, comentario: null, enviadoEn: null, revisadoEn: null, editando: null };

/** Minutos durante los que se avisa que otro integrante está editando un capítulo. */
export const MINUTOS_EDITANDO = 2;

/** Lee el estado guardado (jsonb) de forma segura. */
export function leerCapitulos(x: unknown): Record<string, EstadoDeCapitulo> {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const r: Record<string, EstadoDeCapitulo> = {};
  for (const [k, v] of Object.entries(x as Record<string, Partial<EstadoDeCapitulo>>)) r[k] = { ...CAPITULO_NUEVO, ...v };
  return r;
}

/** El equipo puede modificar el capítulo ahora. */
export function capituloEditable(estadoInforme: string, cap: EstadoDeCapitulo): boolean {
  return estadoInforme === "redactando" && (cap.estado === "borrador" || cap.estado === "observado");
}

/** Otro integrante editó el capítulo hace poco (para el aviso). */
export function editandoOtro(cap: EstadoDeCapitulo, miId: number, ahora = new Date()): EstadoDeCapitulo["editando"] {
  const e = cap.editando;
  if (!e || e.usuarioId === miId) return null;
  return ahora.getTime() - new Date(e.desde).getTime() < MINUTOS_EDITANDO * 60_000 ? e : null;
}

/** Marco teórico registrado en las actividades, en el orden del plan, para precargar el capítulo. */
export function textoMarcoRegistros(registros: { codigo: string; titulo: string; marco: string }[]): string {
  return registros
    .filter((r) => r.marco.trim())
    .map((r) => `${r.codigo} ${r.titulo}\n${r.marco.trim()}`)
    .join("\n\n");
}

/**
 * Contenido inicial de un capítulo que todavía no tiene versiones: de la propuesta, del protocolo (sus respuestas están
 * en datos.respuestas) o del marco teórico de los registros. Las listas se copian tal cual (JSON).
 */
export function precargaCapitulo(
  e: Espacio,
  fuentes: Espacio[],
  datos: DatosPropuestaPrecarga,
  marcoRegistros: string
): string {
  if (!e.precargarDe) return "";
  if (e.precargarDe === PRECARGA_MARCO_REGISTROS) {
    if (e.elemento === "texto") return marcoRegistros;
    // Apartado académico: el marco de las actividades queda en su primer subapartado.
    const tipo = e.elemento === "apartado" && marcoRegistros.trim() ? tipoApartado(e) : undefined;
    return tipo ? guardarComoTexto(leerApartado(tipo, marcoRegistros)) : "";
  }
  return precargaEspacio(e, fuentes, datos);
}

/** Pendientes del informe por capítulo (contenido de la última versión de cada uno). */
export function problemasInformeFinal(etapa: EtapaInformeFinal, contenidos: Record<string, string | null | undefined>) {
  return problemasProtocolo(etapa, contenidos);
}

/** Capítulos que faltan aprobar para poder ratificar y entregar (los opcionales vacíos no cuentan). */
export function capitulosPendientes(etapa: EtapaInformeFinal, estados: Record<string, EstadoDeCapitulo>, contenidos: Record<string, string | null | undefined>) {
  return etapa.espacios.filter((e) => {
    const vacio = contenidoVacio(e, contenidos[e.id]);
    if (!e.obligatorio && vacio) return false;
    return (estados[e.id]?.estado ?? "borrador") !== "aprobado";
  });
}

export const ETIQUETA_ESTADO_CAPITULO: Record<EstadoCapitulo, string> = {
  borrador: "En redacción",
  enviado: "En revisión del asesor",
  observado: "Con observaciones",
  aprobado: "Aprobado",
};
