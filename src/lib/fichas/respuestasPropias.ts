// Respuestas de los elementos propios (catálogo editable, entrega C3). Se guardan como JSON en el mismo lugar que las
// demás respuestas de la etapa (respuestas_espacios en la propuesta y el protocolo; la versión del capítulo en el
// informe final):
//   { "valores": { "<campo>": valor } }                          una respuesta por trabajo
//   { "integrantes": { "<usuarioId>": { "<campo>": valor } } }   una respuesta por integrante
// Los archivos e imágenes van como data URL; el servidor revisa su tipo y tamaño al guardar. Módulo puro.
import { tipoCampo, type CampoPropio, type DefinicionElementoPropio } from "./elementosPropios";
import { enlaceValido } from "./elementosRecurso";

export interface ArchivoPropio { url: string; nombre: string; tipo: string }
export interface EnlacePropio { url: string; descripcion: string }
export type ValorCampo = string | number | string[] | ArchivoPropio[] | EnlacePropio[];
export type Valores = Record<string, ValorCampo>;
export interface RespuestaPropia { valores?: Valores; integrantes?: Record<string, Valores> }

/** Formatos que acepta cada campo de archivo o imagen. */
export const FORMATOS_CAMPO: Record<"archivo" | "imagen", { mime: string; etiqueta: string }[]> = {
  archivo: [
    { mime: "application/pdf", etiqueta: "PDF" },
    { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", etiqueta: "Word (.docx)" },
    { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", etiqueta: "Excel (.xlsx)" },
  ],
  imagen: [
    { mime: "image/png", etiqueta: "PNG" },
    { mime: "image/jpeg", etiqueta: "JPG" },
  ],
};

const MAX_TEXTO = 20000;
const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function leerRespuestaPropia(contenido: string | null | undefined): RespuestaPropia {
  if (!contenido) return {};
  try {
    const v = JSON.parse(contenido);
    if (!objeto(v)) return {};
    return {
      valores: objeto(v.valores) ? (v.valores as Valores) : undefined,
      integrantes: objeto(v.integrantes) ? (v.integrantes as Record<string, Valores>) : undefined,
    };
  } catch {
    return {};
  }
}

/** Los valores de un trabajo, o los de un integrante si el elemento pide una respuesta por integrante. */
export function valoresDe(r: RespuestaPropia, d: DefinicionElementoPropio, usuarioId?: number | null): Valores {
  if (d.alcance === "integrante") return (usuarioId != null ? r.integrantes?.[String(usuarioId)] : undefined) ?? {};
  return r.valores ?? {};
}

/** La respuesta con los valores nuevos de un trabajo o de un integrante (los de los demás no se tocan). */
export function conValores(r: RespuestaPropia, d: DefinicionElementoPropio, usuarioId: number | null, valores: Valores): RespuestaPropia {
  if (d.alcance === "integrante") {
    if (usuarioId == null) return r;
    return { integrantes: { ...(r.integrantes ?? {}), [String(usuarioId)]: valores } };
  }
  return { valores };
}

export const guardarRespuesta = (r: RespuestaPropia) => JSON.stringify(r);

const lista = <T>(v: ValorCampo | undefined): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function campoVacio(c: CampoPropio, v: ValorCampo | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return !v.trim();
  if (typeof v === "number") return !Number.isFinite(v);
  return v.length === 0;
}

/** Pendientes de los valores frente a las reglas de los campos (vacío = completo). `quien` antecede cada mensaje. */
export function problemasValores(d: DefinicionElementoPropio, valores: Valores, quien = ""): string[] {
  const r: string[] = [];
  const p = (m: string) => r.push(`${quien}${m}`);
  for (const c of d.campos) {
    const v = valores[c.id];
    const n = `«${c.etiqueta}»`;
    if (campoVacio(c, v)) {
      if (c.obligatorio) p(`falta ${n}.`);
      continue;
    }
    if (c.tipo === "texto" || c.tipo === "texto_largo") {
      const k = palabras(String(v));
      if (c.minPalabras && k < c.minPalabras) p(`${n} necesita al menos ${c.minPalabras} palabras (lleva ${k}).`);
      if (c.maxPalabras && k > c.maxPalabras) p(`${n} admite hasta ${c.maxPalabras} palabras (lleva ${k}).`);
    } else if (c.tipo === "numero") {
      if (c.minimo !== undefined && Number(v) < c.minimo) p(`${n} debe ser al menos ${c.minimo}.`);
      if (c.maximo !== undefined && Number(v) > c.maximo) p(`${n} debe ser como máximo ${c.maximo}.`);
    } else if (c.tipo === "seleccion") {
      const elegidas = lista<string>(v);
      if (!c.multiple && elegidas.length > 1) p(`${n} admite una sola opción.`);
    } else if (c.tipo === "fecha") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) p(`${n} no es una fecha válida.`);
    } else {
      const items = lista<unknown>(v);
      const unidad = c.tipo === "imagen" ? "imagen(es)" : c.tipo === "archivo" ? "archivo(s)" : c.tipo === "enlace" ? "enlace(s)" : "elemento(s)";
      if (c.minimo && items.length < c.minimo) p(`${n} necesita al menos ${c.minimo} ${unidad}.`);
      if (c.maximo && items.length > c.maximo) p(`${n} admite hasta ${c.maximo} ${unidad}.`);
      if (c.tipo === "lista" && c.maxPalabras) (items as string[]).forEach((t, i) => { if (palabras(t) > c.maxPalabras!) p(`${n}: el elemento ${i + 1} pasa de ${c.maxPalabras} palabras.`); });
      if (c.tipo === "enlace") (items as EnlacePropio[]).forEach((e, i) => {
        if (!enlaceValido(e.url)) p(`${n}: el enlace ${i + 1} no es una dirección válida.`);
        if (!e.descripcion?.trim()) p(`${n}: el enlace ${i + 1} no tiene descripción.`);
      });
    }
  }
  return r;
}

