// Estructura del informe final de pasantía ("Estructura general informe de pasantía" y "Métrica y composición del informe
// final"). Módulo puro: lo usan las acciones, la vista de impresión y el documento Word.
import { contarPalabras, normalizarTexto, parrafosDe } from "@/lib/reglasRegistroActividad";

/** Hoja de autoridades académicas (formato "AUTORIDADES ACADÉMICAS"). */
export const AUTORIDADES_ACADEMICAS: { nombre: string; cargo: string }[] = [
  { nombre: "MONSEÑOR Y LICENCIADO MIGUEL ÁNGEL MORÁN AQUINO", cargo: "RECTOR" },
  { nombre: "DOCTOR MOISÉS ANTONIO MARTÍNEZ ZALDÍVAR", cargo: "VICERRECTOR" },
  { nombre: "MAESTRO MOISÉS ULISES GARCÍA PERDIDO", cargo: "SECRETARIO GENERAL" },
  { nombre: "DOCTOR MAURICIO ERNESTO VELÁSQUEZ SORIANO", cargo: "DECANO DE LA FACULTAD DE INGENIERÍA Y ARQUITECTURA" },
];

// ── Agradecimientos: opcionales, en una sola página (máximo 4 párrafos) ──
export const MAX_PARRAFOS_AGRADECIMIENTOS = 4;
/** Una página con el formato oficial (31 líneas de unas 14 palabras, menos el título y el espacio entre párrafos). */
export const MAX_PALABRAS_AGRADECIMIENTOS = 350;

export function validarAgradecimientos(texto: string): string[] {
  const limpio = normalizarTexto(texto);
  if (!limpio) return [];
  const problemas: string[] = [];
  const parrafos = parrafosDe(limpio).length;
  if (parrafos > MAX_PARRAFOS_AGRADECIMIENTOS) {
    problemas.push(`Los agradecimientos admiten como máximo ${MAX_PARRAFOS_AGRADECIMIENTOS} párrafos (tiene ${parrafos}).`);
  }
  const palabras = contarPalabras(limpio);
  if (palabras > MAX_PALABRAS_AGRADECIMIENTOS) {
    problemas.push(`Los agradecimientos deben caber en una página: máximo ${MAX_PALABRAS_AGRADECIMIENTOS} palabras (tiene ${palabras}).`);
  }
  return problemas;
}

// ── Carta de finalización satisfactoria: imagen emitida por la empresa, que sube el egresado y verifica el asesor ──
export interface CartaFinalizacion {
  url: string;
  nombre: string;
  subidaEn: string;
}

export function leerCartaFinalizacion(valor: unknown): CartaFinalizacion | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Partial<CartaFinalizacion>;
  return typeof v.url === "string" && v.url ? { url: v.url, nombre: v.nombre || "Carta de finalización", subidaEn: v.subidaEn || "" } : null;
}

export const AYUDA_CARTA_FINALIZACION =
  "Carta emitida por la empresa en su papelería oficial, firmada por quien emitió la carta de aceptación, en la que expresa su grado de satisfacción con el desempeño del pasante. No es una constancia de asistencia ni de aprobación del proceso.";

// ── Cronograma real de desarrollo y modificaciones al cronograma original (anexos) ──
export const ETIQUETA_CAMBIO: Record<string, string> = {
  agregar: "Agregada",
  modificar: "Modificada",
  eliminar: "Eliminada",
  posponer: "Pospuesta",
  reubicar: "Reubicada",
};

export const ETIQUETA_TIPO_SOLICITUD: Record<string, string> = {
  agregar: "Agregar actividad",
  modificar: "Modificar actividad",
  eliminar: "Eliminar actividad",
  posponer: "Posponer actividad",
  reubicar: "Reubicar actividad",
};

