// Informe del período del proyecto (entrega P5). Módulo puro: arma el contenido a partir del plan y de los registros.
// Partes, según el documento "Ejemplo para plantilla proyecto" (su redacción exacta se revisará después):
//   cronograma y presupuesto del período (montos solo en lo ejecutado), avances por nivel, narrativa por actividad,
//   resultados (estado y % concluido/pendiente) y resultados por actividad con su anexo.
// Individual: la parte del plan del integrante. General: el plan completo del equipo (une los individuales).
import { actividadesDelPeriodo, avancePorNodo, planIndividual, responsables, type NodoPlan } from "./planTrabajo";

export interface RegistroInforme {
  nodoId: string;
  periodo: number;
  egresadoId: number;
  avance: number | null;
  acciones: string;
  resultado: string;
  marcoTeorico: string;
  estado: string;
}

export interface FilaInforme {
  id: string;
  codigo: string;
  nivel: number;
  titulo: string;
  responsable: number | null;
  /** Montos del período por columna (subperíodo o período), solo en lo ejecutado; los niveles superiores suman. */
  montos: number[];
  total: number;
  /** Avance acumulado del nodo al cierre del período (los niveles superiores promedian a sus hijos). */
  avance: number;
  estado: "Finalizada" | "Avance parcial" | "Pendiente";
  /** Registro del período (solo actividades). */
  registro: RegistroInforme | null;
}

export interface InformePeriodo {
  periodo: number;
  /** null = informe general del equipo. */
  integrante: number | null;
  columnas: string[];
  filas: FilaInforme[];
  totalPeriodo: number;
  avanceProyecto: number;
  /** Actividades planificadas en el período que todavía no tienen registro enviado. */
  sinRegistro: number;
}

/** Registros que cuentan para el informe: enviados o aprobados (no borradores ni observados). */
const cuenta = (r: RegistroInforme) => r.estado === "enviado" || r.estado === "aprobado";

export function armarInformePeriodo(args: {
  arbol: NodoPlan;
  columnas: { periodo: number; sub: number | null; texto: string }[];
  periodo: number;
  registros: RegistroInforme[];
  integrante: number | null;
}): InformePeriodo {
  const { arbol, columnas, periodo, registros, integrante } = args;
  const resp = responsables(arbol);
  const base = integrante === null ? arbol : planIndividual(arbol, integrante);
  const indices = columnas.map((c, i) => (c.periodo === periodo ? i : -1)).filter((i) => i >= 0);

  // Avance acumulado hasta este período: el último avance registrado de cada actividad.
  const ultimo = new Map<string, { p: number; a: number }>();
  for (const r of registros) {
    if (r.periodo > periodo || r.avance === null || !cuenta(r)) continue;
    const u = ultimo.get(r.nodoId);
    if (!u || r.periodo > u.p) ultimo.set(r.nodoId, { p: r.periodo, a: r.avance });
  }
  const avances = avancePorNodo(arbol, new Map([...ultimo].map(([k, v]) => [k, v.a])));

  if (!base) {
    return { periodo, integrante, columnas: indices.map((i) => columnas[i].texto), filas: [], totalPeriodo: 0, avanceProyecto: avances.get(arbol.id) ?? 0, sinRegistro: 0 };
  }

  const delPeriodo = new Set(actividadesDelPeriodo(base, periodo, columnas).map((n) => n.id));
  const registroDe = (id: string) => registros.find((r) => r.nodoId === id && r.periodo === periodo && cuenta(r)) ?? null;

  // Poda: solo las ramas con actividades planificadas en el período (con sus niveles superiores).
  const podar = (n: NodoPlan): NodoPlan | null => {
    if (n.hijos.length === 0) return delPeriodo.has(n.id) ? n : null;
    const hijos = n.hijos.map(podar).filter((h): h is NodoPlan => h !== null);
    return hijos.length > 0 ? { ...n, hijos } : null;
  };
  const podado = podar(base);

  const filas: FilaInforme[] = [];
  let sinRegistro = 0;
  const rec = (n: NodoPlan): number[] => {
    const fila: FilaInforme = {
      id: n.id, codigo: n.codigo, nivel: n.nivel, titulo: n.titulo, responsable: resp.get(n.id) ?? null,
      montos: [], total: 0, avance: avances.get(n.id) ?? 0, estado: "Pendiente", registro: null,
    };
    filas.push(fila);
    let montos: number[];
    if (n.hijos.length === 0) {
      fila.registro = registroDe(n.id);
      if (!fila.registro) sinRegistro++;
      // Los montos del período se reportan solo si la actividad se ejecutó (tiene registro).
      montos = indices.map((i) => (fila.registro ? n.montos[i] ?? 0 : 0));
    } else {
      montos = indices.map(() => 0);
      for (const h of n.hijos) rec(h).forEach((v, k) => (montos[k] += v));
    }
    fila.montos = montos;
    fila.total = montos.reduce((a, b) => a + b, 0);
    fila.estado = fila.avance >= 100 ? "Finalizada" : fila.avance > 0 ? "Avance parcial" : "Pendiente";
    return montos;
  };
  if (podado) rec(podado);

  return {
    periodo,
    integrante,
    columnas: indices.map((i) => (columnas[i].sub ? `S${columnas[i].sub}` : columnas[i].texto)),
    filas,
    totalPeriodo: filas[0]?.total ?? 0,
    avanceProyecto: avances.get(arbol.id) ?? 0,
    sinRegistro,
  };
}
