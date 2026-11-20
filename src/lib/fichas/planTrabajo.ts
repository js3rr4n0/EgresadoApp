// Plan de trabajo jerárquico: sumas por nivel, plan individual y carga por integrante. Módulo puro.
// Lo usa la vista de ejemplo del constructor y lo usará el editor del plan del egresado (entrega P3).
import {
  cierreDe, COMPONENTES_CIERRE, componentesDe, documentoSolicitado, esCronogramaInvestigacion, productosObjetivo,
  type ClaveComponente, type ConfigComponente, type EtapaPlan,
} from "./tipos";
import type { ParrafoCitado } from "./fuentes";
import { leerMetodologia, pideMetodologia, problemasMetodologia } from "./metodologiaPlan";

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
  /**
   * Solo actividades (nivel 4), si la ficha pide "documento solicitado": el documento que el egresado entregará como
   * prueba. Se le recuerda al subir sus evidencias y aparece en "Resultados por actividad" (investigación).
   */
  documento?: string;
  /**
   * Solo objetivos específicos (nivel 2), si la ficha pide productos por objetivo: los productos que se entregarán al
   * terminar sus actividades, junto con la conclusión del objetivo (notas del 13-nov-2026). Ver productosDe().
   */
  productos?: string[];
  /**
   * Cronograma de investigación (notas del 19-nov-2026): elemento del proceso al que corresponde el nodo de nivel 3
   * (metodología, desarrollo, resultados…). Lo crea el sistema; no se borra ni se renombra.
   */
  componente?: ClaveComponente;
  /** Cronograma de investigación: el nodo de nivel 2 es el bloque de preparación del informe final, no un objetivo. */
  cierre?: boolean;
  /**
   * Cronograma de investigación (E3): elemento opcional (la discusión). Solo cuenta en el avance si se usa: tiene algo
   * planificado o algún avance registrado. Lo pone normalizarArbol según la ficha.
   */
  opcional?: boolean;
  /** Solo el elemento "Metodología" de un objetivo (entrega E2): el procedimiento con sus citas. Ver metodologiaPlan.ts. */
  metodologia?: { parrafos: ParrafoCitado[]; propia: boolean; fundamentacion: ParrafoCitado[] };
}

/**
 * Hoja del plan, es decir, lo que se planifica y se registra: una actividad o subactividad sin hijos o, en el cronograma
 * de investigación, un elemento del proceso sin subactividades.
 */
export const esHojaPlan = (n: Pick<NodoPlan, "hijos" | "nivel" | "componente">) => n.hijos.length === 0 && (n.nivel >= 4 || !!n.componente);

/** Objetivos específicos del plan (sin el bloque de preparación del informe final). */
export const objetivosEspecificos = (raiz: NodoPlan) => raiz.hijos.filter((h) => h.nivel === 2 && !h.cierre);

/**
 * Cronograma de investigación: deja cada objetivo con sus elementos del proceso, en el orden y con el nombre de la ficha,
 * y el bloque de preparación del informe al final si la ficha lo pide. Conserva las subactividades y lo planificado de
 * los elementos que ya existían. En un cronograma de proyecto devuelve el árbol tal cual.
 */
export function normalizarArbol(raiz: NodoPlan, plan: EtapaPlan): NodoPlan {
  if (!esCronogramaInvestigacion(plan)) return raiz;
  const elementos = (padre: NodoPlan, config: ConfigComponente[]): NodoPlan[] =>
    config.map((c) => {
      const previo = padre.hijos.find((h) => h.componente === c.clave);
      const hijos = (previo?.hijos ?? []).map((s) => ({ ...s, nivel: 4 as const, componente: undefined, hijos: [] }));
      return {
        id: previo?.id ?? `${padre.id}-${c.clave}`,
        codigo: "",
        nivel: 3,
        titulo: c.nombre,
        responsable: previo?.responsable ?? null,
        montos: hijos.length ? [] : (previo?.montos ?? []),
        hijos,
        componente: c.clave,
        ...(c.obligatorio ? {} : { opcional: true }),
        ...(c.clave === "metodologia" && previo?.metodologia ? { metodologia: previo.metodologia } : {}),
      };
    });
  const objetivos = raiz.hijos
    .filter((h) => !h.cierre)
    // Sin productos ni documentos: en investigación las evidencias van en los registros.
    .map((o) => ({ ...o, productos: undefined, documento: undefined, hijos: elementos(o, componentesDe(plan)) }));
  const cierre = cierreDe(plan);
  const previo = raiz.hijos.find((h) => h.cierre);
  const bloque: NodoPlan = {
    id: previo?.id ?? "cierre",
    codigo: "",
    nivel: 2,
    titulo: cierre.titulo,
    responsable: null,
    montos: [],
    hijos: [],
    cierre: true,
  };
  bloque.hijos = elementos(previo ?? bloque, COMPONENTES_CIERRE);
  return numerar({ ...raiz, hijos: cierre.activo ? [...objetivos, bloque] : objetivos });
}

