// Valoraciones al cierre del proceso (specs/VALORACIONES_EMPRESAS_ASESORES.md, entrega V3). Módulo puro: aspectos que
// se valoran, escala, conversión de la visita de 90 días a puntaje y promedios históricos.

import type { Respuestas } from "@/lib/formularioVisita";

export const PUNTAJE_MINIMO = 1;
export const PUNTAJE_MAXIMO = 10;
export const LARGO_MAXIMO_COMENTARIO = 1000;

export type EvaluadorRol = "egresado" | "asesor";
export type Objetivo = "empresa" | "asesor" | "egresado";
/** Quién valora a quién: egresado→empresa, egresado→asesor, asesor→empresa, asesor→egresado. */
export type TipoValoracion = "egresado_empresa" | "egresado_asesor" | "asesor_empresa" | "asesor_egresado";

export interface Aspecto {
  clave: string;
  nombre: string;
  ayuda: string;
}

export const ASPECTOS: Record<TipoValoracion, Aspecto[]> = {
  egresado_empresa: [
    { clave: "acompanamiento", nombre: "Acompañamiento del supervisor", ayuda: "El supervisor estuvo disponible, orientó y dio seguimiento a tu trabajo." },
    { clave: "condiciones", nombre: "Condiciones de trabajo", ayuda: "Espacio, equipo y recursos para realizar las actividades." },
    { clave: "pertinencia", nombre: "Actividades acordes a la carrera", ayuda: "Lo que hiciste se relaciona con tu formación y con lo acordado." },
    { clave: "ambiente", nombre: "Trato y ambiente", ayuda: "Respeto, comunicación y ambiente laboral." },
  ],
  egresado_asesor: [
    { clave: "disponibilidad", nombre: "Disponibilidad y tiempo de respuesta", ayuda: "Respondió y revisó tus entregas en un tiempo razonable." },
    { clave: "claridad", nombre: "Claridad de las observaciones", ayuda: "Sus observaciones fueron claras y te ayudaron a mejorar." },
    { clave: "dominio", nombre: "Dominio del tema", ayuda: "Conocía el área del trabajo y supo orientarte." },
    { clave: "acompanamiento", nombre: "Acompañamiento en todo el proceso", ayuda: "Te acompañó desde la propuesta hasta el cierre." },
  ],
  asesor_empresa: [
    { clave: "apoyo", nombre: "Apoyo al proceso del egresado", ayuda: "La empresa facilitó que el egresado cumpliera su plan." },
    { clave: "condiciones", nombre: "Condiciones de trabajo", ayuda: "Espacio, equipo y recursos que la empresa dio al egresado." },
    { clave: "comunicacion", nombre: "Comunicación con el supervisor", ayuda: "El supervisor atendió la visita, las llamadas y los correos." },
    { clave: "cumplimiento", nombre: "Cumplimiento de lo acordado", ayuda: "La empresa respetó horarios, actividades y compromisos de la carta." },
  ],
  asesor_egresado: [
    { clave: "responsabilidad", nombre: "Responsabilidad y puntualidad", ayuda: "Entregó a tiempo y cumplió lo planificado." },
    { clave: "calidad", nombre: "Calidad del trabajo", ayuda: "Calidad de los informes, productos y resultados." },
    { clave: "actitud", nombre: "Actitud y comunicación", ayuda: "Disposición, respeto y comunicación con el asesor y la empresa." },
    { clave: "autonomia", nombre: "Autonomía", ayuda: "Resolvió problemas y avanzó sin depender de instrucciones constantes." },
  ],
};

export const tipoDe = (rol: EvaluadorRol, objetivo: Objetivo): TipoValoracion => `${rol}_${objetivo}` as TipoValoracion;

export function validarPuntajes(tipo: TipoValoracion, puntajes: Record<string, unknown>): string | null {
  for (const a of ASPECTOS[tipo]) {
    const v = puntajes[a.clave];
    if (typeof v !== "number" || !Number.isInteger(v) || v < PUNTAJE_MINIMO || v > PUNTAJE_MAXIMO) {
      return `Califica «${a.nombre}» de ${PUNTAJE_MINIMO} a ${PUNTAJE_MAXIMO}.`;
    }
  }
  return null;
}

export const redondear = (n: number) => Math.round(n * 100) / 100;

