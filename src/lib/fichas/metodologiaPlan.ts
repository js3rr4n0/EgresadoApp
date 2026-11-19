// Metodología de cada objetivo en el cronograma de investigación (notas del 19-nov-2026, entrega E2). Módulo puro.
// El elemento "Metodología" de cada objetivo describe el procedimiento con párrafos citados (los mismos del protocolo:
// cada párrafo con sus fuentes del registro y la cita armada por el sistema). Si el equipo propone una metodología
// propia, la fundamenta en métodos o investigaciones anteriores, también con citas. El asesor la revisa con el plan.
import { conCitas, leerParrafos, parrafoConCita, type ParrafoCitado } from "./fuentes";
import type { NodoPlan } from "./planTrabajo";
import type { DatosCitaApa } from "@/lib/citaApa";
import type { EtapaPlan } from "./tipos";

export interface MetodologiaObjetivo {
  parrafos: ParrafoCitado[];
  /** El equipo propone una metodología propia: se pide su fundamentación. */
  propia: boolean;
  fundamentacion: ParrafoCitado[];
}

export const MAX_PARRAFOS_METODOLOGIA = 30;
export const MAX_TEXTO_PARRAFO = 5000;

/** La ficha pide la metodología de cada objetivo (solo en el cronograma de investigación). */
export const pideMetodologia = (p: Pick<EtapaPlan, "estructura" | "metodologiaObjetivo">) => p.estructura === "investigacion" && !!p.metodologiaObjetivo;

const lista = (x: unknown): ParrafoCitado[] => (Array.isArray(x) ? leerParrafos(JSON.stringify(x)) : []);

/** Metodología guardada en el nodo (vacía si no tiene). */
export function leerMetodologia(n: Pick<NodoPlan, "metodologia">): MetodologiaObjetivo {
  const m = n.metodologia;
  return { parrafos: lista(m?.parrafos), propia: !!m?.propia, fundamentacion: lista(m?.fundamentacion) };
}

const conTexto = (ps: ParrafoCitado[]) => ps.filter((p) => p.texto.trim());
const citados = (ps: ParrafoCitado[]) => conTexto(ps).filter((p) => p.fuentes.length > 0);

/** La metodología no tiene ningún párrafo escrito. */
export const metodologiaVacia = (m: MetodologiaObjetivo) => conTexto(m.parrafos).length === 0;

/** Pendientes de la metodología de un objetivo antes de enviar el plan. "codigo" es el del elemento (1.1.1). */
export function problemasMetodologia(codigo: string, m: MetodologiaObjetivo): string[] {
  const p: string[] = [];
  if (metodologiaVacia(m)) p.push(`${codigo}: describe la metodología del objetivo (qué se hará, con qué técnicas e instrumentos y con quiénes).`);
  else if (citados(m.parrafos).length === 0) p.push(`${codigo}: la metodología necesita al menos una cita del registro de fuentes que la respalde.`);
  if (m.propia) {
    if (conTexto(m.fundamentacion).length === 0) p.push(`${codigo}: fundamenta la metodología propia en métodos o investigaciones anteriores.`);
    else if (citados(m.fundamentacion).length === 0) p.push(`${codigo}: la fundamentación de la metodología propia necesita al menos una cita.`);
  }
  return p;
}

/** Elementos de metodología de los objetivos del plan (sin el bloque de cierre). */
export function nodosMetodologia(raiz: NodoPlan): NodoPlan[] {
  const todos = (n: NodoPlan): NodoPlan[] => [n, ...n.hijos.flatMap(todos)];
  return todos(raiz).filter((n) => n.componente === "metodologia");
}

/** Ids de las fuentes citadas en las metodologías del plan. */
export function fuentesCitadasPlan(raiz: NodoPlan): number[] {
  const ids = new Set<number>();
  for (const n of nodosMetodologia(raiz)) {
    const m = leerMetodologia(n);
    for (const p of [...m.parrafos, ...(m.propia ? m.fundamentacion : [])]) p.fuentes.forEach((id) => ids.add(id));
  }
  return [...ids];
}

/** Recalcula las citas de las metodologías con el registro actual (al guardar el plan y cuando cambia una fuente). */
export function arbolConCitas(raiz: NodoPlan, fuentes: Map<number, DatosCitaApa>): NodoPlan {
  const rec = (n: NodoPlan): NodoPlan => {
    const conHijos = { ...n, hijos: n.hijos.map(rec) };
    if (n.componente !== "metodologia" || !n.metodologia) return conHijos;
    const m = leerMetodologia(n);
    return { ...conHijos, metodologia: { parrafos: conCitas(m.parrafos, fuentes), propia: m.propia, fundamentacion: conCitas(m.fundamentacion, fuentes) } };
  };
  return rec(raiz);
}

/** Texto de la metodología con sus citas, un párrafo por línea en blanco (documentos e informe final). */
export const textoMetodologia = (ps: ParrafoCitado[]) => conTexto(ps).map((p) => parrafoConCita(p)).join("\n\n");

/** Forma de la metodología recibida del navegador. */
export function metodologiaValida(x: unknown): boolean {
  if (x === undefined) return true;
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const parrafos = (v: unknown) =>
    Array.isArray(v) && v.length <= MAX_PARRAFOS_METODOLOGIA &&
    v.every((p) => typeof p === "object" && p !== null && typeof (p as ParrafoCitado).texto === "string" && (p as ParrafoCitado).texto.length <= MAX_TEXTO_PARRAFO &&
      Array.isArray((p as ParrafoCitado).fuentes) && (p as ParrafoCitado).fuentes.length <= 20 && (p as ParrafoCitado).fuentes.every((f) => Number.isInteger(f)));
  return parrafos(o.parrafos) && typeof o.propia === "boolean" && parrafos(o.fundamentacion);
}
