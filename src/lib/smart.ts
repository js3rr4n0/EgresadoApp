// Revisión SMART de los objetivos específicos (specs/REDACTAR_PROPUESTA_AJUSTES.md, R4). Módulo puro: lo usan el
// formulario del egresado, el indicador de fortaleza y las vistas del asesor y el coordinador.
//
// Respuesta 3 del usuario: se mantiene la estructura actual (título y descripción); la revisión se hace sobre el texto.
// El sistema no puede saber si un objetivo es alcanzable o relevante: revisa su forma (que diga con qué medios y para
// qué), y el asesor valida el fondo. Cada criterio vale 20 %; un objetivo cuenta como sólido desde 80 % (4 de 5).

export type CriterioSmart = "S" | "M" | "A" | "R" | "T";

export interface ResultadoCriterio {
  criterio: CriterioSmart;
  nombre: string;
  cumple: boolean;
  /** Qué falta, cuando no cumple. */
  motivo?: string;
}

export interface RevisionSmart {
  porcentaje: number;
  criterios: ResultadoCriterio[];
  /** Sin texto todavía: no se revisa. */
  vacio: boolean;
}

export const MINIMO_OBJETIVO = 80;

export const NOMBRES_SMART: Record<CriterioSmart, string> = {
  S: "Específico",
  M: "Medible",
  A: "Alcanzable",
  R: "Relevante",
  T: "Temporal",
};

export const AYUDA_SMART: Record<CriterioSmart, string> = {
  S: "Empieza con un verbo en infinitivo que indique una acción concreta: diseñar, desarrollar, implementar, evaluar, elaborar.",
  M: "Indica qué se medirá o entregará: una cantidad, un porcentaje o un producto concreto (informe, manual, prototipo).",
  A: "Menciona con qué medios o recursos se logrará: mediante, utilizando, a través de, con base en.",
  R: "Relaciónalo con el problema: para qué se hace (para, con el fin de, que permita, contribuir a).",
  T: "Indica el plazo: en 3 meses, durante el primer trimestre, al finalizar el proceso, en la semana 6.",
};

/** Minúsculas y sin tildes, para comparar. */
const normalizar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const VERBOS_VAGOS = ["conocer", "entender", "saber", "aprender", "comprender", "apreciar", "creer", "pensar", "familiarizar", "familiarizarse", "informarse", "intentar", "tratar", "procurar"];

/** Primera palabra del texto, sin signos. */
const primeraPalabra = (t: string) => normalizar(t).trim().split(/\s+/)[0]?.replace(/[^a-zñ]/g, "") ?? "";

const esInfinitivo = (p: string) => /^[a-zñ]{3,}(ar|er|ir)(se)?$/.test(p);

const ENTREGABLES = [
  "informe", "documento", "manual", "prototipo", "sistema", "aplicacion", "plataforma", "modelo", "plan ", "propuesta", "guia",
  "matriz", "diagnostico", "reporte", "base de datos", "modulo", "procedimiento", "protocolo", "instrumento", "encuesta",
  "cuestionario", "programa", "estrategia", "inventario", "catalogo", "software", "sitio web", "pagina web", "tablero",
  "indicador", "porcentaje", "tasa", "cantidad", "nivel de", "capacitacion", "taller", "presupuesto", "flujograma", "diagrama",
];
const NUMEROS = /\b(\d+|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|quince|veinte|cien|mil)\b|%/;

const MEDIOS = [
  "mediante", "a traves de", "por medio de", "utilizando", "usando", "empleando", "aplicando", "con el uso de", "con base en",
  "basado en", "basada en", "con apoyo de", "con el apoyo de", "haciendo uso de", "con la metodologia", "con la tecnica",
  "con la herramienta", "con herramientas", "a partir de", "por medio",
];

const PROPOSITO = [
  "para ", "con el fin de", "a fin de", "con el proposito de", "con el objetivo de", "que permita", "permitiendo", "de modo que",
  "de manera que", "contribuir", "contribuyendo", "que facilite", "facilitando", "que mejore", "mejorando", "reduciendo", "que reduzca",
];

const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const PLAZO = new RegExp(
  [
    `\\b\\d+\\s*(dias?|semanas?|mes(es)?|anos?|trimestres?|semestres?|horas?)\\b`,
    `\\b(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\\s+(dias|semanas|meses|anos|trimestres|semestres)\\b`,
    `\\ben un plazo\\b`, `\\bdurante\\b`, `\\bal finalizar\\b`, `\\bal final de\\b`, `\\bal termino de\\b`, `\\bantes de\\b`, `\\ba mas tardar\\b`,
    `\\b(primer|primera|segundo|segunda|tercer|tercera|cuarto|cuarta|ultimo|ultima)\\s+(dia|semana|mes|trimestre|semestre|fase|etapa|periodo|ciclo)\\b`,
    `\\b(trimestre|semestre|ciclo|periodo)\\b`, `\\bsemana\\s+\\d+\\b`, `\\bmes\\s+\\d+\\b`, `\\b(${MESES})\\b`, `\\b20\\d\\d\\b`,
  ].join("|"),
);

/** Revisa un objetivo (título y descripción) con los cinco criterios. */
export function revisarSmart(titulo: string | null | undefined, descripcion: string | null | undefined): RevisionSmart {
  const tit = (titulo ?? "").trim();
  const des = (descripcion ?? "").trim();
  const texto = normalizar(`${tit} ${des}`);
  const vacio = !tit && !des;

  const verbos = [primeraPalabra(tit), primeraPalabra(des)].filter(Boolean);
  const vago = verbos.find((v) => VERBOS_VAGOS.includes(v));
  const especifico = !vago && verbos.some(esInfinitivo);
  const medible = NUMEROS.test(texto) || ENTREGABLES.some((p) => texto.includes(p));
  const alcanzable = MEDIOS.some((p) => texto.includes(p));
  const relevante = PROPOSITO.some((p) => texto.includes(p));
  const temporal = PLAZO.test(texto);

  const crit = (criterio: CriterioSmart, cumple: boolean, motivo?: string): ResultadoCriterio => ({
    criterio,
    nombre: NOMBRES_SMART[criterio],
    cumple: !vacio && cumple,
    motivo: !vacio && cumple ? undefined : motivo ?? AYUDA_SMART[criterio],
  });
  const criterios = [
    crit("S", especifico, vago ? `«${vago}» es un verbo vago: usa uno que se pueda verificar (diseñar, desarrollar, implementar, evaluar).` : undefined),
    crit("M", medible),
    crit("A", alcanzable),
    crit("R", relevante),
    crit("T", temporal),
  ];
  return { porcentaje: criterios.filter((c) => c.cumple).length * 20, criterios, vacio };
}

/**
 * Fortaleza del elemento «Objetivos»: promedio SMART de los objetivos específicos. Si faltan objetivos para llegar al
 * mínimo que pide la ficha, los que faltan cuentan como 0 %.
 */
export function fortalezaObjetivos(especificos: { titulo?: string | null; descripcion?: string | null }[] | null | undefined, minimo: number): number {
  const lista = Array.isArray(especificos) ? especificos : [];
  const divisor = Math.max(lista.length, minimo, 1);
  const suma = lista.reduce((s, o) => s + revisarSmart(o?.titulo, o?.descripcion).porcentaje, 0);
  return Math.round(suma / divisor);
}
