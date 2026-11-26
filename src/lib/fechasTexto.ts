// Fechas en texto que dan exactamente lo mismo en el servidor y en el navegador (sin Intl, que cambia espacios y
// abreviaturas según el motor y provoca errores de hidratación). Hora de El Salvador: UTC-6, sin horario de verano.
// Módulo puro.

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Año, mes (0-11), día, hora y minuto en El Salvador. Una fecha sola (AAAA-MM-DD) se toma tal cual. */
function partes(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m, d] = iso.split("-").map(Number);
    return { a, m: m - 1, d, h: 0, min: 0 };
  }
  const sv = new Date(new Date(iso).getTime() - 6 * 3600 * 1000);
  return { a: sv.getUTCFullYear(), m: sv.getUTCMonth(), d: sv.getUTCDate(), h: sv.getUTCHours(), min: sv.getUTCMinutes() };
}

/** «26 de noviembre de 2026» */
export function fechaLargaSV(iso: string): string {
  const p = partes(iso);
  return `${p.d} de ${MESES[p.m]} de ${p.a}`;
}

/** «26 nov 2026» */
export function fechaCortaSV(iso: string): string {
  const p = partes(iso);
  return `${String(p.d).padStart(2, "0")} ${MESES_CORTOS[p.m]} ${p.a}`;
}

/** «03:14 p. m.» */
export function horaSV(iso: string): string {
  const p = partes(iso);
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${String(h12).padStart(2, "0")}:${String(p.min).padStart(2, "0")} ${p.h < 12 ? "a. m." : "p. m."}`;
}