/** Títulos de los apartados del informe final, en su orden. */
export const APARTADOS_FINAL = {
  autoridades: "AUTORIDADES ACADÉMICAS",
  agradecimientos: "AGRADECIMIENTOS",
  indice: "ÍNDICE DE CONTENIDOS",
  indiceImagenes: "ÍNDICE DE IMÁGENES, FOTOGRAFÍAS E ILUSTRACIONES",
  introduccion: "INTRODUCCIÓN",
  empresa: "DESCRIPCIÓN DE LA EMPRESA",
  actividades: "DESCRIPCIÓN DE LAS ACTIVIDADES REALIZADAS POR EL PASANTE",
  conclusiones: "CONCLUSIONES",
  anexos: "ANEXOS",
} as const;

/** Encabezado de cada actividad en el informe final: código, título y la fecha estipulada en el cronograma. */
export function tituloActividadFinal(codigo: string, titulo: string, rangoSemana: string | null) {
  return `Actividad ${codigo}. ${titulo}${rangoSemana ? `, desarrollada ${rangoSemana}` : ""}`;
}

// ── Introducción: cuatro párrafos de no más de cinco renglones cada uno (criterios de la reunión del 16-oct-2026) ──
export const AVISO_INTRODUCCION =
  "Son cuatro párrafos de no más de cinco renglones cada uno: específicos, breves y consistentes, sin retórica, sin autopromoción y sin comerciales.";

export const PARRAFOS_INTRODUCCION: { titulo: string; indicacion: string }[] = [
  {
    titulo: "Párrafo 1: selección de la empresa o institución",
    indicacion:
      "Conteste por qué seleccionó a la empresa o institución para realizar su pasantía y qué características la hacen idónea. Redacte en presente, con el enfoque 100 % en la empresa.",
  },
  {
    titulo: "Párrafo 2: lo que esperaba lograr",
    indicacion:
      "Conteste qué esperaba lograr, ganar u obtener al realizar su pasantía en esta empresa o institución. Redacte en futuro, con el enfoque 100 % en usted como egresado.",
  },
  {
    titulo: "Párrafo 3: actividades asignadas",
    indicacion:
      "Indique, sin describir (para eso está el documento), qué actividades le fueron asignadas, cuáles desarrolló y en cuáles participó o se involucró. Redacción puntual, corrida y en pasado, con el enfoque 100 % en las actividades.",
  },
  {
    titulo: "Párrafo 4: cómo se documentaron las actividades",
    indicacion:
      "Describa cómo se documentaron las actividades en este informe. No se trata de lo que piensa que obtuvo: fundaméntese en los elementos que se encuentran documentados y en cómo se documentaron.",
  },
];

/** Cinco renglones con el formato oficial (Times New Roman 12, unas 14 palabras por renglón). */
export const MAX_PALABRAS_PARRAFO_INTRODUCCION = 70;
export const MIN_PALABRAS_PARRAFO_INTRODUCCION = 20;

/** Lee la introducción guardada (jsonb): siempre cuatro textos. */
export function leerIntroduccion(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor : [];
  return PARRAFOS_INTRODUCCION.map((_, i) => (typeof lista[i] === "string" ? (lista[i] as string) : ""));
}

export function introduccionCompleta(parrafos: string[]) {
  return parrafos.length === PARRAFOS_INTRODUCCION.length && parrafos.every((p) => p.trim().length > 0);
}

