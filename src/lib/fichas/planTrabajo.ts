// Plan de trabajo jerárquico: sumas por nivel, plan individual y carga por integrante. Módulo puro.
// Lo usa la vista de ejemplo del constructor y lo usará el editor del plan del egresado (entrega P3).
import type { EtapaPlan } from "./tipos";

export interface NodoPlan {
  /** Identificador estable: los registros de la ejecución (P4) apuntarán a él. */
  id: string;
  /** Numeración visible (1, 1.1, 1.1.1…). Se recalcula con numerar(). */
  codigo: string;
  /** 1 objetivo general, 2 objetivo específico, 3 macroactividad, 4 actividad, 5 subactividad. */
  nivel: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  /** Integrante responsable (id de usuario; en el ejemplo, índice desde 1); null si no tiene responsable propio. */
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
      id: codO,
      codigo: codO,
      nivel: 2,
      titulo: `Objetivo específico ${o + 1}`,
      responsable: porObjetivo ? Math.floor(o / plan.minimos.objetivosPorIntegrante) + 1 : null,
      montos: [],
      hijos: Array.from({ length: macro }, (_, m) => {
        const codM = `${codO}.${m + 1}`;
        return {
          id: codM,
          codigo: codM,
          nivel: 3,
          titulo: `Macroactividad ${m + 1}`,
          responsable: null,
          montos: [],
          hijos: Array.from({ length: porObjetivo ? actividades : Math.max(actividades, integrantes) }, (_, a) => {
            hoja++;
            const conSub = plan.subactividades === "obligatorio";
            const act: NodoPlan = {
              id: `${codM}.${a + 1}`,
              codigo: `${codM}.${a + 1}`,
              nivel: 4,
              titulo: `Actividad ${a + 1}`,
              responsable: porObjetivo ? null : (a % integrantes) + 1,
              montos: conSub ? [] : plan.presupuesto.activo ? monto(hoja) : [],
              hijos: [],
            };
            if (conSub) {
              act.hijos = [{ id: `${act.codigo}.1`, codigo: `${act.codigo}.1`, nivel: 5, titulo: "Subactividad 1", responsable: null, montos: plan.presupuesto.activo ? monto(hoja) : [], hijos: [] }];
            }
            return act;
          }),
        };
      }),
    };
  });
  return { id: "1", codigo: "1", nivel: 1, titulo: "Objetivo general", responsable: null, montos: [], hijos: objetivos };
}

// ─────────────── Plan real del equipo (entrega P3) ───────────────

/** Recalcula la numeración (1, 1.1, 1.1.1…) según la posición de cada nodo. */
export function numerar(raiz: NodoPlan): NodoPlan {
  const rec = (n: NodoPlan, codigo: string): NodoPlan => ({
    ...n,
    codigo,
    hijos: n.hijos.map((h, i) => rec(h, `${codigo}.${i + 1}`)),
  });
  return rec(raiz, "1");
}

/** Responsable efectivo de cada nodo (el suyo o el heredado del nivel superior), por id de nodo. */
export function responsables(raiz: NodoPlan): Map<string, number | null> {
  const m = new Map<string, number | null>();
  const rec = (n: NodoPlan, heredado: number | null) => {
    const r = n.responsable ?? heredado;
    m.set(n.id, r);
    n.hijos.forEach((h) => rec(h, r));
  };
  rec(raiz, null);
  return m;
}

export interface ProblemaPlan {
  nodoId: string | null;
  mensaje: string;
}

const NOMBRE_NIVEL = ["", "objetivo general", "objetivo específico", "macroactividad", "actividad", "subactividad"];

/**
 * Revisa el plan contra las reglas de la ficha antes de enviarlo al asesor. El reparto equitativo NO se valida:
 * lo decide el asesor con el panel de carga. Sí se exige que cada integrante tenga su parte mínima.
 */
