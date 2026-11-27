// D3 (specs/COORDINADOR_ASIGNACION.md): filtros sencillos de las listas del coordinador. Se leen de la dirección
// (?q=…&modalidad=…&carrera=…&estado=…&pagina=…) para que cada lista tenga su enlace y funcione sin JavaScript.

export const TAMANO_PAGINA = 10;

export interface Filtros {
  q: string;
  modalidad: string;
  carrera: string;
  estado: string;
  pagina: number;
}

type Parametros = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function leerFiltros(sp: Parametros): Filtros {
  return {
    q: uno(sp.q).trim(),
    modalidad: uno(sp.modalidad),
    carrera: uno(sp.carrera),
    estado: uno(sp.estado),
    pagina: Math.max(1, parseInt(uno(sp.pagina), 10) || 1),
  };
}

/** Sin tildes ni mayúsculas, para buscar «garcia» y encontrar «García». */
export const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const coincideTexto = (q: string, ...campos: (string | number | null | undefined)[]) =>
  !q || campos.some((c) => c != null && normalizar(String(c)).includes(normalizar(q)));

/** Dirección de la misma lista con otra página, conservando los filtros. */
export function hrefConFiltros(base: string, f: Filtros, pagina: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.modalidad) p.set("modalidad", f.modalidad);
  if (f.carrera) p.set("carrera", f.carrera);
  if (f.estado) p.set("estado", f.estado);
  if (pagina > 1) p.set("pagina", String(pagina));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

export const hayFiltros = (f: Filtros) => !!(f.q || f.modalidad || f.carrera || f.estado);

export const NOMBRE_MODALIDAD: Record<string, string> = {
  pasantia: "Pasantía",
  proyecto: "Proyecto",
  investigacion: "Investigación",
};
