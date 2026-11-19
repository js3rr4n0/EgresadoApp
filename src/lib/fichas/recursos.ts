// Recursos y presupuesto del protocolo (ajustes al protocolo, 19-nov-2026). Módulo puro: servidor y cliente.
// Cada recurso tiene su categoría (las seis de la reunión), una descripción y, si la ficha pide costos, la cantidad y el
// costo unitario. El presupuesto se calcula solo: un total por categoría y el total general.
import type { Espacio } from "./tipos";

export const CATEGORIAS_RECURSO = [
  { valor: "economicos", etiqueta: "Económicos", ayuda: "Recursos financieros para cubrir gastos de la investigación.", ejemplo: "Pago de servicios requeridos durante la investigación." },
  { valor: "tecnicos", etiqueta: "Técnicos o de infraestructura", ayuda: "Equipos, instalaciones o espacios donde se realizará la investigación.", ejemplo: "Laboratorio universitario, instalaciones externas." },
  { valor: "inmateriales", etiqueta: "Inmateriales", ayuda: "Recursos no físicos necesarios para la investigación.", ejemplo: "Computadora, acceso a internet, programas." },
  { valor: "materiales", etiqueta: "Materiales o consumibles", ayuda: "Materiales físicos que se usan o se consumen en el proceso.", ejemplo: "Reactivos de química, papelería, impresiones." },
  { valor: "operacionales", etiqueta: "Operacionales", ayuda: "Gastos de la ejecución y operación de las actividades.", ejemplo: "Alquiler de laboratorio por horas, desplazamientos, gasolina." },
  { valor: "tiempo", etiqueta: "Tiempo del investigador o salarios", ayuda: "El valor del tiempo que dedican las personas que participan.", ejemplo: "Horas de trabajo del investigador o salarios." },
] as const;
export type CategoriaRecurso = (typeof CATEGORIAS_RECURSO)[number]["valor"];

export interface Recurso {
  categoria: CategoriaRecurso;
  descripcion: string;
  /** Solo si la ficha pide costos. */
  cantidad?: number;
  costoUnitario?: number;
}

export interface ReglasRecursos {
  conCostos: boolean;
  moneda: string;
  categorias: CategoriaRecurso[];
  minimo: number;
}

/** Reglas de un espacio "recursos_presupuesto" (sus parámetros, con los valores por defecto si faltan). */
export function reglasRecursos(e: Pick<Espacio, "parametros">): ReglasRecursos {
  const cats = Array.isArray(e.parametros.categorias) ? (e.parametros.categorias as string[]) : [];
  const validas = CATEGORIAS_RECURSO.map((c) => c.valor).filter((v) => cats.length === 0 || cats.includes(v));
  return {
    conCostos: e.parametros.conCostos !== false,
    moneda: String(e.parametros.moneda || "USD"),
    categorias: validas,
    minimo: Number.isInteger(e.parametros.minimo) ? Number(e.parametros.minimo) : 1,
  };
}

const numero = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** Recursos guardados (JSON); ignora lo que no tiene forma de recurso. */
export function leerRecursos(valor: string | null | undefined): Recurso[] {
  try {
    const v = JSON.parse(valor || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((r) => r && typeof r === "object" && CATEGORIAS_RECURSO.some((c) => c.valor === r.categoria))
      .map((r) => ({ categoria: r.categoria, descripcion: String(r.descripcion ?? ""), cantidad: numero(r.cantidad), costoUnitario: numero(r.costoUnitario) }));
  } catch {
    return [];
  }
}

/** Recursos limpios para guardar: solo categorías de la ficha, textos acotados y, sin costos, sin montos. */
export function limpiarRecursos(items: unknown, reglas: ReglasRecursos): Recurso[] {
  return leerRecursos(JSON.stringify(Array.isArray(items) ? items : []))
    .filter((r) => reglas.categorias.includes(r.categoria) && (r.descripcion.trim() || r.cantidad || r.costoUnitario))
    .slice(0, 100)
    .map((r) => ({
      categoria: r.categoria,
      descripcion: r.descripcion.trim().slice(0, 300),
      ...(reglas.conCostos ? { cantidad: r.cantidad, costoUnitario: r.costoUnitario } : {}),
    }));
}

export const totalRecurso = (r: Recurso) => Math.round((r.cantidad ?? 0) * (r.costoUnitario ?? 0) * 100) / 100;

/** Presupuesto: total de cada categoría que tiene recursos y total general. */
export function presupuesto(recursos: Recurso[]) {
  const porCategoria = CATEGORIAS_RECURSO.map((c) => ({
    categoria: c.valor,
    etiqueta: c.etiqueta,
    recursos: recursos.filter((r) => r.categoria === c.valor).length,
    total: Math.round(recursos.filter((r) => r.categoria === c.valor).reduce((s, r) => s + totalRecurso(r), 0) * 100) / 100,
  })).filter((x) => x.recursos > 0);
  return { porCategoria, total: Math.round(porCategoria.reduce((s, x) => s + x.total, 0) * 100) / 100 };
}

/** Lo que falta para enviar el protocolo: el mínimo de recursos, la descripción y, con costos, cantidad y costo válidos. */
export function problemasRecursos(e: Pick<Espacio, "parametros" | "titulo" | "obligatorio">, recursos: Recurso[]): string[] {
  const reglas = reglasRecursos(e);
  const p: string[] = [];
  if (!e.obligatorio && recursos.length === 0) return p;
  if (recursos.length < reglas.minimo) p.push(`"${e.titulo}" necesita al menos ${reglas.minimo} recurso(s); hay ${recursos.length}.`);
  const sinDescripcion = recursos.filter((r) => !r.descripcion.trim()).length;
  if (sinDescripcion) p.push(`"${e.titulo}": ${sinDescripcion} recurso(s) sin descripción.`);
  if (reglas.conCostos) {
    const malos = recursos.filter((r) => !(r.cantidad && r.cantidad > 0) || r.costoUnitario === undefined || r.costoUnitario < 0).length;
    if (malos) p.push(`"${e.titulo}": ${malos} recurso(s) sin cantidad o sin costo unitario.`);
  }
  return p;
}

export const formatoMonto = (n: number, moneda: string) =>
  `${moneda === "USD" ? "$" : `${moneda} `}${n.toLocaleString("es-SV", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
