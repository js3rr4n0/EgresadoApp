// Capítulo "Resultados por objetivo" del informe final (notas del 13-nov-2026). Lo genera el sistema, sin redacción del
// equipo: objetivo general, cada objetivo específico con sus productos entregados y cada macroactividad con sus
// actividades (fechas, resultado y evidencias), siempre con el índice del plan. Las evidencias y los productos pasan a
// los anexos en ese mismo orden, y el capítulo los cita ("Anexo 3"). Módulo puro: lo usan el documento (PDF y Word) y
// la pantalla del informe final.
import { aplanar, avancePorNodo, esHojaPlan, productosDe, type NodoPlan } from "./planTrabajo";
import type { AnexoDocumento, BloqueDocumento } from "./documentoInformeFinal";
import { avancesEnviados, hojasElemento, procesoPorObjetivo } from "./elementosEjecucion";
import { leerMetodologia, textoMetodologia } from "./metodologiaPlan";
import type { ClaveComponente } from "./tipos";

export interface RegistroResultado {
  nodoId: string;
  periodo: number;
  estado: string;
  avance: number | null;
  resultado: string | null;
  /** Lo que se hizo (cronograma de investigación: el desarrollo se cuenta registro por registro). */
  acciones?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

/** Evidencia de una actividad o archivo de un producto, ya con su nota de origen (imágenes externas). */
export interface ArchivoResultado {
  tipo: "imagen" | "documento" | "enlace";
  leyenda: string;
  nombre: string | null;
  url: string;
  nota: string | null;
}

export interface EvidenciaResultado extends ArchivoResultado {
  nodoId: string;
  /** Período del registro al que pertenece. */
  periodo: number;
}

export interface ProductoResultado extends ArchivoResultado {
  objetivoId: string;
  /** Índice del producto prometido en el objetivo. */
  producto: number;
}

export interface EntregaResultado {
  nodoId: string;
  estado: string;
}

const cuenta = (estado: string) => estado === "enviado" || estado === "aprobado";
const fecha = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const sinPunto = (t: string) => t.trim().replace(/[.\s]+$/, "");

/**
 * Contenido del capítulo y los anexos que genera, en orden. Los anexos se numeran desde 1: van antes que los del
 * capítulo de anexos del equipo. "numero" es el número del capítulo en el documento (para numerar sus subtítulos).
 */
export function resultadosPorObjetivo(args: {
  arbol: NodoPlan;
  registros: RegistroResultado[];
  evidencias: EvidenciaResultado[];
  entregas: EntregaResultado[];
  productos: ProductoResultado[];
  numero: number | null;
}): { bloques: BloqueDocumento[]; anexos: AnexoDocumento[] } {
  // Cronograma de investigación (E4): el capítulo va por objetivo y por elementos del proceso.
  if (esPlanPorElementos(args.arbol)) return desarrolloPorObjetivo(args);
  const { arbol, registros, evidencias, entregas, productos, numero } = args;
  const validos = registros.filter((r) => cuenta(r.estado));
  // Último registro enviado de cada actividad: su avance, su resultado y sus fechas.
  const ultimo = new Map<string, RegistroResultado>();
  for (const r of validos) {
    const u = ultimo.get(r.nodoId);
    if (!u || r.periodo > u.periodo) ultimo.set(r.nodoId, r);
  }
  const avances = avancePorNodo(arbol, new Map([...ultimo].filter(([, r]) => r.avance !== null).map(([k, r]) => [k, r.avance!])));
  const anexos: AnexoDocumento[] = [];
  const anexar = (a: ArchivoResultado, procedencia: string) => {
    anexos.push({ etiqueta: `Anexo ${anexos.length + 1}`, descripcion: a.leyenda, tipo: a.tipo, url: a.url, nombre: a.nombre, actividad: procedencia, nota: a.nota });
    return `Anexo ${anexos.length}`;
  };
  const sub = (k: number) => (numero ? `${numero}.${k} ` : "");
  const objetivos = arbol.hijos;
  const aprobados = objetivos.filter((o) => entregas.some((e) => e.nodoId === o.id && e.estado === "aprobado")).length;

  const bloques: BloqueDocumento[] = [
    { tipo: "subtitulo", texto: `${sub(1)}Objetivo general` },
    {
      tipo: "parrafos",
      parrafos: [
        `${sinPunto(arbol.titulo) || "Objetivo general"}.`,
        `Avance alcanzado: ${avances.get(arbol.id) ?? 0} %. Objetivos específicos con sus productos aprobados: ${aprobados} de ${objetivos.length}.`,
      ],
    },
  ];

  objetivos.forEach((o, k) => {
    bloques.push({ tipo: "subtitulo", texto: `${sub(k + 2)}Objetivo específico ${o.codigo}: ${sinPunto(o.titulo)}` });
    const entrega = entregas.find((e) => e.nodoId === o.id && cuenta(e.estado));
    const prometidos = productosDe(o);
    bloques.push({
      tipo: "parrafos",
      parrafos: [
        `Avance: ${avances.get(o.id) ?? 0} %.${prometidos.length ? (entrega ? (entrega.estado === "aprobado" ? " Productos aprobados por el asesor." : " Productos en revisión del asesor.") : " Productos pendientes de entrega.") : ""}`,
      ],
    });
    if (prometidos.length) {
      bloques.push({
        tipo: "lista",
        items: prometidos.map((nombre, i) => {
          const archivos = entrega ? productos.filter((p) => p.objetivoId === o.id && p.producto === i) : [];
          const citas = archivos.map((a) => `${sinPunto(a.leyenda)} (${anexar(a, `producto del objetivo ${o.codigo}`)})`);
          return `${nombre}: ${citas.length ? citas.join("; ") : "pendiente de entrega"}.`;
        }),
      });
    }
    for (const m of o.hijos) {
      bloques.push({ tipo: "parrafos", parrafos: [`Macroactividad ${m.codigo}: ${sinPunto(m.titulo)} (avance ${avances.get(m.id) ?? 0} %).`] });
      const hojas = aplanar(m).filter(esHojaPlan);
      if (hojas.length === 0) continue;
      bloques.push({
        tipo: "lista",
        items: hojas.map((a) => {
          const r = ultimo.get(a.id);
          const fechas = r?.fechaInicio && r?.fechaFin ? ` (del ${fecha(r.fechaInicio)} al ${fecha(r.fechaFin)})` : "";
          const resultado = r?.resultado?.trim() ? sinPunto(r.resultado) : "sin registro enviado";
          const suyas = evidencias.filter((e) => e.nodoId === a.id && validos.some((v) => v.nodoId === a.id && v.periodo === e.periodo));
          const citas = suyas.map((e) => anexar(e, `actividad ${a.codigo}`));
          return `${a.codigo} ${sinPunto(a.titulo)}${fechas}: ${resultado}.${citas.length ? ` Evidencias: ${citas.join(", ")}.` : ""}`;
        }),
      });
    }
  });
  return { bloques, anexos };
}


// ─────────────── Cronograma de investigación (notas del 19-nov-2026, entrega E4) ───────────────

/** El plan es un cronograma de investigación: sus objetivos se organizan por elementos del proceso. */
export const esPlanPorElementos = (arbol: NodoPlan) => arbol.hijos.some((o) => o.hijos.some((e) => !!e.componente));

const PARTES_OBJETIVO: { clave: ClaveComponente; titulo: string }[] = [
  { clave: "metodologia", titulo: "Metodología utilizada" },
  { clave: "desarrollo", titulo: "Desarrollo realizado" },
  { clave: "resultados", titulo: "Resultados obtenidos" },
  { clave: "conclusiones", titulo: "Conclusiones preliminares" },
  { clave: "discusion", titulo: "Elementos de discusión" },
];

/**
 * Capítulo "Desarrollo de la investigación por objetivo": cada objetivo específico con su metodología utilizada (la del
 * plan, con sus citas, y cómo se aplicó), el desarrollo realizado (registro por registro, con fechas y evidencias), los
 * resultados obtenidos, las conclusiones preliminares y los elementos de discusión si se usaron. Es el mismo proceso del
 * cronograma, así que el contenido del informe se va construyendo durante la ejecución. El bloque de preparación del
 * informe no entra: las conclusiones finales son un capítulo redactado.
 */
export function desarrolloPorObjetivo(args: {
  arbol: NodoPlan;
  registros: RegistroResultado[];
  evidencias: EvidenciaResultado[];
  numero: number | null;
}): { bloques: BloqueDocumento[]; anexos: AnexoDocumento[] } {
  const { arbol, registros, evidencias, numero } = args;
  const validos = registros.filter((r) => cuenta(r.estado)).sort((a, b) => a.periodo - b.periodo);
  const procesos = procesoPorObjetivo(arbol, validos.map((r) => ({ nodoId: r.nodoId, periodo: r.periodo, avance: r.avance, estado: r.estado })));
  const anexos: AnexoDocumento[] = [];
  const anexar = (a: ArchivoResultado, procedencia: string) => {
    anexos.push({ etiqueta: `Anexo ${anexos.length + 1}`, descripcion: a.leyenda, tipo: a.tipo, url: a.url, nombre: a.nombre, actividad: procedencia, nota: a.nota });
    return `Anexo ${anexos.length}`;
  };
  const sub = (...k: number[]) => (numero ? `${[numero, ...k].join(".")} ` : "");
  const objetivos = procesos.filter((p) => !p.nodo.cierre);
  const validados = objetivos.filter((p) => p.cerrado).length;
  const avanceGeneral = avancePorNodo(arbol, avancesEnviados(validos)).get(arbol.id) ?? 0;

  const bloques: BloqueDocumento[] = [
    { tipo: "subtitulo", texto: `${sub(1)}Objetivo general` },
    { tipo: "parrafos", parrafos: [`${sinPunto(arbol.titulo) || "Objetivo general"}.`, `Avance alcanzado: ${avanceGeneral} %. Objetivos específicos validados por el asesor: ${validados} de ${objetivos.length}.`] },
  ];

  // Registros de una hoja, en orden, con sus fechas, lo que se hizo, lo que se obtuvo y sus evidencias como anexos.
  const registrosDe = (hoja: NodoPlan, conAcciones: boolean): string[] =>
    validos.filter((r) => r.nodoId === hoja.id).map((r) => {
      const fechas = r.fechaInicio && r.fechaFin ? `Del ${fecha(r.fechaInicio)} al ${fecha(r.fechaFin)}: ` : "";
      const partes = [conAcciones && r.acciones?.trim() ? `${sinPunto(r.acciones)}.` : "", r.resultado?.trim() ? `${sinPunto(r.resultado)}.` : ""].filter(Boolean).join(" ");
      const citas = evidencias.filter((e) => e.nodoId === hoja.id && e.periodo === r.periodo).map((e) => anexar(e, `${hoja.componente ? "elemento" : "subactividad"} ${hoja.codigo}`));
      return `${fechas}${partes || "Sin descripción."}${citas.length ? ` Evidencias: ${citas.join(", ")}.` : ""}`;
    });

  objetivos.forEach((p, k) => {
    const o = p.nodo;
    bloques.push({ tipo: "subtitulo", texto: `${sub(k + 2)}Objetivo específico ${o.codigo}: ${sinPunto(o.titulo)}` });
    bloques.push({ tipo: "parrafos", parrafos: [`Avance: ${p.avance} %. ${p.cerrado ? "Todos sus elementos fueron validados por el asesor." : "Tiene elementos pendientes de validación."}`] });
    let j = 0;
    for (const parte of PARTES_OBJETIVO) {
      const el = p.elementos.find((e) => e.nodo.componente === parte.clave);
      if (!el || !el.cuenta) continue;
      const e = el.nodo;
      bloques.push({ tipo: "subtitulo", texto: `${sub(k + 2, ++j)}${parte.titulo}` });
      const parrafos: string[] = [];
      if (parte.clave === "metodologia") {
        const m = leerMetodologia(e);
        const plan = textoMetodologia(m.parrafos);
        if (plan) parrafos.push(...plan.split("\n\n"));
        if (m.propia && textoMetodologia(m.fundamentacion)) parrafos.push(`Fundamentación de la metodología propia: ${textoMetodologia(m.fundamentacion).replace(/\n\n/g, " ")}`);
      }
      const hojas = hojasElemento(e);
      // Desarrollo: cada registro cuenta lo que se hizo y cómo; en los demás elementos importa lo que se obtuvo.
      const conAcciones = parte.clave === "desarrollo" || parte.clave === "metodologia";
      const lineas = hojas.flatMap((h) => registrosDe(h, conAcciones).map((t) => (hojas.length > 1 || h !== e ? `${h.codigo} ${sinPunto(h.titulo)}. ${t}` : t)));
      if (parte.clave === "metodologia") {
        if (lineas.length) parrafos.push(`Aplicación: ${lineas.join(" ")}`);
        bloques.push(parrafos.length ? { tipo: "parrafos", parrafos } : { tipo: "pendiente", texto: "Pendiente: la metodología de este objetivo todavía no se ha descrito." });
      } else if (lineas.length === 0) {
        bloques.push({ tipo: "pendiente", texto: `Pendiente: «${e.titulo}» todavía no tiene registros enviados.` });
      } else if (parte.clave === "desarrollo" || hojas.length > 1) {
        bloques.push({ tipo: "lista", items: lineas });
      } else {
        bloques.push({ tipo: "parrafos", parrafos: lineas });
      }
    }
  });
  return { bloques, anexos };
}
