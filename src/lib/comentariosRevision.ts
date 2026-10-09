// Comentarios del asesor por apartado de una actividad (revisión semanal). Módulo puro: servidor y cliente.

export type SeccionRevision = "marco" | "descripcion" | "imagenes" | "conclusion" | "general";

export const SECCIONES_REVISION: { id: SeccionRevision; label: string }[] = [
  { id: "marco", label: "Marco teórico y referencia" },
  { id: "descripcion", label: "Descripción de la actividad" },
  { id: "imagenes", label: "Imágenes de soporte" },
  { id: "conclusion", label: "Conclusión técnica" },
  { id: "general", label: "Comentario general" },
];

/** Apartados de texto en los que el asesor puede seleccionar una frase y comentarla. */
export type SeccionTexto = "marco" | "descripcion" | "conclusion";
export const SECCIONES_TEXTO: SeccionTexto[] = ["marco", "descripcion", "conclusion"];

/** Comentario sobre una frase concreta del texto (como un comentario de Word). */
export interface MarcaTexto {
  id: string;
  seccion: SeccionTexto;
  fragmento: string;
  texto: string;
}

/**
 * Observaciones estándar de la rúbrica que el asesor marca con un clic: los aspectos de criterio que el sistema no puede
 * validar por sí solo.
 */
export const OBSERVACIONES_ESTANDAR = [
  {
    id: "redaccion",
    label: "La redacción no es la adecuada",
    detalle: "Revise la redacción: debe ser clara, formal, en tiempo pasado y acorde al nivel de un profesional egresado.",
  },
  {
    id: "involucramiento",
    label: "No hay involucramiento del egresado en la actividad",
    detalle:
      "Falta el sujeto de ejecución: describa lo que usted, como pasante, realizó en la actividad (por ejemplo: «El pasante elaboró...»).",
  },
  {
    id: "no_reportable",
    label: "Esta no es una actividad reportable",
    detalle:
      "La actividad no genera valor para su formación profesional (por ejemplo, una convivencia o una actividad social). Redáctela de nuevo con lo técnico que realizó o reemplácela.",
  },
] as const;

export type ObservacionEstandar = (typeof OBSERVACIONES_ESTANDAR)[number]["id"];

export type ComentariosSecciones = Partial<Record<SeccionRevision, string>> & {
  marcas?: MarcaTexto[];
  estandar?: ObservacionEstandar[];
};

export const MIN_CARACTERES_COMENTARIO = 5;
export const MAX_CARACTERES_FRAGMENTO = 500;

function leerMarcas(valor: unknown): MarcaTexto[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((m) => m as Partial<MarcaTexto>)
    .filter(
      (m) =>
        typeof m.fragmento === "string" &&
        m.fragmento.trim() &&
        typeof m.texto === "string" &&
        m.texto.trim() &&
        SECCIONES_TEXTO.includes(m.seccion as SeccionTexto)
    )
    .map((m, i) => ({
      id: typeof m.id === "string" && m.id ? m.id : `m${i}`,
      seccion: m.seccion as SeccionTexto,
      fragmento: m.fragmento!.trim().slice(0, MAX_CARACTERES_FRAGMENTO),
      texto: m.texto!.trim(),
    }));
}

/** Lee los comentarios guardados (jsonb) y descarta los vacíos. */
export function leerComentariosSecciones(valor: unknown): ComentariosSecciones {
  if (!valor || typeof valor !== "object") return {};
  const v = valor as Record<string, unknown>;
  const resultado: ComentariosSecciones = {};
  for (const s of SECCIONES_REVISION) {
    const texto = typeof v[s.id] === "string" ? (v[s.id] as string).trim() : "";
    if (texto) resultado[s.id] = texto;
  }
  const marcas = leerMarcas(v.marcas);
  if (marcas.length) resultado.marcas = marcas;
  const estandar = Array.isArray(v.estandar)
    ? OBSERVACIONES_ESTANDAR.map((o) => o.id).filter((id) => (v.estandar as unknown[]).includes(id))
    : [];
  if (estandar.length) resultado.estandar = estandar;
  return resultado;
}

export function contarComentarios(c: ComentariosSecciones) {
  return SECCIONES_REVISION.filter((s) => (c[s.id] ?? "").trim()).length + (c.marcas?.length ?? 0) + (c.estandar?.length ?? 0);
}

/** Textos de todos los comentarios (por apartado y sobre frases), para validar su extensión. */
export function textosComentarios(c: ComentariosSecciones) {
  return [...SECCIONES_REVISION.map((s) => (c[s.id] ?? "").trim()).filter(Boolean), ...(c.marcas ?? []).map((m) => m.texto.trim())];
}

/** Texto de los comentarios, para notificaciones, la bitácora y las vistas que muestran un solo texto. */
export function resumenComentarios(c: ComentariosSecciones) {
  const etiqueta = (id: SeccionRevision) => SECCIONES_REVISION.find((s) => s.id === id)!.label;
  return [
    ...OBSERVACIONES_ESTANDAR.filter((o) => c.estandar?.includes(o.id)).map((o) => `${o.label}. ${o.detalle}`),
    ...SECCIONES_REVISION.filter((s) => (c[s.id] ?? "").trim()).map((s) => `${s.label}: ${c[s.id]!.trim()}`),
    ...(c.marcas ?? []).map((m) => `${etiqueta(m.seccion)} — «${m.fragmento}»: ${m.texto}`),
  ].join("\n");
}
