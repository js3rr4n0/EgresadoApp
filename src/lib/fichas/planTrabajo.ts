// Plan de trabajo jerárquico: sumas por nivel, plan individual y carga por integrante. Módulo puro.
// Lo usa la vista de ejemplo del constructor y lo usará el editor del plan del egresado (entrega P3).
import type { EtapaPlan } from "./tipos";

export interface NodoPlan {
  codigo: string;
  /** 1 objetivo general, 2 objetivo específico, 3 macroactividad, 4 actividad, 5 subactividad. */
  nivel: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  /** Integrante responsable (índice desde 1); null si el nodo no tiene responsable propio. */
  responsable: number | null;
  /** Monto por columna del cronograma (subperíodo o período). Solo lo llevan las hojas; los demás niveles suman. */
  montos: number[];
  hijos: NodoPlan[];
}

/** Monto por columna de un nodo: el suyo si es hoja, o la suma de sus hijos (consecuencia lógica). */
export function totalesNodo(n: NodoPlan, columnas: number): number[] {
  if (n.hijos.length === 0) return Array.from({ length: columnas }, (_, i) => n.montos[i] ?? 0);
  const total = Array<number>(columnas).fill(0);
  for (const h of n.hijos) totalesNodo(h, columnas).forEach((v, i) => (total[i] += v));
  return total;
}

/** Responsable efectivo: el del nodo o, si no tiene, el del nodo superior más cercano. */
function conHerencia(n: NodoPlan, heredado: number | null): NodoPlan {
  const r = n.responsable ?? heredado;
  return { ...n, responsable: r, hijos: n.hijos.map((h) => conHerencia(h, r)) };
}

/** Plan individual: las ramas del integrante, con sus niveles superiores para no perder la consecuencia lógica. */
export function planIndividual(raiz: NodoPlan, integrante: number): NodoPlan | null {
  const filtrar = (n: NodoPlan): NodoPlan | null => {
    if (n.hijos.length === 0) return n.responsable === integrante ? n : null;
    const hijos = n.hijos.map(filtrar).filter((h): h is NodoPlan => h !== null);
    return hijos.length > 0 ? { ...n, hijos } : null;
  };
  return filtrar(conHerencia(raiz, null));
}

export interface CargaIntegrante {
  integrante: number;
  objetivos: number;
  macroactividades: number;
  actividades: number;
  monto: number;
}

/** Carga de cada integrante, para que el asesor juzgue si el reparto es equitativo (no lo decide el sistema). */
export function cargaPorIntegrante(raiz: NodoPlan, integrantes: number, columnas: number): CargaIntegrante[] {
  return Array.from({ length: integrantes }, (_, k) => {
    const i = k + 1;
    const propio = planIndividual(raiz, i);
    const c: CargaIntegrante = { integrante: i, objetivos: 0, macroactividades: 0, actividades: 0, monto: 0 };
    const recorrer = (n: NodoPlan) => {
      if (n.nivel === 2) c.objetivos++;
      if (n.nivel === 3) c.macroactividades++;
      if (n.nivel === 4) c.actividades++;
      n.hijos.forEach(recorrer);
    };
    if (propio) {
      recorrer(propio);
      c.monto = totalesNodo(propio, columnas).reduce((a, b) => a + b, 0);
    }
    return c;
  });
}

/** Recorre el árbol en orden de lectura (para mostrarlo como tabla). */
export function aplanar(n: NodoPlan): NodoPlan[] {
  return [n, ...n.hijos.flatMap(aplanar)];
}

/**
 * Plan de ejemplo para la vista del constructor: respeta los mínimos de la ficha y reparte los objetivos o las
 * actividades entre los integrantes según el nivel del responsable. Los montos son deterministas.
 */
export function planEjemplo(plan: EtapaPlan, integrantes: number, columnas: number): NodoPlan {
  const porObjetivo = plan.equipo.responsable === "objetivo";
  const totalObjetivos = plan.minimos.objetivosPorIntegrante * (porObjetivo ? integrantes : 1);
  const macro = Math.min(plan.minimos.macroPorObjetivo, 2);
  const actividades = Math.min(plan.minimos.actividadesPorMacro, 2);
  let hoja = 0;
  const monto = (semilla: number) =>
    Array.from({ length: columnas }, (_, c) => ((semilla + c) % 2 === 0 ? (((semilla * 37 + c * 53) % 8) + 1) * 25 : 0));

  const objetivos: NodoPlan[] = Array.from({ length: totalObjetivos }, (_, o) => {
    const codO = `1.${o + 1}`;
    return {
      codigo: codO,
      nivel: 2,
      titulo: `Objetivo específico ${o + 1}`,
      responsable: porObjetivo ? Math.floor(o / plan.minimos.objetivosPorIntegrante) + 1 : null,
      montos: [],
      hijos: Array.from({ length: macro }, (_, m) => {
        const codM = `${codO}.${m + 1}`;
        return {
          codigo: codM,
          nivel: 3,
          titulo: `Macroactividad ${m + 1}`,
          responsable: null,
          montos: [],
          hijos: Array.from({ length: porObjetivo ? actividades : Math.max(actividades, integrantes) }, (_, a) => {
            hoja++;
            const conSub = plan.subactividades === "obligatorio";
            const act: NodoPlan = {
              codigo: `${codM}.${a + 1}`,
              nivel: 4,
              titulo: `Actividad ${a + 1}`,
              responsable: porObjetivo ? null : (a % integrantes) + 1,
              montos: conSub ? [] : plan.presupuesto.activo ? monto(hoja) : [],
              hijos: [],
            };
            if (conSub) {
              act.hijos = [{ codigo: `${act.codigo}.1`, nivel: 5, titulo: "Subactividad 1", responsable: null, montos: plan.presupuesto.activo ? monto(hoja) : [], hijos: [] }];
            }
            return act;
          }),
        };
      }),
    };
  });
  return { codigo: "1", nivel: 1, titulo: "Objetivo general", responsable: null, montos: [], hijos: objetivos };
}
