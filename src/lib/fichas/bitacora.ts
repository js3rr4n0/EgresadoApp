// Bitácora o reporte de modificaciones (notas del 13-nov-2026). Un proyecto gerencia recursos, tiempo y alcance: en cada
// actividad y en cada objetivo el egresado puede reportar, opcionalmente, un cambio o acontecimiento (una actividad que
// se reprogramó, un cambio de precio, hacer más de lo planificado…). El sistema lo junta en orden, con el índice del
// plan, como anexo de los informes del período y del informe final. Módulo puro.
import { aplanar, type NodoPlan } from "./planTrabajo";
import type { BloqueDocumento } from "./documentoInformeFinal";

export const TIPOS_MODIFICACION = [
  { valor: "tiempo", etiqueta: "Tiempo", ayuda: "Retraso, reprogramación o adelanto de una actividad." },
  { valor: "recursos", etiqueta: "Recursos y costos", ayuda: "Cambio de precio, de materiales o de personas involucradas." },
  { valor: "alcance", etiqueta: "Alcance", ayuda: "Se hizo más o menos de lo planificado." },
  // Investigación (notas del 19-nov-2026): los cambios en el camino son hallazgos, no mala planificación; los acepta el asesor.
  { valor: "metodologia", etiqueta: "Ajuste a la metodología", ayuda: "Se cambió el procedimiento planificado: instrumento, muestra o técnica, y por qué." },
  { valor: "hallazgo", etiqueta: "Hallazgo o supuesto nuevo", ayuda: "Un impasse o un supuesto que no se había analizado y que apareció durante la investigación." },
  { valor: "otro", etiqueta: "Otro acontecimiento", ayuda: "Un problema o una situación que conviene dejar registrada." },
] as const;
export type TipoModificacion = (typeof TIPOS_MODIFICACION)[number]["valor"];

export const etiquetaModificacion = (tipo: string | null | undefined) => TIPOS_MODIFICACION.find((t) => t.valor === tipo)?.etiqueta ?? "Otro acontecimiento";

/** Normaliza lo que llega del formulario: sin texto no hay modificación; con texto y sin tipo, es "otro". */
export function limpiarModificacion(tipo: string | null | undefined, texto: string | null | undefined): { modificacionTipo: TipoModificacion | null; modificacion: string | null } {
  const t = (texto ?? "").trim().slice(0, 3000);
  if (!t) return { modificacionTipo: null, modificacion: null };
  const valido = TIPOS_MODIFICACION.some((x) => x.valor === tipo) ? (tipo as TipoModificacion) : "otro";
  return { modificacionTipo: valido, modificacion: t };
}

export interface EntradaBitacora {
  /** Índice del plan (1.1 o 1.1.1.1). */
  codigo: string;
  titulo: string;
  origen: "actividad" | "objetivo";
  periodo: number;
  tipo: TipoModificacion;
  texto: string;
  /** Estado del registro o la entrega que la reporta: "aprobado" = el asesor la aceptó (investigación). */
  estado: string;
}

interface ConModificacion {
  nodoId: string;
  periodo: number | null;
  estado: string;
  modificacionTipo?: string | null;
  modificacion?: string | null;
}

/**
 * Entradas de la bitácora en orden: por período y, dentro de él, en el orden del plan. Solo cuenta lo enviado o aprobado
 * (los borradores todavía pueden cambiar). Con "periodo", solo las de ese período.
 */
export function entradasBitacora(args: { arbol: NodoPlan; registros: ConModificacion[]; entregas: ConModificacion[]; periodo?: number }): EntradaBitacora[] {
  const orden = new Map(aplanar(args.arbol).map((n, i) => [n.id, { n, i }]));
  const cuenta = (x: ConModificacion) => (x.estado === "enviado" || x.estado === "aprobado") && !!x.modificacion?.trim() && x.periodo !== null
    && (args.periodo === undefined || x.periodo === args.periodo);
  const entradas = [
    ...args.registros.filter(cuenta).map((x) => ({ x, origen: "actividad" as const })),
    ...args.entregas.filter(cuenta).map((x) => ({ x, origen: "objetivo" as const })),
  ]
    .filter(({ x }) => orden.has(x.nodoId))
    .sort((a, b) => a.x.periodo! - b.x.periodo! || orden.get(a.x.nodoId)!.i - orden.get(b.x.nodoId)!.i || (a.origen === "actividad" ? -1 : 1));
  return entradas.map(({ x, origen }) => {
    const n = orden.get(x.nodoId)!.n;
    return { codigo: n.codigo, titulo: n.titulo, origen, periodo: x.periodo!, tipo: limpiarModificacion(x.modificacionTipo, x.modificacion).modificacionTipo ?? "otro", texto: x.modificacion!.trim(), estado: x.estado };
  });
}

/** Texto de una entrada para los informes: "Período 2 · 1.1.1.1 Encuesta (Tiempo): …". */
export const textoEntrada = (e: EntradaBitacora) =>
  `Período ${e.periodo} · ${e.origen === "objetivo" ? "Objetivo " : ""}${e.codigo} ${e.titulo.trim().replace(/[.\s]+$/, "")} (${etiquetaModificacion(e.tipo)}): ${e.texto}`;

/** Bloques del reporte de modificaciones para el documento del informe final. */
export function bloquesBitacora(entradas: EntradaBitacora[]): BloqueDocumento[] {
  if (entradas.length === 0) return [{ tipo: "parrafos", parrafos: ["Durante la ejecución no se reportaron modificaciones a lo planificado."] }];
  const resumen = TIPOS_MODIFICACION.map((t) => ({ t, n: entradas.filter((e) => e.tipo === t.valor).length })).filter((x) => x.n > 0)
    .map((x) => `${x.t.etiqueta.toLowerCase()}: ${x.n}`).join("; ");
  return [
    { tipo: "parrafos", parrafos: [`Cambios y acontecimientos reportados durante la ejecución, en orden y con el índice del plan al que pertenecen (${resumen}).`] },
    { tipo: "lista", items: entradas.map(textoEntrada) },
  ];
}
