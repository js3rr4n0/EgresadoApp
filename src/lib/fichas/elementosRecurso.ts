// Elementos "recurso" del catálogo (reunión 6-nov-2026, catálogo ampliado, parte 1): imagen, archivo, enlace y lista.
// La respuesta se guarda en respuestas_espacios.contenido como JSON (una lista de elementos). Módulo puro: reglas,
// lectura y validación compartidas por el asistente, el servidor y la vista previa.
import type { ClaveElemento, Espacio } from "./tipos";

export const ELEMENTOS_RECURSO = ["imagen", "archivo", "enlace", "lista"] as const;
export type ElementoRecurso = (typeof ELEMENTOS_RECURSO)[number];
export const esRecurso = (c: ClaveElemento): c is ElementoRecurso => (ELEMENTOS_RECURSO as readonly string[]).includes(c);

export const TIPOS_ARCHIVO = [
  { valor: "pdf", etiqueta: "PDF", mime: ["application/pdf"] },
  { valor: "word", etiqueta: "Word (.docx)", mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { valor: "excel", etiqueta: "Excel (.xlsx)", mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  { valor: "presentacion", etiqueta: "PowerPoint (.pptx)", mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] },
  { valor: "zip", etiqueta: "Comprimido (.zip)", mime: ["application/zip", "application/x-zip-compressed"] },
];

export interface ImagenEspacio { url: string; leyenda: string; origen: string | null; fuente: unknown }
export interface ArchivoEspacio { url: string; nombre: string; tipo: string }
export interface EnlaceEspacio { url: string; descripcion: string }

/** Respuesta leída del JSON guardado; si no se puede leer, vacía. */
export function leerItems(elemento: ElementoRecurso, contenido: string | null | undefined): unknown[] {
  if (!contenido) return [];
  try {
    const v = JSON.parse(contenido);
    if (!Array.isArray(v)) return [];
    if (elemento === "lista") return v.filter((x) => typeof x === "string");
    return v.filter((x) => x && typeof x === "object" && typeof x.url === "string");
  } catch {
    return [];
  }
}

const num = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) ? v : def);

/** Cantidad mínima y máxima que pide el espacio (los nombres del parámetro cambian según el elemento). */
export function limitesRecurso(e: Espacio): { min: number; max: number } {
  const p = e.parametros;
  return { min: num(p.minimo, 1), max: num(p.maximo, 1) };
}

const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export const enlaceValido = (t: string) => {
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

/** Problemas de la respuesta frente a las reglas del espacio. */
export function problemasRecurso(e: Espacio & { elemento: ElementoRecurso }, items: unknown[]): string[] {
  const p: string[] = [];
  const { min, max } = limitesRecurso(e);
  const nombre = { imagen: "imagen(es)", archivo: "archivo(s)", enlace: "enlace(s)", lista: "elemento(s)" }[e.elemento];
  if (e.obligatorio && items.length < Math.max(1, min)) p.push(`"${e.titulo}" necesita al menos ${Math.max(1, min)} ${nombre}.`);
  else if (items.length > 0 && items.length < min) p.push(`"${e.titulo}" necesita al menos ${min} ${nombre}.`);
  if (max > 0 && items.length > max) p.push(`"${e.titulo}" admite como máximo ${max} ${nombre}.`);
  if (e.elemento === "lista") {
    const maxPal = num(e.parametros.maxPalabrasElemento, 0);
    (items as string[]).forEach((t, i) => {
      if (!t.trim()) p.push(`El elemento ${i + 1} de "${e.titulo}" está vacío.`);
      else if (maxPal > 0 && palabras(t) > maxPal) p.push(`El elemento ${i + 1} de "${e.titulo}" pasa de ${maxPal} palabras.`);
    });
  }
  if (e.elemento === "enlace") {
    (items as EnlaceEspacio[]).forEach((x, i) => {
      if (!enlaceValido(x.url)) p.push(`El enlace ${i + 1} de "${e.titulo}" no es una dirección válida.`);
      if (!x.descripcion?.trim()) p.push(`El enlace ${i + 1} de "${e.titulo}" no tiene descripción.`);
    });
  }
  return p;
}

/** El paso está completo para avanzar en el asistente. */
export function recursoCompleto(e: Espacio & { elemento: ElementoRecurso }, contenido: string | null | undefined) {
  const items = leerItems(e.elemento, contenido);
  if (!e.obligatorio && items.length === 0) return true;
  return problemasRecurso(e, items).length === 0;
}

/** Reglas en frases cortas, como las lee el egresado (vista previa y asistente). */
export function reglasRecurso(e: Espacio & { elemento: ElementoRecurso }): string[] {
  const { min, max } = limitesRecurso(e);
  const cant = (s: string) => (min > 0 && max > 0 && min !== max ? `De ${min} a ${max} ${s}.` : max > 0 ? `${max === min ? "" : "Hasta "}${max} ${s}.` : `Al menos ${min} ${s}.`);
  switch (e.elemento) {
    case "imagen":
      return [cant("imagen(es) PNG o JPG"), "Cada imagen lleva su pie" + (e.parametros.pedirOrigen === false ? "." : " y su origen (autoría propia o fuente citada).")];
    case "archivo": {
      const tipos = (Array.isArray(e.parametros.tipos) ? e.parametros.tipos : []).map((t) => TIPOS_ARCHIVO.find((x) => x.valor === t)?.etiqueta ?? t);
      return [cant("archivo(s)"), `Formatos: ${tipos.join(", ") || "PDF"}; hasta ${num(e.parametros.maxMB, 5)} MB cada uno.`];
    }
    case "enlace":
      return [cant("enlace(s)"), "Cada enlace lleva una descripción (por ejemplo, un video, un repositorio o un sitio publicado)."];
    case "lista": {
      const maxPal = num(e.parametros.maxPalabrasElemento, 0);
      return [cant("elemento(s)"), maxPal > 0 ? `Hasta ${maxPal} palabras por elemento.` : "Elementos cortos, uno por línea."];
    }
  }
}