export function validarPlanEquipo(raiz: NodoPlan, plan: EtapaPlan, integrantes: number[], columnas: number): ProblemaPlan[] {
  const problemas: ProblemaPlan[] = [];
  const p = (nodo: NodoPlan | null, mensaje: string) => problemas.push({ nodoId: nodo?.id ?? null, mensaje });
  const equipo = integrantes.length > 1;
  const resp = responsables(raiz);

  const recorrer = (n: NodoPlan) => {
    if (!n.titulo.trim()) p(n, `${n.codigo}: falta el título de la ${NOMBRE_NIVEL[n.nivel]}.`);
    if (n.nivel === 2 && n.hijos.length < plan.minimos.macroPorObjetivo) p(n, `${n.codigo}: necesita al menos ${plan.minimos.macroPorObjetivo} macroactividad(es).`);
    if (n.nivel === 3 && n.hijos.length < plan.minimos.actividadesPorMacro) p(n, `${n.codigo}: necesita al menos ${plan.minimos.actividadesPorMacro} actividad(es).`);
    if (n.nivel === 4 && plan.subactividades === "obligatorio" && n.hijos.length === 0) p(n, `${n.codigo}: la ficha pide subactividades.`);
    if (n.nivel === 4 && plan.subactividades === "no" && n.hijos.length > 0) p(n, `${n.codigo}: la ficha no usa subactividades.`);
    if (n.hijos.length === 0 && n.nivel >= 4) {
      const montos = Array.from({ length: columnas }, (_, i) => n.montos[i] ?? 0);
      if (montos.some((m) => m < 0)) p(n, `${n.codigo}: hay montos negativos.`);
      if (!montos.some((m) => m > 0)) p(n, `${n.codigo}: marca al menos un ${plan.granularidad === "subperiodo" ? "subperíodo" : "período"} en que se ejecuta.`);
    }
    if (equipo && n.nivel >= 2 && resp.get(n.id) == null) {
      const nivelResp = plan.equipo.responsable === "objetivo" ? 2 : 4;
      if (n.nivel === nivelResp) p(n, `${n.codigo}: falta el integrante responsable.`);
    }
    if (equipo && resp.get(n.id) != null && !integrantes.includes(resp.get(n.id)!)) p(n, `${n.codigo}: el responsable ya no es parte del equipo.`);
    n.hijos.forEach(recorrer);
  };
  if (raiz.hijos.length === 0) p(null, "El plan no tiene objetivos específicos.");
  recorrer(raiz);

  // Mínimo de objetivos por integrante (en equipo, contados por responsable).
  for (const id of integrantes) {
    const propio = equipo ? planIndividual(raiz, id) : raiz;
    const objetivos = propio ? propio.hijos.length : 0;
    if (equipo && plan.equipo.responsable === "objetivo" && objetivos < plan.minimos.objetivosPorIntegrante) {
      p(null, `Cada integrante debe tener al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos; uno de ellos tiene ${objetivos}.`);
      break;
    }
    if (!equipo && objetivos < plan.minimos.objetivosPorIntegrante) p(null, `El plan necesita al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos.`);
    if (equipo && plan.equipo.responsable === "actividad" && !propio) {
      p(null, "Todos los integrantes deben tener actividades a su cargo.");
      break;
    }
  }
  return problemas;
}

/**
 * Un integrante que no es el líder solo puede cambiar lo que es suyo (su responsable efectivo es él):
 * títulos, montos y nodos nuevos debajo de lo suyo. Devuelve el primer cambio no permitido, o null.
 */
export function cambioNoPermitido(anterior: NodoPlan, nuevo: NodoPlan, integrante: number): string | null {
  const respA = responsables(anterior);
  const respN = responsables(nuevo);
  const plano = (r: NodoPlan) => new Map(aplanar(r).map((n) => [n.id, n]));
  const a = plano(anterior);
  const n = plano(nuevo);
  const firma = (x: NodoPlan) => JSON.stringify({ t: x.titulo, r: x.responsable, m: x.montos, h: x.hijos.map((h) => h.id) });
  for (const [id, viejo] of a) {
    const actual = n.get(id);
    const eraSuyo = respA.get(id) === integrante;
    if (!actual) {
      if (!eraSuyo) return `Se quitó "${viejo.titulo}", que no está a tu cargo.`;
      continue;
    }
    if (firma(viejo) !== firma(actual) && !eraSuyo) return `Se cambió "${viejo.titulo}", que no está a tu cargo.`;
    if (actual.responsable !== viejo.responsable) return "Solo el líder asigna responsables.";
  }
  for (const [id, nodo] of n) {
    if (!a.has(id) && respN.get(id) !== integrante) return `"${nodo.titulo || "Un nodo nuevo"}" se agregó fuera de lo que está a tu cargo.`;
  }
  return null;
}

/** Carga de cada integrante por id de usuario (para el panel del asesor). */
export function cargaPorIds(raiz: NodoPlan, ids: number[], columnas: number): CargaIntegrante[] {
  return ids.map((id) => {
    const propio = planIndividual(raiz, id);
    const c: CargaIntegrante = { integrante: id, objetivos: 0, macroactividades: 0, actividades: 0, monto: 0 };
    if (!propio) return c;
    for (const x of aplanar(propio)) {
      if (x.nivel === 2) c.objetivos++;
      if (x.nivel === 3) c.macroactividades++;
      if (x.nivel === 4) c.actividades++;
    }
    c.monto = totalesNodo(propio, columnas).reduce((s, v) => s + v, 0);
    return c;
  });
}

// ─────────────── Ejecución del proyecto (entrega P4) ───────────────

/** Avance que dejó un registro de ejecución; solo se usa para arrastrar lo pendiente al período siguiente. */
export interface AvanceRegistrado {
  nodoId: string;
  periodo: number;
  avance: number | null;
  /** Los borradores no cuentan: el avance vale cuando el responsable lo envía. */
  estado?: string;
}