export function promedio(valores: number[]): number | null {
  const v = valores.filter((x) => Number.isFinite(x));
  return v.length ? redondear(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export function promedioPuntajes(tipo: TipoValoracion, puntajes: Record<string, number>): number {
  return promedio(ASPECTOS[tipo].map((a) => puntajes[a.clave]))!;
}

// ── Visita de 90 días: preguntas que miden a la empresa, con el puntaje de cada opción ──
// La mejor opción vale 10 y la peor 1. Una opción con valor null no aplica y no cuenta en el promedio.

export const PREGUNTAS_VISITA_EMPRESA: { id: string; nombre: string; puntajes: Record<string, number | null> }[] = [
  {
    id: "ubicacion_acceso",
    nombre: "Facilidad de acceso",
    puntajes: {
      "Sí": 10,
      "Parcialmente, si no se cuenta con vehículo propio es complicado": 6,
      "Parcialmente, la empresa se encuentra bastante retirada de los accesos primarios y toma mucho tiempo llegar hasta ella": 4,
      "No": 1,
    },
  },
  {
    id: "estado_fisico",
    nombre: "Estado físico de la empresa",
    puntajes: { "Excelente estado": 10, "Muy buen estado": 8, "Buen estado": 6, "Regular estado": 4, "Mal estado": 1 },
  },
  {
    id: "espacio_adecuado",
    nombre: "Espacio adecuado y seguro",
    puntajes: { "Sí, de forma permanente": 10, "No, de forma permanente": 4, "No": 1 },
  },
  {
    id: "equipo_necesario",
    nombre: "Equipo necesario",
    puntajes: {
      "Sí": 10,
      "No": 1,
      "No, no es necesaria la utilización de equipo o herramientas para el desarrollo de las actividades": null,
      "No, el pasante utiliza equipo propio o ha tenido que adquirir sus herramientas": 3,
    },
  },
  { id: "condiciones_sanitarias", nombre: "Condiciones sanitarias", puntajes: { "Sí": 10, "No": 1 } },
  { id: "respeto_mutuo", nombre: "Ambiente de respeto", puntajes: { "Sí": 10, "No": 1 } },
];

/** Puntaje de 1 a 10 de la empresa según la visita de 90 días; null si la visita no responde ninguna de las preguntas. */
export function puntajeVisita(respuestas: Respuestas | null | undefined): { puntaje: number | null; detalle: { nombre: string; puntaje: number }[] } {
  const detalle: { nombre: string; puntaje: number }[] = [];
  for (const p of PREGUNTAS_VISITA_EMPRESA) {
    const r = respuestas?.[p.id];
    if (typeof r !== "string") continue;
    const v = p.puntajes[r];
    if (typeof v === "number") detalle.push({ nombre: p.nombre, puntaje: v });
  }
  return { puntaje: promedio(detalle.map((d) => d.puntaje)), detalle };
}

// ── Promedios históricos ──

export interface ValoracionGuardada {
  propuestaId: number;
  tipo: TipoValoracion;
  evaluadoId: number;
  promedio: number;
  puntajes: Record<string, number>;
  comentario: string | null;
  creadoEn: string;
  cohorte: string;
}

export interface ResumenValoracion {
  /** Promedio histórico: primero se promedia cada proceso y luego los procesos entre sí. */
  promedio: number | null;
  procesos: number;
  /** La valoración del proceso más reciente (por fecha de la valoración). */
  ultima: { promedio: number; cohorte: string; fecha: string } | null;
  /** Promedio por aspecto, en el mismo orden de ASPECTOS. */
  porAspecto: { clave: string; nombre: string; promedio: number | null }[];
}

/** Resume valoraciones de un mismo tipo (p. ej. las de egresados a una empresa) agrupándolas por proceso. */
export function resumir(tipo: TipoValoracion, valoraciones: ValoracionGuardada[]): ResumenValoracion {
  const porProceso = new Map<number, ValoracionGuardada[]>();
  valoraciones.forEach((v) => porProceso.set(v.propuestaId, [...(porProceso.get(v.propuestaId) ?? []), v]));
  const promediosProceso = [...porProceso.values()].map((lista) => promedio(lista.map((v) => v.promedio))!);

  const ultimaV = [...valoraciones].sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1))[0];
  const ultima = ultimaV
    ? { promedio: promedio((porProceso.get(ultimaV.propuestaId) ?? []).map((v) => v.promedio))!, cohorte: ultimaV.cohorte, fecha: ultimaV.creadoEn }
    : null;

  return {
    promedio: promedio(promediosProceso),
    procesos: porProceso.size,
    ultima,
    porAspecto: ASPECTOS[tipo].map((a) => ({
      clave: a.clave,
      nombre: a.nombre,
      promedio: promedio(valoraciones.map((v) => v.puntajes[a.clave]).filter((x): x is number => typeof x === "number")),
    })),
  };
}

/**
 * Nota del asesor sobre una empresa en un proceso: promedio de su valoración al cierre y del puntaje de la visita de
 * 90 días. Si solo hay una de las dos, cuenta esa.
 */
export function notaAsesorEmpresa(valoracionCierre: number | null, visita: number | null): number | null {
  return promedio([valoracionCierre, visita].filter((x): x is number => x != null));
}

/** Nota general de la empresa: promedio de la nota de los egresados y la de los asesores. */
export function notaGeneral(egresados: number | null, asesores: number | null): number | null {
  return promedio([egresados, asesores].filter((x): x is number => x != null));
}

/** Tono para mostrar una nota: alta (8 o más), media (6 a menos de 8) o baja (menos de 6). */
export function tonoNota(n: number | null): "alta" | "media" | "baja" | "ninguna" {
  if (n == null) return "ninguna";
  return n >= 8 ? "alta" : n >= 6 ? "media" : "baja";
}

export const formatoNota = (n: number | null) => (n == null ? "—" : n.toFixed(1));
