// Ejecución por elementos del proceso (cronograma de investigación, notas del 19-nov-2026, entrega E3). Módulo puro.
// Cada elemento de un objetivo (metodología, desarrollo, resultados, conclusiones preliminares, discusión), o cada una
// de sus subactividades, se registra por período como cualquier actividad del plan, y el asesor aprueba u observa cada
// registro. Un elemento queda VALIDADO cuando su último registro (el de cada subactividad, si tiene) llega al 100 % y el
// asesor lo aprueba. El objetivo se cierra cuando lo están todos los elementos que cuentan: los obligatorios y la
// discusión si se usó. El avance de cada elemento pesa igual dentro del objetivo (avancePorNodo).
import { aplanar, avancePorNodo, esHojaPlan, totalesNodo, type NodoPlan } from "./planTrabajo";
import type { ClaveComponente } from "./tipos";

export interface RegistroElemento {
  nodoId: string;
  periodo: number;
  avance: number | null;
  estado: string;
}

export type EstadoElemento = "sin_iniciar" | "en_curso" | "observado" | "por_validar" | "validado";

export const ESTADO_ELEMENTO: Record<EstadoElemento, { label: string; badge: string }> = {
  sin_iniciar: { label: "Sin iniciar", badge: "bg-slate-50 text-slate-500 border-slate-200" },
  en_curso: { label: "En curso", badge: "bg-sky-50 text-sky-800 border-sky-200" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  por_validar: { label: "Concluido, por validar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  validado: { label: "Validado por el asesor", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

/** Lo que se registra de un elemento: él mismo o, si tiene, sus subactividades. */
export const hojasElemento = (n: NodoPlan) => (n.hijos.length ? aplanar(n).filter(esHojaPlan) : [n]);

const ultimo = (id: string, registros: RegistroElemento[]) => registros.filter((r) => r.nodoId === id).sort((a, b) => b.periodo - a.periodo)[0];

/** Estado de un elemento según el último registro de cada una de sus hojas. */
export function estadoElemento(n: NodoPlan, registros: RegistroElemento[]): EstadoElemento {
  const ult = hojasElemento(n).map((h) => ultimo(h.id, registros));
  if (ult.every((u) => !u)) return "sin_iniciar";
  if (ult.some((u) => u?.estado === "observado")) return "observado";
  if (ult.every((u) => u && u.avance === 100 && u.estado === "aprobado")) return "validado";
  if (ult.every((u) => u && u.avance === 100 && (u.estado === "enviado" || u.estado === "aprobado"))) return "por_validar";
  return "en_curso";
}

/**
 * Un elemento cuenta en el avance y en el cierre del objetivo si es obligatorio o, siendo opcional (la discusión),
 * si se usó: tiene algo planificado o algún registro enviado.
 */
export function elementoCuenta(n: NodoPlan, registros: RegistroElemento[]): boolean {
  if (!n.opcional) return true;
  if (aplanar(n).some((x) => x.montos.some((m) => m > 0))) return true;
  return hojasElemento(n).some((h) => registros.some((r) => r.nodoId === h.id && r.estado !== "borrador"));
}

export interface ProcesoObjetivo {
  nodo: NodoPlan;
  elementos: { nodo: NodoPlan; estado: EstadoElemento; cuenta: boolean; avance: number }[];
  avance: number;
  /** Todos los elementos que cuentan están validados por el asesor. */
  cerrado: boolean;
}

/** Avance por hoja: el último avance enviado o aprobado de cada una. */
export function avancesEnviados(registros: RegistroElemento[]): Map<string, number> {
  const m = new Map<string, { p: number; a: number }>();
  for (const r of registros) {
    if (r.estado === "borrador" || r.avance === null) continue;
    const u = m.get(r.nodoId);
    if (!u || r.periodo > u.p) m.set(r.nodoId, { p: r.periodo, a: r.avance });
  }
  return new Map([...m].map(([k, v]) => [k, v.a]));
}

/** Proceso de cada objetivo (y del bloque de preparación del informe): estado y avance de sus elementos. */
export function procesoPorObjetivo(arbol: NodoPlan, registros: RegistroElemento[]): ProcesoObjetivo[] {
  const avances = avancePorNodo(arbol, avancesEnviados(registros));
  return arbol.hijos.map((o) => {
    const elementos = o.hijos.filter((e) => e.componente).map((e) => ({ nodo: e, estado: estadoElemento(e, registros), cuenta: elementoCuenta(e, registros), avance: avances.get(e.id) ?? 0 }));
    const cuentan = elementos.filter((e) => e.cuenta);
    return { nodo: o, elementos, avance: avances.get(o.id) ?? 0, cerrado: cuentan.length > 0 && cuentan.every((e) => e.estado === "validado") };
  });
}

/** Elemento al que pertenece un nodo: él mismo o el de su subactividad. */
export function elementoDe(arbol: NodoPlan, nodoId: string): NodoPlan | null {
  for (const n of aplanar(arbol)) {
    if (n.id === nodoId && n.componente) return n;
    if (n.componente && n.hijos.some((h) => h.id === nodoId)) return n;
  }
  return null;
}

/** El elemento tiene algo planificado (para mostrarlo en el cronograma). */
export const elementoPlanificado = (n: NodoPlan, columnas: number) => totalesNodo(n, columnas).some((m) => m > 0);

interface TextoCampo {
  titulo: string;
  ayuda: string;
  placeholder: string;
}

/** Textos del registro según el elemento: lo que se pide en "acciones" y en "resultado". */
export const TEXTOS_ELEMENTO: Record<ClaveComponente, { acciones: TextoCampo; resultado: TextoCampo; conclusion?: boolean }> = {
  metodologia: {
    acciones: { titulo: "¿Cómo se aplicó la metodología?", ayuda: "Describa cómo se puso en marcha el procedimiento planificado (instrumentos elaborados o validados, muestra seleccionada, permisos), en tiempo pasado. Si se ajustó, repórtelo en «¿Hubo algún cambio?» como ajuste a la metodología.", placeholder: "Se elaboró y validó el instrumento…; se seleccionó la muestra…" },
    resultado: { titulo: "Metodología lista para el desarrollo", ayuda: "Qué quedó definido para el desarrollo del objetivo.", placeholder: "Quedaron definidos el instrumento validado y la muestra de…" },
  },
  desarrollo: {
    acciones: { titulo: "¿Qué se hizo y cómo?", ayuda: "Aplicando la metodología, describa qué se hizo en las fechas indicadas y de qué manera, en tiempo pasado.", placeholder: "Del … al … se aplicó el cuestionario a…, de la siguiente manera…" },
    resultado: { titulo: "Lo que se obtuvo", ayuda: "Lo que produjo el desarrollo (datos recolectados, registros, materiales) para los resultados del objetivo.", placeholder: "Se obtuvieron … respuestas válidas, que…" },
  },
  resultados: {
    acciones: { titulo: "¿Cómo se obtuvieron los resultados?", ayuda: "Cómo se procesaron y analizaron los datos del desarrollo, en tiempo pasado.", placeholder: "Los datos se tabularon y analizaron con…" },
    resultado: { titulo: "Resultados obtenidos", ayuda: "Los resultados de la metodología aplicada y del desarrollo realizado, con sus evidencias (tablas, gráficos, documentos).", placeholder: "El análisis mostró que…" },
  },
  conclusiones: {
    acciones: { titulo: "¿Cómo se llegó a las conclusiones?", ayuda: "Qué resultados se tomaron en cuenta para concluir sobre el objetivo.", placeholder: "A partir de los resultados de…" },
    resultado: { titulo: "Conclusiones preliminares del objetivo", ayuda: "Indique si el objetivo se cumplió y qué se concluye de sus resultados, en pasado y en tercera persona. Son preliminares: las conclusiones finales se redactan al preparar el informe final.", placeholder: "Se determinó que…, por lo que el objetivo se cumplió…" },
    conclusion: true,
  },
  discusion: {
    acciones: { titulo: "¿Qué se discutió?", ayuda: "Qué resultados se contrastaron y con qué literatura o estudios.", placeholder: "Se contrastaron los resultados con…" },
    resultado: { titulo: "Elementos de discusión", ayuda: "Contraste de los resultados con otros estudios, limitaciones, hallazgos no previstos e implicaciones.", placeholder: "A diferencia de lo reportado por…, en este estudio…" },
  },
  redaccion_informe: {
    acciones: { titulo: "¿Qué se redactó?", ayuda: "Capítulos o partes del informe final que se redactaron o revisaron.", placeholder: "Se redactaron los capítulos…" },
    resultado: { titulo: "Avance del informe final", ayuda: "Lo que quedó listo del informe final.", placeholder: "Quedó lista la versión de…" },
  },
  conclusiones_finales: {
    acciones: { titulo: "¿Cómo se elaboraron las conclusiones finales?", ayuda: "Qué conclusiones preliminares y resultados se integraron.", placeholder: "Se integraron las conclusiones preliminares de…" },
    resultado: { titulo: "Conclusiones finales", ayuda: "Las conclusiones de la investigación completa, en pasado y en tercera persona. Son distintas de las preliminares de cada objetivo.", placeholder: "La investigación determinó que…" },
    conclusion: true,
  },
};