/** Ninguna respuesta tiene contenido (de nadie, si es por integrante). */
export function respuestaVacia(d: DefinicionElementoPropio, contenido: string | null | undefined): boolean {
  const r = leerRespuestaPropia(contenido);
  const grupos = d.alcance === "integrante" ? Object.values(r.integrantes ?? {}) : [r.valores ?? {}];
  return grupos.every((vals) => d.campos.every((c) => campoVacio(c, vals[c.id])));
}

/**
 * Pendientes de la respuesta completa: la del trabajo o la de cada integrante (con su nombre). Un espacio opcional sin
 * nada escrito no tiene pendientes.
 */
export function problemasRespuestaPropia(
  d: DefinicionElementoPropio,
  contenido: string | null | undefined,
  integrantes: { id: number; nombre: string }[],
  obligatorio = true
): string[] {
  if (!obligatorio && respuestaVacia(d, contenido)) return [];
  const r = leerRespuestaPropia(contenido);
  if (d.alcance !== "integrante") return problemasValores(d, r.valores ?? {});
  return integrantes.flatMap((i) => problemasValores(d, r.integrantes?.[String(i.id)] ?? {}, integrantes.length > 1 ? `${i.nombre}: ` : ""));
}

const tamanoDataUrl = (url: string) => Math.floor((url.length - url.indexOf(",") - 1) * 0.75);
const mimeDataUrl = (url: string) => /^data:([^;,]+)[;,]/.exec(url)?.[1] ?? "";

/**
 * Limpia los valores que llegan del navegador antes de guardarlos: solo los campos del elemento, con su tipo, y los
 * archivos con un formato permitido y dentro del tamaño. Lo que falta (obligatorios, mínimos) no impide guardar: se
 * revisa para avanzar o enviar.
 */
export function limpiarValores(d: DefinicionElementoPropio, entrada: unknown): { ok: true; valores: Valores } | { ok: false; error: string } {
  const e = objeto(entrada) ? entrada : {};
  const valores: Valores = {};
  for (const c of d.campos) {
    const v = e[c.id];
    if (v === undefined || v === null || v === "") continue;
    const n = `«${c.etiqueta}»`;
    switch (c.tipo) {
      case "texto":
      case "texto_largo": {
        const t = String(v).replace(/\r\n/g, "\n");
        const limpio = c.tipo === "texto" ? t.replace(/\s+/g, " ").trim() : t.trim();
        if (limpio.length > MAX_TEXTO) return { ok: false, error: `${n} es demasiado extenso.` };
        if (limpio) valores[c.id] = limpio;
        break;
      }
      case "numero": {
        const x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
        if (!Number.isFinite(x)) return { ok: false, error: `${n} debe ser un número.` };
        valores[c.id] = x;
        break;
      }
      case "fecha": {
        const t = String(v);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(t))) return { ok: false, error: `${n} no es una fecha válida.` };
        valores[c.id] = t;
        break;
      }
      case "seleccion": {
        const opciones = (c.opciones ?? []).map((o) => o.trim()).filter(Boolean);
        const elegidas = [...new Set((Array.isArray(v) ? v : [v]).map(String))].filter((o) => opciones.includes(o));
        if (!c.multiple && elegidas.length > 1) return { ok: false, error: `${n} admite una sola opción.` };
        if (elegidas.length) valores[c.id] = elegidas;
        break;
      }
      case "lista": {
        const items = (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().slice(0, 2000)).filter(Boolean);
        if (c.maximo && items.length > c.maximo) return { ok: false, error: `${n} admite hasta ${c.maximo} elementos.` };
        if (items.length) valores[c.id] = items;
        break;
      }
      case "enlace": {
        const items = (Array.isArray(v) ? v : [])
          .map((x) => ({ url: String((x as EnlacePropio)?.url ?? "").trim().slice(0, 2000), descripcion: String((x as EnlacePropio)?.descripcion ?? "").trim().slice(0, 255) }))
          .filter((x) => x.url || x.descripcion);
        if (c.maximo && items.length > c.maximo) return { ok: false, error: `${n} admite hasta ${c.maximo} enlaces.` };
        if (items.length) valores[c.id] = items;
        break;
      }
      case "archivo":
      case "imagen": {
        const formatos = FORMATOS_CAMPO[c.tipo];
        const maxMB = Math.min(Math.max(c.maxMB ?? 5, 1), 10);
        const items: ArchivoPropio[] = [];
        for (const x of Array.isArray(v) ? v : []) {
          const url = String((x as ArchivoPropio)?.url ?? "");
          const nombre = String((x as ArchivoPropio)?.nombre ?? "").slice(0, 255) || (c.tipo === "imagen" ? "imagen" : "archivo");
          if (!url.startsWith("data:")) return { ok: false, error: `${n}: el archivo «${nombre}» no se pudo leer.` };
          const mime = mimeDataUrl(url);
          if (!formatos.some((f) => f.mime === mime)) return { ok: false, error: `${n}: «${nombre}» no tiene un formato permitido (${formatos.map((f) => f.etiqueta).join(", ")}).` };
          if (tamanoDataUrl(url) > maxMB * 1024 * 1024) return { ok: false, error: `${n}: «${nombre}» pasa de ${maxMB} MB.` };
          items.push({ url, nombre, tipo: mime });
        }
        if (c.maximo && items.length > c.maximo) return { ok: false, error: `${n} admite hasta ${c.maximo} ${c.tipo === "imagen" ? "imágenes" : "archivos"}.` };
        if (items.length) valores[c.id] = items;
        break;
      }
    }
  }
  return { ok: true, valores };
}

