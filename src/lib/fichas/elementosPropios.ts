// Elementos propios del catálogo (catálogo editable, entrega C1; specs/fichas/CATALOGO_EDITABLE.md).
// Un elemento propio es un formulario armado con campos de tipos conocidos: el sistema lo puede mostrar y guardar sin
// programar nada nuevo. Lo crea el administrador; al agregarlo a una ficha (C2) se copia su definición en el espacio,
// así que editarlo después no cambia las fichas que ya lo usan. Módulo puro: lo usan el servidor y las pantallas.
import { GRUPOS_CATALOGO, type EtapaDeEspacios, type GrupoCatalogo } from "./catalogo";

export type TipoCampo = "texto" | "texto_largo" | "numero" | "fecha" | "seleccion" | "lista" | "archivo" | "imagen" | "enlace";

/** Qué límites admite cada tipo de campo. */
type Limite = "palabras" | "valor" | "cantidad" | "tamano" | "opciones";

export const TIPOS_CAMPO: { valor: TipoCampo; etiqueta: string; descripcion: string; limites: Limite[] }[] = [
  { valor: "texto", etiqueta: "Texto corto", descripcion: "Una línea: un nombre, un título, un código.", limites: ["palabras"] },
  { valor: "texto_largo", etiqueta: "Texto largo", descripcion: "Uno o más párrafos.", limites: ["palabras"] },
  { valor: "numero", etiqueta: "Número", descripcion: "Una cantidad, con mínimo y máximo opcionales.", limites: ["valor"] },
  { valor: "fecha", etiqueta: "Fecha", descripcion: "Un día del calendario.", limites: [] },
  { valor: "seleccion", etiqueta: "Selección", descripcion: "Una o varias opciones de una lista que define el administrador.", limites: ["opciones"] },
  { valor: "lista", etiqueta: "Lista", descripcion: "Varios elementos de texto, uno por línea.", limites: ["cantidad", "palabras"] },
  { valor: "archivo", etiqueta: "Archivo", descripcion: "Documentos PDF, Word o Excel.", limites: ["cantidad", "tamano"] },
  { valor: "imagen", etiqueta: "Imagen", descripcion: "Fotografías o capturas.", limites: ["cantidad", "tamano"] },
  { valor: "enlace", etiqueta: "Enlace", descripcion: "Direcciones web.", limites: ["cantidad"] },
];

export const tipoCampo = (t: TipoCampo) => TIPOS_CAMPO.find((x) => x.valor === t)!;

export interface CampoPropio {
  /** Estable dentro del elemento: identifica la respuesta del campo. */
  id: string;
  etiqueta: string;
  ayuda: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  /** Texto y lista: palabras por respuesta (o por elemento de la lista). 0 = sin límite. */
  minPalabras?: number;
  maxPalabras?: number;
  /** Número: valor permitido. Lista, archivo, imagen y enlace: cuántos. 0 o vacío = sin límite. */
  minimo?: number;
  maximo?: number;
  /** Archivo e imagen: tamaño máximo de cada uno, en MB. */
  maxMB?: number;
  /** Selección: las opciones y si se puede marcar más de una. */
  opciones?: string[];
  multiple?: boolean;
}

export interface DefinicionElementoPropio {
  nombre: string;
  descripcion: string;
  grupo: GrupoCatalogo;
  /** Etapas de la ficha donde se puede agregar. */
  etapas: EtapaDeEspacios[];
  /** "equipo": una respuesta por trabajo; "integrante": una por cada integrante. */
  alcance: "equipo" | "integrante";
  /** Se puede agregar más de una vez en la misma etapa. */
  repetible: boolean;
  campos: CampoPropio[];
}

export type EstadoElementoPropio = "borrador" | "publicado";

export const ETAPAS_ELEMENTO: { valor: EtapaDeEspacios; etiqueta: string }[] = [
  { valor: "propuesta", etiqueta: "Propuesta" },
  { valor: "protocolo", etiqueta: "Protocolo" },
  { valor: "informe_final", etiqueta: "Informe final" },
];

/** Límite de campos por elemento: un elemento con más campos conviene dividirlo. */
export const MAX_CAMPOS = 20;

