// Origen de las imágenes de una actividad (autoría propia o fuente externa) y su nota al pie según APA 7.
// Módulo puro: servidor y cliente.
import type { SegmentoCita } from "@/lib/citaApa";

export type OrigenImagen = "propia" | "externa";

export const ORIGENES_IMAGEN: { id: OrigenImagen; label: string; ayuda: string }[] = [
  { id: "propia", label: "Autoría propia", ayuda: "Fotografía, captura de pantalla o diagrama elaborado por usted." },
  {
    id: "externa",
    label: "Fuente externa",
    ayuda: "Tomada de internet, de un libro, de un documento de la empresa o de otra fuente que no es de su autoría.",
  },
];

export const AVISO_ORIGEN_IMAGEN =
  "Por tratarse de un documento académico, toda imagen que provenga de internet o que no sea de su autoría debe indicar su fuente. Usar imágenes ajenas sin citarlas se considera plagio.";

/**
 * Imágenes de soporte por semana (la principal de cada actividad más las adicionales). Equilibra la proporción de la
 * rúbrica (30 % de elementos de soporte): unas 1.5 páginas de imágenes por semana, a dos imágenes de 5 x 5 cm por fila.
 */
export const MAX_IMAGENES_SOPORTE_SEMANA = 9;

/** Toda actividad lleva su imagen principal, así que el límite nunca es menor que el número de actividades de la semana. */
export function limiteImagenesSemana(actividadesSemana: number) {
  return Math.max(MAX_IMAGENES_SOPORTE_SEMANA, actividadesSemana);
}

export interface FuenteImagen {
  /** "tomada": se reproduce tal cual; "adaptada": se modificó a partir del original. */
  uso: "tomada" | "adaptada";
  autor: string;
  anio: string;
  titulo: string;
  sitio: string;
  url: string;
}

export function fuenteImagenVacia(): FuenteImagen {
  return { uso: "tomada", autor: "", anio: "", titulo: "", sitio: "", url: "" };
}

export function leerOrigenImagen(valor: unknown): OrigenImagen | null {
  return valor === "propia" || valor === "externa" ? valor : null;
}

export function leerFuenteImagen(valor: unknown): FuenteImagen | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Partial<FuenteImagen>;
  const texto = (x: unknown) => (typeof x === "string" ? x : "");
  return {
    uso: v.uso === "adaptada" ? "adaptada" : "tomada",
    autor: texto(v.autor),
    anio: texto(v.anio),
    titulo: texto(v.titulo),
    sitio: texto(v.sitio),
    url: texto(v.url),
  };
}

const limpiar = (s: string) => s.trim().replace(/\s+/g, " ");
const sinPuntoFinal = (s: string) => limpiar(s).replace(/[.\s]+$/, "");

/** Problemas del origen de una imagen; vacía si es válido. */
export function validarOrigenImagen(origen: unknown, fuente: unknown): string[] {
  const o = leerOrigenImagen(origen);
  if (!o) return ["Indique el origen de la imagen (autoría propia o fuente externa)."];
  if (o === "propia") return [];
  const f = leerFuenteImagen(fuente) ?? fuenteImagenVacia();
  const problemas: string[] = [];
  if (!limpiar(f.autor)) problemas.push("Indique el autor u organización de la imagen.");
  if (!/^(\d{4}|s\.f\.)$/.test(limpiar(f.anio))) problemas.push('Indique el año de la imagen (4 dígitos o "s.f.").');
  if (sinPuntoFinal(f.titulo).length < 3) problemas.push("Indique el título de la imagen o de la página de donde se obtuvo.");
  const url = limpiar(f.url);
  if (!url && !limpiar(f.sitio)) problemas.push("Indique el sitio web o la publicación de donde se obtuvo la imagen.");
  if (url && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(url)) problemas.push("La URL de la imagen debe iniciar con https://.");
  return problemas;
}

/**
 * Nota que acompaña la imagen en el informe (APA 7). Autoría propia: "Nota. Elaboración propia." (APA no exige atribuir
 * las figuras propias, pero la nota deja claro el origen). Fuente externa:
 * "Nota. Tomado de *Título*, por Autor, Año, Sitio (URL)." o "Adaptado de ..." si la imagen se modificó.
 */
export function notaImagen(origen: unknown, fuente: unknown): SegmentoCita[] {
  const o = leerOrigenImagen(origen);
  if (!o) return [];
  if (o === "propia") return [{ texto: "Nota. Elaboración propia." }];
  const f = leerFuenteImagen(fuente) ?? fuenteImagenVacia();
  // APA 7: el nombre del sitio se omite cuando coincide con el autor.
  const sitio = sinPuntoFinal(f.sitio) === sinPuntoFinal(f.autor) ? "" : sinPuntoFinal(f.sitio);
  const url = limpiar(f.url);
  return [
    { texto: `Nota. ${f.uso === "adaptada" ? "Adaptado" : "Tomado"} de ` },
    { texto: sinPuntoFinal(f.titulo), cursiva: true },
    { texto: `, por ${sinPuntoFinal(f.autor)}, ${limpiar(f.anio) || "s.f."}${sitio ? `, ${sitio}` : ""}${url ? ` (${url})` : ""}.` },
  ];
}

export function textoNotaImagen(origen: unknown, fuente: unknown) {
  return notaImagen(origen, fuente)
    .map((s) => s.texto)
    .join("");
}
