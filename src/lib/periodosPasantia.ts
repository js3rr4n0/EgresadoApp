export const DURACION_PASANTIA_DIAS = 150;
/** La pasantía se divide en períodos de 30 días; cada período corresponde a un informe. */
export const DIAS_POR_PERIODO = 30;
/** Cada período se divide en 4 semanas: las 3 primeras de 7 días y la cuarta con los días restantes (9). */
export const SEMANAS_POR_PERIODO = 4;
export const NUM_INFORMES_MENSUALES = DURACION_PASANTIA_DIAS / DIAS_POR_PERIODO;

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
 * Divide la pasantía en períodos consecutivos de 30 días desde la fecha de inicio de la carta de aceptación
 * (150 días = 5 períodos = 5 informes). Cada período tiene 4 semanas. Es la regla del editor del cronograma
 * (ActividadesForm) y del seguimiento de actividades.
 * Trabaja con getters locales: en servidor, construir `start` con fechaLocalDesdeISO().
 */
export function generarPeriodosPasantia(start: Date, duracionDias = DURACION_PASANTIA_DIAS): PeriodoPasantia[] {
  const formatStr = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const total = Math.ceil(duracionDias / DIAS_POR_PERIODO);

  return Array.from({ length: total }, (_, i) => {
    const inicio = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * DIAS_POR_PERIODO);
    const dias = Math.min(DIAS_POR_PERIODO, duracionDias - i * DIAS_POR_PERIODO);
    const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + dias - 1);
    return {
      num: i + 1,
      nombre: MESES[inicio.getMonth()],
      inicio,
      fin,
      rango: `${formatStr(inicio)} al ${formatStr(fin)}`,
      semanas: SEMANAS_POR_PERIODO,
    };
  });
}

/** Fechas (ISO) de la semana `semana` de un período: semanas de 7 días y la última hasta el fin del período. */
export function rangoSemanaISO(inicioPeriodo: string, finPeriodo: string, semana: number, totalSemanas: number) {
  const inicio = sumarDiasISO(inicioPeriodo, 7 * (semana - 1));
  if (inicio > finPeriodo) return null;
  const finSemana = semana >= totalSemanas ? finPeriodo : sumarDiasISO(inicio, 6);
  return { inicio, fin: finSemana < finPeriodo ? finSemana : finPeriodo };
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

/** El informe del último período es el informe final: consolida los cinco períodos (no hay un informe final aparte). */
export function esInformeFinal(numero: number) {
  return numero === NUM_INFORMES_MENSUALES;
}

/** Nombre corto del informe para tarjetas y encabezados: "Informe del período 2" o "Informe final". */
export function nombreInforme(numero: number) {
  return esInformeFinal(numero) ? "Informe final" : `Informe del período ${numero}`;
}

/** Título del documento en la portada institucional: "INFORME FINAL DE PASANTÍA" o "INFORME DEL PERÍODO N DE PASANTÍA". */
export function tituloDocumentoInforme(numero: number) {
  return esInformeFinal(numero) ? "INFORME FINAL DE PASANTÍA" : `INFORME DEL PERÍODO ${numero} DE PASANTÍA`;
}

/** Nombre breve para tarjetas: "Informe #2" o "Informe final". */
export function nombreCortoInforme(numero: number) {
  return esInformeFinal(numero) ? "Informe final" : `Informe #${numero}`;
}
