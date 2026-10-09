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
  empresa: "DESCRIPCIÓN DE LA EMPRESA",
  actividades: "DESCRIPCIÓN DE LAS ACTIVIDADES REALIZADAS POR EL PASANTE",
  conclusiones: "CONCLUSIONES",
  anexos: "ANEXOS",
  cronograma: "Anexo 1. Cronograma real de desarrollo",
  modificaciones: "Anexo 2. Modificaciones al cronograma original",
  adicional: "Anexo 3. Contenido adicional",
  carta: "Anexo 4. Carta de finalización satisfactoria",
} as const;

/** Encabezado de cada actividad en el informe final: código, título y la fecha estipulada en el cronograma. */
export function tituloActividadFinal(codigo: string, titulo: string, rangoSemana: string | null) {
  return `Actividad ${codigo}. ${titulo}${rangoSemana ? `, desarrollada ${rangoSemana}` : ""}`;
}
