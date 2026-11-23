// Contenido del documento final y del informe de período de pasantía desde la ficha (entrega W3,
// specs/fichas/PASANTIA_FICHA.md). Módulo puro.
//
// Documento final: la hoja de agradecimientos (opcional), los capítulos y los anexos. El administrador puede cambiar el
// título de cada uno, quitar los que no son obligatorios, cambiar el orden y agregar capítulos de texto que redacta el
// egresado. Sin configuración en la ficha (fase 1), es la estructura de siempre.
// Informe de período: el cronograma del período y los cambios al cronograma se pueden quitar o renombrar.

import { APARTADOS_FINAL, type AnexoFinal } from "../informeFinal";

export type ClaveCapituloSistema = "introduccion" | "empresa" | "actividades" | "conclusiones";
export const PREFIJO_EXTRA = "extra:";

export interface CapituloDocFinal {
  /** Un capítulo del sistema o uno de texto que agrega el administrador ("extra:<id>"). */
  clave: ClaveCapituloSistema | `extra:${string}`;
  titulo: string;
  activo: boolean;
  /** Solo los de texto: indicación para el egresado y palabras mínimas y máximas (0 = sin límite). */
  ayuda?: string;
  minPalabras?: number;
  maxPalabras?: number;
}

export interface AnexoDocFinal {
  clave: AnexoFinal;
  titulo: string;
  activo: boolean;
}

export interface ConfigDocumentoFinal {
  agradecimientos: boolean;
  capitulos: CapituloDocFinal[];
  anexos: AnexoDocFinal[];
}

export interface ConfigInformePeriodo {
  cronograma: { activo: boolean; titulo: string };
  cambios: { activo: boolean; titulo: string };
}

const NOMBRES_ANEXOS: Record<AnexoFinal, string> = {
  cronogramaReal: "Cronograma real de desarrollo",
  modificaciones: "Bitácora de modificaciones al cronograma",
  cronogramaFinal: "Cronograma final ejecutado",
  adicional: "Contenido adicional",
  bibliografia: "Bibliografía",
  glosario: "Glosario de términos",
  carta: "Carta de finalización satisfactoria",
};

/** Capítulos del sistema que no se pueden quitar. */
export const CAPITULOS_OBLIGATORIOS: ClaveCapituloSistema[] = ["actividades"];

export const NOMBRE_CAPITULO: Record<ClaveCapituloSistema, string> = {
  introduccion: "Introducción (cuatro párrafos que redacta el egresado)",
  empresa: "Descripción de la empresa (sale del catálogo de empresas)",
  actividades: "Actividades realizadas (los registros de la ejecución)",
  conclusiones: "Conclusiones (las conclusiones técnicas de las actividades)",
};

export const NOMBRE_ANEXO: Record<AnexoFinal, string> = {
  cronogramaReal: "Cronograma real, con las firmas",
  modificaciones: "Bitácora de modificaciones",
  cronogramaFinal: "Cronograma final ejecutado",
  adicional: "Imágenes de anexo de las actividades",
  bibliografia: "Referencias de los marcos teóricos",
  glosario: "Glosario (solo si el egresado registra términos)",
  carta: "Carta de finalización (la verifica el asesor)",
};

/** La estructura de la fase 1. */
export function configFinalFase1(): ConfigDocumentoFinal {
  return {
    agradecimientos: true,
    capitulos: (["introduccion", "empresa", "actividades", "conclusiones"] as const).map((clave) => ({ clave, titulo: APARTADOS_FINAL[clave], activo: true })),
    anexos: (Object.keys(NOMBRES_ANEXOS) as AnexoFinal[]).map((clave) => ({ clave, titulo: NOMBRES_ANEXOS[clave], activo: true })),
  };
}

export function configPeriodoFase1(): ConfigInformePeriodo {
  return {
    cronograma: { activo: true, titulo: "Cronograma de actividades del período" },
    cambios: { activo: true, titulo: "Cambios al cronograma" },
  };
}

const texto = (v: unknown, porDefecto: string) => (typeof v === "string" && v.trim() ? v.trim() : porDefecto);
const entero = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);

