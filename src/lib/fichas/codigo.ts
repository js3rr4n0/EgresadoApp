// Identificador y nombre automáticos de una ficha, a partir de sus generalidades (modalidad, facultad, carrera).
// Formato: MOD-FAC-NNN[-CAR], por ejemplo PAS-ING-001-SIST. Módulo puro.
//   MOD: prefijo de la modalidad · FAC: código de la facultad (GEN = todas) · NNN: correlativo por MOD-FAC
//   CAR: código de la carrera, solo si la ficha es de una carrera.

/** Modalidades que se muestran en el diseño. Solo las que tienen `disponible` se pueden crear hoy. */
export const MODALIDADES_DISENO = [
  { clave: "pasantia", nombre: "Pasantía", prefijo: "PAS", disponible: true },
  { clave: "proyecto", nombre: "Proyecto", prefijo: "PRO", disponible: true },
  { clave: "investigacion", nombre: "Investigación", prefijo: "INV", disponible: true },
  { clave: "mixta", nombre: "Mixta", prefijo: "MIX", disponible: false, nota: "Combina etapas de distintas modalidades (caso de Medicina)." },
  { clave: "especializacion", nombre: "Especialización", prefijo: "ESP", disponible: false, nota: "Cursos autónomos; se desarrollará más adelante." },
] as const;

export const FACULTAD_GENERAL = "GEN";

const limpiar = (codigo: string | null | undefined) =>
  (codigo ?? "").toUpperCase().replace(/-\d+$/, "").replace(/[^A-Z0-9]/g, "");

export function prefijoModalidad(modalidad: string) {
  return MODALIDADES_DISENO.find((m) => m.clave === modalidad)?.prefijo ?? "FIC";
}

/** Parte fija del código (sin correlativo ni carrera): sirve para buscar el siguiente correlativo. */
export function raizCodigo(modalidad: string, codigoFacultad: string | null) {
  return `${prefijoModalidad(modalidad)}-${limpiar(codigoFacultad) || FACULTAD_GENERAL}`;
}

export function armarCodigo(raiz: string, correlativo: number, codigoCarrera: string | null) {
  const car = limpiar(codigoCarrera);
  return `${raiz}-${String(correlativo).padStart(3, "0")}${car ? `-${car}` : ""}`;
}

/** Siguiente correlativo para una raíz, a partir de los códigos existentes. */
export function siguienteCorrelativo(raiz: string, existentes: (string | null)[]) {
  const usados = existentes
    .map((c) => (c && c.startsWith(`${raiz}-`) ? Number(c.slice(raiz.length + 1, raiz.length + 4)) : NaN))
    .filter((n) => Number.isInteger(n));
  return usados.length ? Math.max(...usados) + 1 : 1;
}

export function nombreAutomatico(modalidad: string, facultad: string | null, carrera: string | null) {
  const mod = MODALIDADES_DISENO.find((m) => m.clave === modalidad)?.nombre ?? modalidad;
  return [mod, carrera ?? facultad ?? "Todas las facultades"].join(" · ");
}