/** Reglas de cada párrafo: un solo párrafo, entre 20 y 70 palabras (no más de cinco renglones) y punto final. */
export function validarParrafoIntroduccion(texto: string, indice: number): string[] {
  const t = normalizarTexto(texto);
  const etiqueta = `Párrafo ${indice + 1} de la introducción`;
  if (!t) return [`${etiqueta}: es obligatorio.`];
  const problemas: string[] = [];
  if (parrafosDe(t).length > 1) problemas.push(`${etiqueta}: debe ser un solo párrafo, sin saltos de línea.`);
  const n = contarPalabras(t);
  if (n < MIN_PALABRAS_PARRAFO_INTRODUCCION || n > MAX_PALABRAS_PARRAFO_INTRODUCCION) {
    problemas.push(
      `${etiqueta}: debe tener entre ${MIN_PALABRAS_PARRAFO_INTRODUCCION} y ${MAX_PALABRAS_PARRAFO_INTRODUCCION} palabras, unos cinco renglones (tiene ${n}).`
    );
  }
  if (!/\.["”»)]?$/.test(t)) problemas.push(`${etiqueta}: debe terminar con punto.`);
  return problemas;
}

export function validarIntroduccion(parrafos: string[]): string[] {
  return PARRAFOS_INTRODUCCION.flatMap((_, i) => validarParrafoIntroduccion(parrafos[i] ?? "", i));
}

// ── Anexos del informe final (reunión del 16-oct-2026). El glosario es opcional: si el egresado no lo registra, la carta
// de finalización pasa a ser el anexo 6. ──
export type AnexoFinal = "cronogramaReal" | "modificaciones" | "cronogramaFinal" | "adicional" | "bibliografia" | "glosario" | "carta";

const NOMBRES_ANEXOS: Record<AnexoFinal, string> = {
  cronogramaReal: "Cronograma real de desarrollo",
  modificaciones: "Bitácora de modificaciones al cronograma",
  cronogramaFinal: "Cronograma final ejecutado",
  adicional: "Contenido adicional",
  bibliografia: "Bibliografía",
  glosario: "Glosario de términos",
  carta: "Carta de finalización satisfactoria",
};

/** Anexos en su orden, numerados: «Anexo 1. Cronograma real de desarrollo», etc. */
export function anexosFinal(conGlosario: boolean): { id: AnexoFinal; titulo: string }[] {
  const orden: AnexoFinal[] = ["cronogramaReal", "modificaciones", "cronogramaFinal", "adicional", "bibliografia"];
  if (conGlosario) orden.push("glosario");
  orden.push("carta");
  return orden.map((id, i) => ({ id, titulo: `Anexo ${i + 1}. ${NOMBRES_ANEXOS[id]}` }));
}

// ── Glosario de términos (opcional): lo registra el egresado ──
export interface TerminoGlosario {
  termino: string;
  definicion: string;
}

export const MAX_TERMINOS_GLOSARIO = 40;
export const MAX_CARACTERES_TERMINO = 60;
export const MAX_PALABRAS_DEFINICION = 60;

export function leerGlosario(valor: unknown): TerminoGlosario[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((t): t is TerminoGlosario => !!t && typeof t === "object" && typeof t.termino === "string" && typeof t.definicion === "string")
    .map((t) => ({ termino: t.termino, definicion: t.definicion }));
}

/** Términos ordenados alfabéticamente, como se presentan en el anexo. */
export function glosarioOrdenado(terminos: TerminoGlosario[]) {
  return [...terminos].sort((a, b) => a.termino.localeCompare(b.termino, "es", { sensitivity: "base" }));
}

export function validarGlosario(terminos: TerminoGlosario[]): string[] {
  const problemas: string[] = [];
  if (terminos.length > MAX_TERMINOS_GLOSARIO) problemas.push(`El glosario admite como máximo ${MAX_TERMINOS_GLOSARIO} términos.`);
  const vistos = new Set<string>();
  terminos.forEach((t, i) => {
    const etiqueta = t.termino.trim() || `Término ${i + 1}`;
    if (!t.termino.trim()) problemas.push(`Término ${i + 1}: indique el término.`);
    else if (t.termino.trim().length > MAX_CARACTERES_TERMINO) problemas.push(`${etiqueta}: máximo ${MAX_CARACTERES_TERMINO} caracteres.`);
    const clave = t.termino.trim().toLocaleLowerCase("es");
    if (clave && vistos.has(clave)) problemas.push(`${etiqueta}: el término está repetido.`);
    vistos.add(clave);
    const palabras = contarPalabras(normalizarTexto(t.definicion));
    if (palabras === 0) problemas.push(`${etiqueta}: escriba su definición.`);
    else if (palabras > MAX_PALABRAS_DEFINICION) problemas.push(`${etiqueta}: la definición admite como máximo ${MAX_PALABRAS_DEFINICION} palabras.`);
  });
  return problemas;
}