/** Lee la configuración guardada en la ficha; lo que falte o esté dañado toma el valor de la fase 1. */
export function leerConfigFinal(v: unknown): ConfigDocumentoFinal {
  const base = configFinalFase1();
  if (!v || typeof v !== "object") return base;
  const c = v as Partial<ConfigDocumentoFinal>;
  const sistema = new Set<string>(base.capitulos.map((x) => x.clave));
  const capitulos: CapituloDocFinal[] = [];
  for (const x of Array.isArray(c.capitulos) ? c.capitulos : []) {
    if (!x || typeof x.clave !== "string" || capitulos.some((y) => y.clave === x.clave)) continue;
    if (sistema.has(x.clave)) {
      const clave = x.clave as ClaveCapituloSistema;
      capitulos.push({ clave, titulo: texto(x.titulo, APARTADOS_FINAL[clave]), activo: CAPITULOS_OBLIGATORIOS.includes(clave) || x.activo !== false });
    } else if (x.clave.startsWith(PREFIJO_EXTRA) && x.clave.length > PREFIJO_EXTRA.length) {
      capitulos.push({ clave: x.clave as `extra:${string}`, titulo: texto(x.titulo, "Capítulo"), activo: x.activo !== false, ayuda: typeof x.ayuda === "string" ? x.ayuda : "", minPalabras: entero(x.minPalabras), maxPalabras: entero(x.maxPalabras) });
    }
  }
  // Los capítulos del sistema que falten se agregan al final, activos (no se pierde nada por una configuración vieja).
  for (const x of base.capitulos) if (!capitulos.some((y) => y.clave === x.clave)) capitulos.push(x);
  const anexos: AnexoDocFinal[] = [];
  for (const x of Array.isArray(c.anexos) ? c.anexos : []) {
    if (!x || !(x.clave in NOMBRES_ANEXOS) || anexos.some((y) => y.clave === x.clave)) continue;
    anexos.push({ clave: x.clave, titulo: texto(x.titulo, NOMBRES_ANEXOS[x.clave]), activo: x.activo !== false });
  }
  for (const x of base.anexos) if (!anexos.some((y) => y.clave === x.clave)) anexos.push(x);
  return { agradecimientos: c.agradecimientos !== false, capitulos, anexos };
}

export function leerConfigPeriodo(v: unknown): ConfigInformePeriodo {
  const base = configPeriodoFase1();
  if (!v || typeof v !== "object") return base;
  const c = v as Partial<ConfigInformePeriodo>;
  const parte = (x: unknown, b: { activo: boolean; titulo: string }) =>
    x && typeof x === "object" ? { activo: (x as { activo?: unknown }).activo !== false, titulo: texto((x as { titulo?: unknown }).titulo, b.titulo) } : b;
  return { cronograma: parte(c.cronograma, base.cronograma), cambios: parte(c.cambios, base.cambios) };
}

/** Estructura del documento: los capítulos activos en orden y los anexos activos numerados (el glosario, si hay términos). */
export function estructuraFinal(config: ConfigDocumentoFinal, conGlosario: boolean) {
  const capitulos = config.capitulos.filter((c) => c.activo);
  const anexos = config.anexos
    .filter((a) => a.activo && (a.clave !== "glosario" || conGlosario))
    .map((a, i) => ({ id: a.clave, titulo: `Anexo ${i + 1}. ${a.titulo}` }));
  return { agradecimientos: config.agradecimientos, capitulos, anexos };
}

export const esCapituloExtra = (clave: string): clave is `extra:${string}` => clave.startsWith(PREFIJO_EXTRA);

/** Texto de los capítulos extra que redactó el egresado ({ [clave]: texto }). */
export function leerApartadosExtra(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string") as [string, string][]);
}

/** Problemas de un capítulo extra (palabras mínimas y máximas). */
export function problemasCapituloExtra(c: CapituloDocFinal, textoCap: string, contar: (t: string) => number): string[] {
  const n = contar(textoCap.trim());
  const min = c.minPalabras ?? 0;
  const max = c.maxPalabras ?? 0;
  if (!textoCap.trim()) return [`Debe redactar «${c.titulo}».`];
  if (min > 0 && n < min) return [`«${c.titulo}» debe tener al menos ${min} palabras (tiene ${n}).`];
  if (max > 0 && n > max) return [`«${c.titulo}» admite como máximo ${max} palabras (tiene ${n}).`];
  return [];
}

/** Problemas de la configuración para el constructor. */
export function problemasConfigFinal(c: ConfigDocumentoFinal): string[] {
  const p: string[] = [];
  for (const x of c.capitulos) {
    if (!x.titulo.trim()) p.push("hay un capítulo sin título.");
    if (esCapituloExtra(x.clave) && (x.maxPalabras ?? 0) > 0 && (x.minPalabras ?? 0) > (x.maxPalabras ?? 0)) p.push(`el capítulo «${x.titulo}» tiene más palabras mínimas que máximas.`);
  }
  if (!c.capitulos.some((x) => x.clave === "actividades" && x.activo)) p.push("el capítulo de actividades es obligatorio.");
  if (c.anexos.some((x) => !x.titulo.trim())) p.push("hay un anexo sin título.");
  return p;
}