/** Limpia una respuesta completa (JSON) del informe final, donde el capítulo se guarda entero. */
export function limpiarRespuesta(d: DefinicionElementoPropio, contenido: string): { ok: true; valor: string } | { ok: false; error: string } {
  const r = leerRespuestaPropia(contenido);
  if (d.alcance === "integrante") {
    const integrantes: Record<string, Valores> = {};
    for (const [id, vals] of Object.entries(r.integrantes ?? {})) {
      if (!/^\d+$/.test(id)) continue;
      const l = limpiarValores(d, vals);
      if (!l.ok) return l;
      integrantes[id] = l.valores;
    }
    return { ok: true, valor: guardarRespuesta({ integrantes }) };
  }
  const l = limpiarValores(d, r.valores);
  return l.ok ? { ok: true, valor: guardarRespuesta({ valores: l.valores }) } : l;
}

/** Cada campo como texto, para la revisión, la impresión y los documentos. Archivos e imágenes van por su nombre. */
export function textoCampo(c: CampoPropio, v: ValorCampo | undefined): string {
  if (campoVacio(c, v)) return "";
  switch (c.tipo) {
    case "numero":
      return String(v);
    case "fecha": {
      const [a, m, dia] = String(v).split("-");
      return `${dia}/${m}/${a}`;
    }
    case "seleccion":
    case "lista":
      return lista<string>(v).join(c.tipo === "lista" ? "\n" : ", ");
    case "enlace":
      return lista<EnlacePropio>(v).map((e) => `${e.descripcion}: ${e.url}`).join("\n");
    case "archivo":
    case "imagen":
      return lista<ArchivoPropio>(v).map((a) => a.nombre).join(", ");
    default:
      return String(v);
  }
}

/** Los archivos e imágenes de la respuesta (para los anexos de los documentos). */
export function archivosRespuesta(d: DefinicionElementoPropio, contenido: string | null | undefined): ArchivoPropio[] {
  const r = leerRespuestaPropia(contenido);
  const grupos = d.alcance === "integrante" ? Object.values(r.integrantes ?? {}) : [r.valores ?? {}];
  return grupos.flatMap((vals) => d.campos.filter((c) => c.tipo === "archivo" || c.tipo === "imagen").flatMap((c) => lista<ArchivoPropio>(vals[c.id])));
}

/** Etiqueta y texto de cada campo con respuesta, por persona si el elemento es por integrante. */
export function bloquesRespuesta(
  d: DefinicionElementoPropio,
  contenido: string | null | undefined,
  integrantes: { id: number; nombre: string }[] = []
): { persona: string | null; campos: { etiqueta: string; texto: string; tipo: CampoPropio["tipo"] }[] }[] {
  const r = leerRespuestaPropia(contenido);
  const campos = (vals: Valores) => d.campos.map((c) => ({ etiqueta: c.etiqueta, texto: textoCampo(c, vals[c.id]), tipo: c.tipo })).filter((x) => x.texto);
  if (d.alcance !== "integrante") return [{ persona: null, campos: campos(r.valores ?? {}) }];
  const nombre = (id: string) => integrantes.find((i) => String(i.id) === id)?.nombre ?? `Integrante ${id}`;
  return Object.entries(r.integrantes ?? {}).map(([id, vals]) => ({ persona: nombre(id), campos: campos(vals) })).filter((b) => b.campos.length);
}

/** Texto corto con las reglas que el egresado ve debajo del campo. */
export function ayudaCampo(c: CampoPropio): string {
  const formatos = c.tipo === "archivo" || c.tipo === "imagen" ? ` Formatos: ${FORMATOS_CAMPO[c.tipo].map((f) => f.etiqueta).join(", ")}.` : "";
  return `${tipoCampo(c.tipo).etiqueta}${formatos}`;
}