/** Un campo nuevo del tipo pedido, con límites razonables para empezar. */
export function campoNuevo(tipo: TipoCampo, id: string): CampoPropio {
  const base: CampoPropio = { id, etiqueta: "", ayuda: "", tipo, obligatorio: true };
  switch (tipo) {
    case "texto":
      return { ...base, minPalabras: 0, maxPalabras: 30 };
    case "texto_largo":
      return { ...base, minPalabras: 0, maxPalabras: 500 };
    case "numero":
      return base;
    case "seleccion":
      return { ...base, opciones: ["", ""], multiple: false };
    case "lista":
      return { ...base, minimo: 1, maximo: 10, maxPalabras: 0 };
    case "archivo":
    case "imagen":
      return { ...base, minimo: 1, maximo: 1, maxMB: 5 };
    case "enlace":
      return { ...base, minimo: 1, maximo: 3 };
    default:
      return base;
  }
}

/** Al cambiar el tipo de un campo se conservan la etiqueta, la ayuda y si es obligatorio; los límites vuelven a empezar. */
export function cambiarTipo(c: CampoPropio, tipo: TipoCampo): CampoPropio {
  return { ...campoNuevo(tipo, c.id), etiqueta: c.etiqueta, ayuda: c.ayuda, obligatorio: c.obligatorio };
}

export function elementoPropioNuevo(campoId: string): DefinicionElementoPropio {
  return {
    nombre: "Elemento nuevo",
    descripcion: "",
    grupo: "Contenido",
    etapas: ["propuesta"],
    alcance: "equipo",
    repetible: false,
    campos: [{ ...campoNuevo("texto_largo", campoId), etiqueta: "Descripción" }],
  };
}

const entero = (n: unknown) => typeof n === "number" && Number.isInteger(n);
const opcionalEntero = (n: unknown) => n === undefined || entero(n);

/** Lo que impide publicar el elemento (vacío = se puede publicar). Un borrador se puede guardar con problemas. */
export function problemasElementoPropio(d: DefinicionElementoPropio): string[] {
  const r: string[] = [];
  if (!d.nombre.trim()) r.push("El elemento necesita un nombre.");
  if (d.nombre.trim().length > 150) r.push("El nombre admite hasta 150 caracteres.");
  if (!GRUPOS_CATALOGO.some((g) => g.grupo === d.grupo)) r.push("Elige una sección del catálogo.");
  if (d.etapas.length === 0) r.push("Marca al menos una etapa donde se puede usar.");
  if (d.campos.length === 0) r.push("El elemento necesita al menos un campo.");
  if (d.campos.length > MAX_CAMPOS) r.push(`Un elemento admite hasta ${MAX_CAMPOS} campos.`);
  if (d.campos.length > 0 && !d.campos.some((c) => c.obligatorio)) r.push("Al menos un campo debe ser obligatorio.");
  return [...r, ...problemasCampos(d.campos)];
}

/** Reglas de cada campo y etiquetas sin repetir (elementos propios y campos adicionales, C4). */
export function problemasCampos(campos: CampoPropio[]): string[] {
  const r: string[] = [];
  const etiquetas = new Map<string, number>();
  campos.forEach((c, i) => {
    const n = `Campo ${i + 1}${c.etiqueta.trim() ? ` («${c.etiqueta.trim()}»)` : ""}`;
    const et = c.etiqueta.trim().toLowerCase();
    if (!et) r.push(`${n}: falta la etiqueta.`);
    else etiquetas.set(et, (etiquetas.get(et) ?? 0) + 1);
    const lim = tipoCampo(c.tipo).limites;
    if (lim.includes("palabras") && c.minPalabras && c.maxPalabras && c.minPalabras > c.maxPalabras) r.push(`${n}: el mínimo de palabras es mayor que el máximo.`);
    if ((lim.includes("valor") || lim.includes("cantidad")) && c.minimo !== undefined && c.maximo && c.minimo > c.maximo) r.push(`${n}: el mínimo es mayor que el máximo.`);
    if (lim.includes("cantidad") && c.obligatorio && c.minimo === 0) r.push(`${n}: si es obligatorio, pide al menos 1.`);
    if (lim.includes("tamano") && (!c.maxMB || c.maxMB < 1 || c.maxMB > 10)) r.push(`${n}: el tamaño máximo debe estar entre 1 y 10 MB.`);
    if (lim.includes("opciones")) {
      const ops = (c.opciones ?? []).map((o) => o.trim()).filter(Boolean);
      if (ops.length < 2) r.push(`${n}: escribe al menos dos opciones.`);
      if (new Set(ops.map((o) => o.toLowerCase())).size !== ops.length) r.push(`${n}: hay opciones repetidas.`);
    }
  });
  for (const [et, veces] of etiquetas) if (veces > 1) r.push(`Hay ${veces} campos con la etiqueta «${et}»: cada campo necesita una distinta.`);
  return r;
}

