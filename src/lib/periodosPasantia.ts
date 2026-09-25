export const DURACION_PASANTIA_DIAS = 150;
export const NUM_INFORMES_MENSUALES = 4;

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export interface PeriodoPasantia {
  num: number;
  nombre: string;
  inicio: Date;
  fin: Date;
  rango: string;
  semanas: number;
}

export interface Posicion {
  mes: number;
  semana: number;
}

/**
 * Divide la pasantía en períodos por mes calendario desde la fecha de inicio de la carta de aceptación;
 * cada período tiene ceil(días / 7) semanas. Es la regla del editor del cronograma (ActividadesForm).
 * Trabaja con getters locales: en servidor, construir `start` con fechaLocalDesdeISO().
 */
export function generarPeriodosPasantia(start: Date, duracionDias = DURACION_PASANTIA_DIAS): PeriodoPasantia[] {
  const end = new Date(start);
  end.setDate(start.getDate() + duracionDias);

  const periodos: PeriodoPasantia[] = [];
  let current = new Date(start);
  let num = 1;

  while (current <= end) {
    const monthStart = new Date(current);
    let monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    if (monthEnd > end) {
      monthEnd = new Date(end);
    }

    const formatStr = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    const diffTime = Math.abs(monthEnd.getTime() - monthStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const semanas = Math.ceil(diffDays / 7);

    periodos.push({
      num,
      nombre: MESES[monthStart.getMonth()],
      inicio: monthStart,
      fin: monthEnd,
      rango: `${formatStr(monthStart)} al ${formatStr(monthEnd)}`,
      semanas: semanas > 0 ? semanas : 1,
    });

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    num++;
  }

  return periodos;
}

export function fechaLocalDesdeISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function aISOLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hoyISOElSalvador(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function compararPosicion(a: Posicion, b: Posicion): number {
  return a.mes - b.mes || a.semana - b.semana;
}

/** "2026-09-01","2026-09-07" -> "del 1 al 7 de septiembre de 2026". */
export function rangoFechasTexto(inicio: string, fin: string): string {
  const [yi, mi, di] = inicio.slice(0, 10).split("-").map(Number);
  const [yf, mf, df] = fin.slice(0, 10).split("-").map(Number);
  const mes = (m: number) => MESES[m - 1].toLowerCase();
  if (inicio.slice(0, 10) === fin.slice(0, 10)) return `del ${di} de ${mes(mi)} de ${yi}`;
  if (yi === yf && mi === mf) return `del ${di} al ${df} de ${mes(mi)} de ${yi}`;
  if (yi === yf) return `del ${di} de ${mes(mi)} al ${df} de ${mes(mf)} de ${yi}`;
  return `del ${di} de ${mes(mi)} de ${yi} al ${df} de ${mes(mf)} de ${yf}`;
}

/** "2026-09-01" -> "Septiembre 2026". */
export function mesAnioTexto(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

export function sumarDiasISO(iso: string, dias: number): string {
  const d = fechaLocalDesdeISO(iso);
  d.setDate(d.getDate() + dias);
  return aISOLocal(d);
}

/** Fecha y hora en El Salvador. Usar solo en servidor y pasar el texto al cliente (evita diferencias de hidratación). */
export function formatearFechaHoraElSalvador(fecha: Date | string | null | undefined): string | null {
  if (!fecha) return null;
  return new Date(fecha).toLocaleString("es-SV", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "2026-09-30" -> "30 de septiembre de 2026" (sin desfase de zona horaria). */
export function formatearFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
