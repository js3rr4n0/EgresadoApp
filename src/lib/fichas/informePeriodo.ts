// Informe del período del proyecto (entrega P5). Módulo puro: arma el contenido a partir del plan y de los registros.
// Partes, según el documento "Ejemplo para plantilla proyecto" (su redacción exacta se revisará después):
//   cronograma y presupuesto del período (montos solo en lo ejecutado), avances por nivel, narrativa por actividad,
//   resultados (estado y % concluido/pendiente) y resultados por actividad con su anexo.
// Individual: la parte del plan del integrante. General: el plan completo del equipo (une los individuales).
import { actividadesDelPeriodo, arrastradasAlPeriodo, avancePorNodo, planIndividual, responsables, type NodoPlan } from "./planTrabajo";
import { letraImagen } from "@/lib/fuenteImagen";

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
  /** Actividad o subactividad sin hijos (lleva registro); una actividad con subactividades avanza según ellas. */
  hoja: boolean;
  /** Actividad que no estaba planificada en el período y viene incompleta del período indicado. */
  vieneDe: number | null;
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
  /** La ficha pide avance: lo que quedó incompleto en un período pasa al siguiente. */
  arrastre?: boolean;
}): InformePeriodo {
  const { arbol, columnas, periodo, registros, integrante, arrastre } = args;
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

  const delPeriodo = new Set(actividadesDelPeriodo(base, periodo, columnas, arrastre ? registros : null).map((n) => n.id));
  const arrastradas = arrastre ? arrastradasAlPeriodo(base, periodo, columnas, registros) : new Map<string, { desde: number }>();
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
      vieneDe: arrastradas.get(n.id)?.desde ?? null,
      hoja: n.hijos.length === 0,
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

/**
 * Numeración de las evidencias en el informe, con la misma indexación de pasantía: las imágenes se identifican con el
 * código de la actividad y una letra (Imagen 1.1.1.1.A, 1.1.1.1.B…) y llevan un número correlativo para el índice de
 * imágenes; los documentos y enlaces son anexos numerados en el orden del plan (Anexo 1, Anexo 2…).
 */
export function numerarEvidencias<E extends { tipo: string }>(
  actividades: { id: string; codigo: string }[],
  porActividad: Map<string, E[]>
): Map<string, (E & { etiqueta: string; numero: number })[]> {
  const m = new Map<string, (E & { etiqueta: string; numero: number })[]>();
  let imagenes = 0;
  let anexos = 0;
  for (const a of actividades) {
    let letra = 0;
    m.set(
      a.id,
      (porActividad.get(a.id) ?? []).map((e) =>
        e.tipo === "imagen"
          ? { ...e, numero: ++imagenes, etiqueta: `Imagen ${a.codigo}.${letraImagen(letra++)}` }
          : { ...e, numero: ++anexos, etiqueta: `Anexo ${anexos}` }
      )
    );
  }
  return m;
}