/** La forma de una lista de campos leída de la base o recibida del navegador. */
export function tieneFormaCampos(x: unknown): x is CampoPropio[] {
  return Array.isArray(x) && x.length <= MAX_CAMPOS && tieneFormaElementoPropio({ ...elementoPropioNuevo("x"), campos: x });
}

// ── Entrega C4: campos adicionales en los elementos del sistema ───────────────────────────────────────────────────

/** Elementos del sistema que admiten campos adicionales: los que el egresado llena en un paso propio del asistente. */
export const ELEMENTOS_CON_CAMPOS_EXTRA = ["portada", "actores", "carta", "texto", "objetivos", "imagen", "archivo", "enlace", "lista", "tabla", "recursos_presupuesto"] as const;

/** Clave de la respuesta de los campos adicionales de un espacio (en respuestas_espacios). */
export const claveCamposExtra = (espacioId: string) => `${espacioId}#extra`;

/** Los campos adicionales como un elemento propio por trabajo, para reusar el formulario, la limpieza y las revisiones. */
export function defCamposExtra(e: { titulo: string; camposExtra?: CampoPropio[] }): DefinicionElementoPropio {
  return { nombre: e.titulo, descripcion: "", grupo: "Contenido", etapas: ["propuesta", "protocolo"], alcance: "equipo", repetible: false, campos: e.camposExtra ?? [] };
}

/** Revisa la forma de una definición leída de la base (o recibida del navegador) antes de usarla. */
export function tieneFormaElementoPropio(x: unknown): x is DefinicionElementoPropio {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  const etapas = ETAPAS_ELEMENTO.map((e) => e.valor) as string[];
  const tipos = TIPOS_CAMPO.map((t) => t.valor) as string[];
  return (
    typeof d.nombre === "string" && typeof d.descripcion === "string" && typeof d.grupo === "string" &&
    Array.isArray(d.etapas) && d.etapas.every((e) => typeof e === "string" && etapas.includes(e)) &&
    (d.alcance === "equipo" || d.alcance === "integrante") && typeof d.repetible === "boolean" &&
    Array.isArray(d.campos) && d.campos.length <= MAX_CAMPOS &&
    d.campos.every((c) => {
      if (!c || typeof c !== "object") return false;
      const k = c as Record<string, unknown>;
      return typeof k.id === "string" && k.id.length > 0 && typeof k.etiqueta === "string" && typeof k.ayuda === "string" &&
        typeof k.tipo === "string" && tipos.includes(k.tipo) && typeof k.obligatorio === "boolean" &&
        opcionalEntero(k.minPalabras) && opcionalEntero(k.maxPalabras) && (k.minimo === undefined || typeof k.minimo === "number") &&
        (k.maximo === undefined || typeof k.maximo === "number") && opcionalEntero(k.maxMB) &&
        (k.opciones === undefined || (Array.isArray(k.opciones) && k.opciones.every((o) => typeof o === "string"))) &&
        (k.multiple === undefined || typeof k.multiple === "boolean");
    }) &&
    new Set((d.campos as { id: string }[]).map((c) => c.id)).size === d.campos.length
  );
}