/** Productos esperados de un objetivo, sin líneas vacías. */
export const productosDe = (n: Pick<NodoPlan, "productos">) => (n.productos ?? []).map((p) => p.trim()).filter(Boolean);

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
    // El bloque de preparación del informe final es de todo el equipo.
    if (n.cierre) return n;
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
      if (n.nivel === 2 && !n.cierre) c.objetivos++;
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
  if (esCronogramaInvestigacion(plan)) return ejemploInvestigacion(plan, integrantes, columnas);
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
      ...(productosObjetivo(plan) !== "no" ? { productos: [`Producto esperado del objetivo ${o + 1}`] } : {}),
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

/**
 * Cronograma de investigación de ejemplo: cada objetivo con sus elementos del proceso, uno tras otro en el tiempo (el
 * desarrollo con dos subactividades y la discusión sin planificar) y el bloque de preparación del informe al final.
 */
function ejemploInvestigacion(plan: EtapaPlan, integrantes: number, columnas: number): NodoPlan {
  const total = plan.minimos.objetivosPorIntegrante * integrantes;
  const objetivos: NodoPlan[] = Array.from({ length: total }, (_, o) => ({
    id: `o${o + 1}`,
    codigo: "",
    nivel: 2,
    titulo: `Objetivo específico ${o + 1}`,
    responsable: Math.floor(o / plan.minimos.objetivosPorIntegrante) + 1,
    montos: [],
    hijos: [],
  }));
  const base = normalizarArbol({ id: "og", codigo: "1", nivel: 1, titulo: "Objetivo general", responsable: null, montos: [], hijos: objetivos }, plan);
  const ultima = Math.max(columnas - 1, 0);
  // El tramo de cada objetivo deja libre el último sexto del cronograma para preparar el informe.
  const tramo = Math.max(1, Math.floor((columnas * 5) / 6));
  let k = 0;
  const marcar = (inicio: number, largo: number) => {
    k++;
    const m = Array<number>(columnas).fill(0);
    for (let c = inicio; c < Math.min(inicio + largo, columnas); c++) m[c] = plan.presupuesto.activo ? (((k * 37 + c * 53) % 6) + 1) * 25 : 1;
    return m;
  };
  const conMontos = (n: NodoPlan, o: number): NodoPlan => {
    if (n.cierre) {
      const ini = Math.min(tramo, ultima);
      return { ...n, hijos: n.hijos.map((e, j) => ({ ...e, montos: marcar(Math.min(ini + j, ultima), columnas - ini) })) };
    }
    if (n.nivel !== 2) return n;
    const obligatorios = n.hijos.filter((e) => e.componente !== "discusion");
    const paso = Math.max(1, Math.floor(tramo / (obligatorios.length + total - 1)));
    return {
      ...n,
      hijos: n.hijos.map((e) => {
        const j = obligatorios.indexOf(e);
        if (j < 0) return e;
        const inicio = Math.min((o + j) * paso, ultima);
        if (e.componente === "desarrollo") {
          return {
            ...e,
            montos: [],
            hijos: [1, 2].map((s) => ({ id: `${e.id}-${s}`, codigo: "", nivel: 4 as const, titulo: `Subactividad ${s}`, responsable: null, montos: marcar(Math.min(inicio + s - 1, ultima), 1), hijos: [] })),
          };
        }
        // Metodología de ejemplo con una cita (entrega E2).
        const metodologia = e.componente === "metodologia" && plan.metodologiaObjetivo
          ? { metodologia: { parrafos: [{ texto: `Procedimiento del objetivo ${o + 1}: técnicas, instrumentos y participantes.`, fuentes: [1], cita: "Hernández-Sampieri y Mendoza, 2018" }], propia: false, fundamentacion: [] } }
          : {};
        return { ...e, ...metodologia, montos: marcar(inicio, paso) };
      }),
    };
  };
  return numerar({ ...base, hijos: base.hijos.map((h, o) => conMontos(h, o)) });
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

  const investigacion = esCronogramaInvestigacion(plan);
  const opcionales = new Set(investigacion ? componentesDe(plan).filter((c) => !c.obligatorio).map((c) => c.clave) : []);
  const recorrer = (n: NodoPlan) => {
    if (!n.titulo.trim()) p(n, `${n.codigo}: falta el título de la ${investigacion && n.nivel === 4 ? "subactividad" : NOMBRE_NIVEL[n.nivel]}.`);
    if (investigacion) {
      // Cronograma de investigación: los elementos del proceso los pone el sistema; cada uno obligatorio se planifica
      // (él o sus subactividades) y el opcional puede quedar sin planificar.
      if (n.nivel === 2 && !n.cierre && n.hijos.filter((h) => h.componente).length !== componentesDe(plan).length) p(n, `${n.codigo}: faltan elementos del proceso del objetivo.`);
      if (n.componente && !opcionales.has(n.componente) && !totalesNodo(n, columnas).some((m) => m > 0)) {
        p(n, `${n.codigo}: planifica «${n.titulo}» en al menos un ${plan.granularidad === "subperiodo" ? "subperíodo" : "período"}.`);
      }
      if (esHojaPlan(n)) {
        const montos = Array.from({ length: columnas }, (_, i) => n.montos[i] ?? 0);
        if (montos.some((m) => m < 0)) p(n, `${n.codigo}: hay montos negativos.`);
        if (n.nivel === 4 && !montos.some((m) => m > 0)) p(n, `${n.codigo}: marca al menos un ${plan.granularidad === "subperiodo" ? "subperíodo" : "período"} en que se ejecuta.`);
      }
      if (n.nivel > 4) p(n, `${n.codigo}: el cronograma de investigación llega hasta las subactividades.`);
      if (equipo && n.nivel === 2 && !n.cierre && resp.get(n.id) == null) p(n, `${n.codigo}: falta el integrante responsable.`);
      if (n.componente === "metodologia" && pideMetodologia(plan)) problemasMetodologia(n.codigo, leerMetodologia(n)).forEach((m) => p(n, m));
      if (equipo && resp.get(n.id) != null && !integrantes.includes(resp.get(n.id)!)) p(n, `${n.codigo}: el responsable ya no es parte del equipo.`);
      n.hijos.forEach(recorrer);
      return;
    }
    if (n.nivel === 2 && n.hijos.length < plan.minimos.macroPorObjetivo) p(n, `${n.codigo}: necesita al menos ${plan.minimos.macroPorObjetivo} macroactividad(es).`);
    if (n.nivel === 3 && n.hijos.length < plan.minimos.actividadesPorMacro) p(n, `${n.codigo}: necesita al menos ${plan.minimos.actividadesPorMacro} actividad(es).`);
    if (n.nivel === 4 && plan.subactividades === "obligatorio" && n.hijos.length === 0) p(n, `${n.codigo}: la ficha pide subactividades.`);
    if (n.nivel === 4 && plan.subactividades === "no" && n.hijos.length > 0) p(n, `${n.codigo}: la ficha no usa subactividades.`);
    if (n.nivel === 4 && documentoSolicitado(plan) === "obligatorio" && !n.documento?.trim()) {
      p(n, `${n.codigo}: indica el documento que entregarás como prueba de la actividad.`);
    }
    if (n.nivel === 2 && productosObjetivo(plan) === "obligatorio" && productosDe(n).length === 0) {
      p(n, `${n.codigo}: indica al menos un producto esperado del objetivo.`);
    }
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
  if (objetivosEspecificos(raiz).length === 0) p(null, "El plan no tiene objetivos específicos.");
  if (investigacion && cierreDe(plan).activo && !raiz.hijos.some((h) => h.cierre)) p(null, `Falta el bloque «${cierreDe(plan).titulo}».`);
  recorrer(raiz);

  // Mínimo de objetivos por integrante (en equipo, contados por responsable).
  for (const id of integrantes) {
    const propio = equipo ? planIndividual(raiz, id) : raiz;
    const objetivos = propio ? objetivosEspecificos(propio).length : 0;
    if (equipo && plan.equipo.responsable === "objetivo" && objetivos < plan.minimos.objetivosPorIntegrante) {
      p(null, `Cada integrante debe tener al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos; uno de ellos tiene ${objetivos}.`);
      break;
    }
    // H19/H27: también un máximo por integrante (de 3 a 4, como la propuesta).
    const maxObj = plan.minimos.maxObjetivosPorIntegrante;
    if (equipo && plan.equipo.responsable === "objetivo" && maxObj && objetivos > maxObj) {
      p(null, `Cada integrante puede tener hasta ${maxObj} objetivos específicos; uno de ellos tiene ${objetivos}.`);
      break;
    }
    if (!equipo && objetivos < plan.minimos.objetivosPorIntegrante) p(null, `El plan necesita al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos.`);
    if (!equipo && maxObj && objetivos > maxObj) p(null, `El plan admite hasta ${maxObj} objetivos específicos; tiene ${objetivos}.`);
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
  const firma = (x: NodoPlan) => JSON.stringify({ t: x.titulo, r: x.responsable, m: x.montos, d: x.documento ?? "", p: productosDe(x), me: x.metodologia ?? null, h: x.hijos.map((h) => h.id) });
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
      if (x.nivel === 2 && !x.cierre) c.objetivos++;
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

/** Períodos en que la actividad está planificada (con monto o marca), en orden. */
export const periodosPlanificados = (n: NodoPlan, columnas: { periodo: number }[]) => planificadaEn(n, columnas).sort((a, b) => a - b);

/** Último avance enviado de una actividad antes del período indicado (0 si no hay). */
const avanceAntesDe = (nodoId: string, periodo: number, registros: AvanceRegistrado[]) =>
  registros.filter((r) => r.nodoId === nodoId && r.periodo < periodo && r.estado !== "borrador" && r.avance !== null).sort((a, b) => b.periodo - a.periodo)[0]?.avance ?? 0;

/**
 * Actividades menos atadas a su período (notas del 13-nov-2026): si la ficha lo permite, una actividad planificada
 * solo en períodos posteriores se puede adelantar y registrar en el período abierto, mientras no esté terminada.
 */
export function adelantable(raiz: NodoPlan, nodoId: string, periodoActual: number, columnas: { periodo: number }[], registros: AvanceRegistrado[]): boolean {
  const n = aplanar(raiz).find((x) => x.id === nodoId);
  if (!n || !esHojaPlan(n)) return false;
  const planes = periodosPlanificados(n, columnas);
  if (planes.length === 0 || planes[0] <= periodoActual) return false;
  return avanceAntesDe(nodoId, periodoActual + 1, registros) < 100;
}

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
    if (!esHojaPlan(n)) continue;
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
 * solo se pasan para períodos ya abiertos: en uno futuro todavía no se sabe qué quedará pendiente. Con registros, además,
 * entra la que ya tiene registro en el período (por ejemplo, una adelantada) y sale la planificada que se terminó antes.
 */
export function actividadesDelPeriodo(
  raiz: NodoPlan,
  periodo: number,
  columnas: { periodo: number }[],
  registros?: AvanceRegistrado[] | null
): NodoPlan[] {
  const cols = columnas.map((c, i) => (c.periodo === periodo ? i : -1)).filter((i) => i >= 0);
  const arrastradas = registros ? arrastradasAlPeriodo(raiz, periodo, columnas, registros) : new Map();
  return aplanar(raiz).filter((n) => {
    if (!esHojaPlan(n)) return false;
    const conRegistro = !!registros?.some((r) => r.nodoId === n.id && r.periodo === periodo);
    if (conRegistro) return true;
    const planificada = cols.some((i) => (n.montos[i] ?? 0) > 0);
    // Terminada antes (por ejemplo, adelantada): ya no hay nada que registrar en el período planificado.
    if (planificada && registros && avanceAntesDe(n.id, periodo, registros) >= 100) return false;
    return planificada || arrastradas.has(n.id);
  });
}

/**
 * Avance de cada nodo: las hojas toman el último avance registrado (0 si no hay); los demás niveles, el promedio simple
 * de sus hijos (respuesta del asesor, nov-2026: sin ponderar por presupuesto). Una actividad con subactividades avanza
 * según cuántas están terminadas (cada subactividad se registra como terminada, 100, o no, 0). Así el objetivo general refleja el avance del proyecto completo, como pide el informe de avances.
 */
export function avancePorNodo(raiz: NodoPlan, avanceHoja: Map<string, number>): Map<string, number> {
  const m = new Map<string, number>();
  // Cronograma de investigación (E3): un elemento opcional sin usar (sin nada planificado ni avance) no cuenta, así
  // con los 4 elementos obligatorios cada uno vale 25 % del objetivo y, si se usa la discusión, 20 %.
  const usado = (n: NodoPlan): boolean => n.montos.some((x) => x > 0) || avanceHoja.has(n.id) || n.hijos.some(usado);
  const rec = (n: NodoPlan): number => {
    const cuentan = n.hijos.filter((h) => !h.opcional || usado(h));
    n.hijos.filter((h) => !cuentan.includes(h)).forEach(rec);
    const v = n.hijos.length === 0 ? (avanceHoja.get(n.id) ?? 0) : cuentan.length === 0 ? 0 : cuentan.map(rec).reduce((a, b) => a + b, 0) / cuentan.length;
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

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const fechaValida = (f: string | null | undefined): f is string => !!f && FECHA.test(f);

/** Problemas de las fechas en que se ejecutó la actividad (del… al…, en formato AAAA-MM-DD). */
export function problemasFechasRegistro(r: { fechaInicio?: string | null; fechaFin?: string | null }): string[] {
  const ini = r.fechaInicio ?? "";
  const fin = r.fechaFin ?? "";
  if (!ini || !fin) return ["Indica las fechas en que se realizó la actividad (del… al…)."];
  if (!FECHA.test(ini) || !FECHA.test(fin)) return ["Las fechas de la actividad no son válidas."];
  if (fin < ini) return ["La fecha final de la actividad es anterior a la inicial."];
  return [];
}

/**
 * Lo que falta antes de poder indicar el avance (notas del 13-nov-2026): primero se registra qué se hizo, cuándo, el
 * resultado y las evidencias; el porcentaje va al final.
 */
export function faltaParaAvance(
  r: { acciones: string; resultado: string; fechaInicio?: string | null; fechaFin?: string | null },
  evidencias: { adjuntas: number; min: number; max: number }
): string[] {
  const p: string[] = [];
  if (problemasFechasRegistro(r).length) p.push("las fechas");
  if (!r.acciones.trim()) p.push("lo que se hizo");
  if (!r.resultado.trim()) p.push("lo que se obtuvo");
  if (evidencias.max > 0 && evidencias.adjuntas < Math.max(1, evidencias.min)) p.push("las evidencias");
  return p;
}

/** Problemas de un registro antes de enviarlo al asesor. 0 en mínimo o máximo = sin límite (sin métrica). */
export function validarRegistroProyecto(
  r: { avance: number | null; acciones: string; resultado: string; marcoTeorico: string; fechaInicio?: string | null; fechaFin?: string | null },
  reglas: ReglasRegistroProyecto,
  /** Subactividad (nivel 5): no lleva porcentaje, solo terminada (100) o no (0). */
  subactividad = false
): string[] {
  const p: string[] = [...problemasFechasRegistro(r)];
  const rango = (nombre: string, texto: string, { min, max }: { min: number; max: number }) => {
    const n = contarPalabras(texto);
    if (!texto.trim()) p.push(`Falta ${nombre}.`);
    else if (min > 0 && n < min) p.push(`${nombre[0].toUpperCase()}${nombre.slice(1)}: al menos ${min} palabras (lleva ${n}).`);
    else if (max > 0 && n > max) p.push(`${nombre[0].toUpperCase()}${nombre.slice(1)}: hasta ${max} palabras (lleva ${n}).`);
  };
  if (reglas.avance && subactividad) {
    if (r.avance !== 0 && r.avance !== 100) p.push("Indica si la subactividad quedó terminada.");
  } else   if (reglas.avance && (r.avance === null || !Number.isInteger(r.avance) || r.avance < 0 || r.avance > 100)) p.push("Indica el avance de la actividad (0 a 100 %).");
  rango("la descripción de las acciones realizadas", r.acciones, reglas.acciones);
  rango("el resultado obtenido", r.resultado, reglas.resultado);
  if (reglas.marcoTeorico === "obligatorio" && !r.marcoTeorico.trim()) p.push("La ficha pide marco teórico.");
  return p;
}

// ─────────────── Gantt de avance (reunión 6-nov-2026) ───────────────

export interface CeldaGantt {
  /** La actividad (o alguna de sus hijas) estaba planificada en el período. */
  planificado: boolean;
  /** Avance acumulado al cierre del período; null en períodos todavía no abiertos. */
  avance: number | null;
  /** Viene incompleta de un período anterior. */
  arrastre: boolean;
}

export interface FilaGantt {
  id: string;
  codigo: string;
  nivel: number;
  titulo: string;
  celdas: CeldaGantt[];
}

/**
 * Cronograma planificado frente al real: por cada nodo y período, si estaba planificado, si se arrastró y el avance
 * acumulado al cierre (los niveles superiores promedian, como avancePorNodo). Solo hasta el período abierto.
 */
export function ganttPlan(
  raiz: NodoPlan,
  columnas: { periodo: number }[],
  registros: AvanceRegistrado[],
  periodos: number,
  periodoActual: number
): FilaGantt[] {
  const nodos = aplanar(raiz);
  const planeado = new Map<string, Set<number>>();
  const rec = (n: NodoPlan): Set<number> => {
    const s = n.hijos.length === 0 ? new Set(planificadaEn(n, columnas)) : new Set(n.hijos.flatMap((h) => [...rec(h)]));
    planeado.set(n.id, s);
    return s;
  };
  rec(raiz);
  const validos = registros.filter((r) => r.estado !== "borrador" && r.avance !== null);
  const porPeriodo = Array.from({ length: periodos }, (_, i) => {
    const p = i + 1;
    if (p > periodoActual) return null;
    const ultimo = new Map<string, { p: number; a: number }>();
    for (const r of validos) {
      if (r.periodo > p) continue;
      const u = ultimo.get(r.nodoId);
      if (!u || r.periodo > u.p) ultimo.set(r.nodoId, { p: r.periodo, a: r.avance! });
    }
    const arr = arrastradasAlPeriodo(raiz, p, columnas, registros);
    const conArrastre = new Set<string>();
    const marcar = (n: NodoPlan): boolean => {
      const si = n.hijos.length === 0 ? arr.has(n.id) : n.hijos.map(marcar).some(Boolean);
      if (si) conArrastre.add(n.id);
      return si;
    };
    marcar(raiz);
    return { avance: avancePorNodo(raiz, new Map([...ultimo].map(([k, v]) => [k, v.a]))), conArrastre };
  });
  return nodos.map((n) => ({
    id: n.id,
    codigo: n.codigo,
    nivel: n.nivel,
    titulo: n.titulo,
    celdas: porPeriodo.map((x, i) => ({
      planificado: planeado.get(n.id)?.has(i + 1) ?? false,
      avance: x ? (x.avance.get(n.id) ?? 0) : null,
      arrastre: x ? x.conArrastre.has(n.id) : false,
    })),
  }));
}
