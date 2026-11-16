// Productos por objetivo específico (notas del 13-nov-2026). Módulo puro: cuándo se habilita la entrega de un objetivo,
// quién la entrega, qué le falta y la revisión de redacción de su conclusión. Lo usan la ejecución (egresado y asesor),
// los informes y verificar_fichas.
import { aplanar, productosDe, responsables, type AvanceRegistrado, type NodoPlan } from "./planTrabajo";
import { revisarApartado, type Revision, type TipoApartado } from "./apartadosAcademicos";

export type EstadoEntrega = "borrador" | "enviado" | "observado" | "aprobado";

export interface ArchivoProducto {
  id: number;
  /** Índice del producto prometido (productosDe(objetivo)). */
  producto: number;
  tipo: "imagen" | "documento" | "enlace";
  nombre: string | null;
  leyenda: string;
  /** Solo los enlaces traen su dirección aquí; los archivos se leen aparte. */
  enlace: string | null;
}

export interface EntregaObjetivo {
  id: number;
  nodoId: string;
  egresadoId: number;
  conclusion: string;
  /** Bitácora: cambio o acontecimiento reportado al entregar el objetivo (null si no hubo). */
  modificacionTipo: string | null;
  modificacion: string | null;
  estado: EstadoEntrega;
  periodo: number | null;
  comentarioAsesor: string | null;
  enviadoEn: string | null;
  archivos: ArchivoProducto[];
}

/**
 * Avance de un objetivo para su entrega: cuántas de sus actividades (hojas de nivel 4 o 5) tienen su último registro
 * enviado al 100 %. Se habilita cuando lo están todas (una actividad con subactividades, cuando todas están terminadas).
 */
export function avanceObjetivo(objetivo: NodoPlan, registros: AvanceRegistrado[]) {
  const hojas = aplanar(objetivo).filter((n) => n.hijos.length === 0 && n.nivel >= 4);
  const ultimo = (id: string) =>
    registros
      .filter((r) => r.nodoId === id && r.estado !== "borrador" && r.avance !== null)
      .sort((a, b) => b.periodo - a.periodo)[0]?.avance ?? 0;
  const alCien = hojas.filter((h) => ultimo(h.id) === 100).length;
  return { actividades: hojas.length, alCien, completo: hojas.length > 0 && alCien === hojas.length };
}

/**
 * Quién entrega los productos del objetivo: su responsable; si la ficha asigna responsable por actividad, cualquier
 * integrante con actividades en él.
 */
export function quienesEntregan(arbol: NodoPlan, objetivoId: string): number[] {
  const resp = responsables(arbol);
  const propio = resp.get(objetivoId);
  if (propio != null) return [propio];
  const objetivo = aplanar(arbol).find((n) => n.id === objetivoId);
  if (!objetivo) return [];
  return [...new Set(aplanar(objetivo).map((n) => resp.get(n.id)).filter((x): x is number => x != null))];
}

/** La conclusión del objetivo se revisa como un apartado de informe: en pasado y en tercera persona. */
export const TIPO_CONCLUSION_OBJETIVO: TipoApartado = {
  clave: "conclusion_objetivo",
  nombre: "Conclusión del objetivo",
  etapa: "informe",
  proposito: "Responde si el objetivo se cumplió y qué se concluye de sus productos. Pasa al capítulo de conclusiones del informe final.",
  partes: [
    {
      id: "conclusion",
      titulo: "Conclusión del objetivo",
      ayuda: "Indique si el objetivo se cumplió, con qué productos y qué se concluye de ellos. Redacte en pasado y en tercera persona.",
      formato: "texto",
      min: 30,
      max: 300,
    },
  ],
  citasMinimas: 0,
  autoevaluacion: [],
  errores: [],
  ejemplo: "Se diagnosticó el estado de las operaciones del taller: el estudio de tiempos mostró que el 35 % del ciclo corresponde a esperas…",
  especiales: [],
};

export function revisarConclusionObjetivo(texto: string): Revision[] {
  return revisarApartado(TIPO_CONCLUSION_OBJETIVO, { partes: { conclusion: texto }, autoevaluacion: [] }, { citasMinimas: 0, revisarPersona: true, tiempo: "pasado" });
}

/** Lo que falta para enviar la entrega del objetivo al asesor. */
export function problemasEntrega(args: {
  completo: boolean;
  productos: string[];
  archivos: Pick<ArchivoProducto, "producto">[];
  conclusion: string;
}): string[] {
  const p: string[] = [];
  if (!args.completo) p.push("Las actividades del objetivo todavía no llegan al 100 %.");
  args.productos.forEach((nombre, i) => {
    if (!args.archivos.some((a) => a.producto === i)) p.push(`Adjunte el producto «${nombre}».`);
  });
  for (const r of revisarConclusionObjetivo(args.conclusion)) if (r.nivel === "falta") p.push(r.mensaje);
  return p;
}

/** Productos del objetivo tal como se prometieron en el plan (alias para leer las entregas sin importar el plan). */
export const productosPrometidos = productosDe;

/** Objetivos específicos del plan (nivel 2), en orden. */
export const objetivosDelPlan = (arbol: NodoPlan) => arbol.hijos.filter((n) => n.nivel === 2);

/** Etiquetas del estado de la entrega; "bloqueada" y "pendiente" son las que todavía no tienen fila. */
export const ESTADO_ENTREGA: Record<string, { label: string; badge: string }> = {
  bloqueada: { label: "En curso", badge: "bg-slate-50 text-slate-500 border-slate-200" },
  pendiente: { label: "Lista para entregar", badge: "bg-sky-50 text-sky-800 border-sky-200" },
  borrador: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviada", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};