/** Resumen de las reglas de un campo, para la lista del catálogo y la vista previa. */
export function reglasCampo(c: CampoPropio): string {
  const partes: string[] = [tipoCampo(c.tipo).etiqueta, c.obligatorio ? "obligatorio" : "opcional"];
  const SINGULAR: Record<string, string> = { palabras: "palabra", elementos: "elemento", imágenes: "imagen", archivos: "archivo", enlaces: "enlace" };
  const de = (n: number, unidad: string) => `${n} ${n === 1 ? SINGULAR[unidad] ?? unidad : unidad}`;
  const rango = (min: number | undefined, max: number | undefined, unidad: string) =>
    min && max ? (min === max ? `exactamente ${de(min, unidad)}` : `de ${min} a ${max} ${unidad}`) : min ? `al menos ${de(min, unidad)}` : max ? `hasta ${de(max, unidad)}` : "";
  if (c.tipo === "texto" || c.tipo === "texto_largo") partes.push(rango(c.minPalabras, c.maxPalabras, "palabras"));
  if (c.tipo === "numero") partes.push(c.minimo !== undefined && c.maximo !== undefined ? `entre ${c.minimo} y ${c.maximo}` : c.minimo !== undefined ? `desde ${c.minimo}` : c.maximo !== undefined ? `hasta ${c.maximo}` : "");
  if (c.tipo === "seleccion") partes.push(`${(c.opciones ?? []).filter((o) => o.trim()).length} opciones${c.multiple ? ", varias a la vez" : ""}`);
  if (c.tipo === "lista") partes.push(rango(c.minimo, c.maximo, "elementos"), c.maxPalabras ? `hasta ${c.maxPalabras} palabras cada uno` : "");
  if (c.tipo === "archivo" || c.tipo === "imagen" || c.tipo === "enlace") partes.push(rango(c.minimo, c.maximo, c.tipo === "imagen" ? "imágenes" : c.tipo === "archivo" ? "archivos" : "enlaces"));
  if (c.maxMB && (c.tipo === "archivo" || c.tipo === "imagen")) partes.push(`${c.maxMB} MB cada uno`);
  return partes.filter(Boolean).join(" · ");
}

// ── Entrega C2: el elemento propio dentro de una ficha ───────────────────────────────────────────────────────────

/** Copia del elemento que guarda el espacio de la ficha (Q2: editar el elemento en el catálogo no cambia la ficha). */
export interface CopiaElementoPropio {
  /** Id del elemento en el catálogo (elementos_catalogo), para ofrecer actualizar la copia. */
  elementoId: number;
  definicion: DefinicionElementoPropio;
  /** Cuándo se copió (ISO). */
  copiadoEn: string;
}

export function copiaDe(elementoId: number, definicion: DefinicionElementoPropio, ahora = new Date()): CopiaElementoPropio {
  return { elementoId, definicion: structuredClone(definicion), copiadoEn: ahora.toISOString() };
}

export function tieneFormaCopia(x: unknown): x is CopiaElementoPropio {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return typeof c.elementoId === "number" && Number.isInteger(c.elementoId) && typeof c.copiadoEn === "string" && tieneFormaElementoPropio(c.definicion);
}

/** JSON con las claves ordenadas: la base (jsonb) devuelve las claves en otro orden que el navegador. */
function estable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${estable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Las dos definiciones piden lo mismo (sin importar el orden de las claves). */
export const mismaDefinicion = (a: DefinicionElementoPropio, b: DefinicionElementoPropio) => estable(a) === estable(b);

/** Cambios entre dos copias del mismo elemento, en frases cortas (pestaña «Cambios» de la ficha). */
export function cambiosElementoPropio(a: DefinicionElementoPropio, n: DefinicionElementoPropio): string[] {
  const r: string[] = [];
  if (a.nombre !== n.nombre) r.push(`el elemento ahora se llama «${n.nombre}»`);
  if (a.descripcion !== n.descripcion) r.push("cambió la descripción del elemento");
  if (a.alcance !== n.alcance) r.push(n.alcance === "integrante" ? "ahora pide una respuesta por integrante" : "ahora pide una respuesta por trabajo");
  const porId = new Map(a.campos.map((c) => [c.id, c]));
  const nuevos = new Map(n.campos.map((c) => [c.id, c]));
  for (const c of a.campos) if (!nuevos.has(c.id)) r.push(`se quitó el campo «${c.etiqueta}»`);
  for (const c of n.campos) {
    const v = porId.get(c.id);
    if (!v) r.push(`se agregó el campo «${c.etiqueta}» (${reglasCampo(c)})`);
    else if (estable(v) !== estable(c)) {
      const antes = reglasCampo(v);
      const ahora = reglasCampo(c);
      const renombre = v.etiqueta !== c.etiqueta ? ` (antes «${v.etiqueta}»)` : "";
      r.push(antes === ahora ? `«${c.etiqueta}»: cambió la ayuda o una opción${renombre}` : `«${c.etiqueta}»: ${antes} → ${ahora}${renombre}`);
    }
  }
  const orden = (d: DefinicionElementoPropio, otros: Map<string, CampoPropio>) => d.campos.filter((c) => otros.has(c.id)).map((c) => c.id).join();
  if (orden(a, nuevos) !== orden(n, porId)) r.push("cambió el orden de los campos");
  return r;
}