const planificadaEn = (n: NodoPlan, columnas: { periodo: number }[]) =>
  [...new Set(columnas.map((c, i) => ((n.montos[i] ?? 0) > 0 ? c.periodo : 0)).filter((p) => p > 0))];

/**
 * Actividades que no estaban planificadas en el período, pero que vienen de uno anterior sin llegar al 100 %:
 * el resto pasa a este período (por ejemplo, 70 % en el período 1 → sigue en el 2). Devuelve, por actividad, el
 * último período en que estaba planificada y el avance con el que llega. Sin registro previo, llega con 0 %.
 */
export function arrastradasAlPeriodo(
  raiz: NodoPlan,
  periodo: number,
  columnas: { periodo: number }[],
  registros: AvanceRegistrado[]
): Map<string, { desde: number; avance: number }> {
  const m = new Map<string, { desde: number; avance: number }>();
  for (const n of aplanar(raiz)) {
    if (n.hijos.length > 0 || n.nivel < 4) continue;
    const planes = planificadaEn(n, columnas);
    if (planes.includes(periodo)) continue;
    const anteriores = planes.filter((p) => p < periodo);
    if (anteriores.length === 0) continue;
    const ultimo = registros
      .filter((r) => r.nodoId === n.id && r.periodo < periodo && r.estado !== "borrador")
      .sort((a, b) => b.periodo - a.periodo)[0];
    const avance = ultimo?.avance ?? 0;
    if (avance < 100) m.set(n.id, { desde: Math.max(...anteriores), avance });
  }
  return m;
}

/**
 * Actividades (hojas de nivel 4 o 5) del período: las planificadas en él (con monto o marca en alguna de sus columnas)
 * y, si se pasan los registros (la ficha pide avance), las que vienen incompletas de un período anterior. Los registros
 * solo se pasan para períodos ya abiertos: en uno futuro todavía no se sabe qué quedará pendiente.
 */
export function actividadesDelPeriodo(
  raiz: NodoPlan,
  periodo: number,
  columnas: { periodo: number }[],
  registros?: AvanceRegistrado[] | null
): NodoPlan[] {
  const cols = columnas.map((c, i) => (c.periodo === periodo ? i : -1)).filter((i) => i >= 0);
  const arrastradas = registros ? arrastradasAlPeriodo(raiz, periodo, columnas, registros) : new Map();
  return aplanar(raiz).filter(
    (n) => n.hijos.length === 0 && n.nivel >= 4 && (cols.some((i) => (n.montos[i] ?? 0) > 0) || arrastradas.has(n.id))
  );
}

/**
 * Avance de cada nodo: las hojas toman el último avance registrado (0 si no hay); los demás niveles, el promedio de
 * sus hijos. Así el objetivo general refleja el avance del proyecto completo, como pide el informe de avances.
 */
export function avancePorNodo(raiz: NodoPlan, avanceHoja: Map<string, number>): Map<string, number> {
  const m = new Map<string, number>();
  const rec = (n: NodoPlan): number => {
    const v = n.hijos.length === 0 ? (avanceHoja.get(n.id) ?? 0) : n.hijos.map(rec).reduce((a, b) => a + b, 0) / n.hijos.length;
    m.set(n.id, Math.round(v));
    return v;
  };
  rec(raiz);
  return m;
}

export interface ReglasRegistroProyecto {
  acciones: { min: number; max: number };
  resultado: { min: number; max: number };
  marcoTeorico: "obligatorio" | "opcional" | "no";
  avance: boolean;
}

const contarPalabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Problemas de un registro antes de enviarlo al asesor. 0 en mínimo o máximo = sin límite (sin métrica). */
export function validarRegistroProyecto(
  r: { avance: number | null; acciones: string; resultado: string; marcoTeorico: string },
  reglas: ReglasRegistroProyecto
): string[] {
  const p: string[] = [];
  const rango = (nombre: string, texto: string, { min, max }: { min: number; max: number }) => {
    const n = contarPalabras(texto);
    if (!texto.trim()) p.push(`Falta ${nombre}.`);
    else if (min > 0 && n < min) p.push(`${nombre[0].toUpperCase()}${nombre.slice(1)}: al menos ${min} palabras (lleva ${n}).`);
    else if (max > 0 && n > max) p.push(`${nombre[0].toUpperCase()}${nombre.slice(1)}: hasta ${max} palabras (lleva ${n}).`);
  };
  if (reglas.avance && (r.avance === null || !Number.isInteger(r.avance) || r.avance < 0 || r.avance > 100)) p.push("Indica el avance de la actividad (0 a 100 %).");
  rango("la descripción de las acciones realizadas", r.acciones, reglas.acciones);
  rango("el resultado obtenido", r.resultado, reglas.resultado);
  if (reglas.marcoTeorico === "obligatorio" && !r.marcoTeorico.trim()) p.push("La ficha pide marco teórico.");
  return p;
}
