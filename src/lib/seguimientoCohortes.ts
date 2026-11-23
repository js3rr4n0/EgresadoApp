// Seguimiento de cohortes del administrador (specs/SEGUIMIENTO_COHORTES.md, entrega K1). Módulo puro: fases de la
// cohorte, cálculo de la pre-ejecución de 21 días y armado del CSV.

export const DIAS_PREEJECUCION = 21;

export interface FechasCohorte {
  inicioRecepcion: string;
  finRecepcion: string;
  maxInicioProceso: string;
  maxInformeFinal: string;
  maxAprobacionFinal: string;
}

export type FaseCohorte = "por_iniciar" | "recepcion" | "pre_ejecucion" | "ejecucion" | "ultimo_mes" | "cierre" | "finalizada";

export const NOMBRE_FASE: Record<FaseCohorte, string> = {
  por_iniciar: "Por iniciar",
  recepcion: "Recepción de propuestas",
  pre_ejecucion: "Pre-ejecución",
  ejecucion: "Ejecución",
  ultimo_mes: "Último mes",
  cierre: "Cierre administrativo",
  finalizada: "Finalizada",
};

/** Fecha ISO (AAAA-MM-DD) de un Date, en hora local. */
export const isoDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Días entre dos fechas (AAAA-MM-DD o Date), sin contar horas. */
export function diasEntre(desde: string | Date, hasta: string | Date): number {
  const a = new Date(`${(typeof desde === "string" ? desde : isoDia(desde)).slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${(typeof hasta === "string" ? hasta : isoDia(hasta)).slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function faseCohorte(c: FechasCohorte, hoy: string): FaseCohorte {
  if (hoy < c.inicioRecepcion) return "por_iniciar";
  if (hoy <= c.finRecepcion) return "recepcion";
  if (hoy <= c.maxInicioProceso) return "pre_ejecucion";
  if (hoy < sumarDias(c.maxInformeFinal, -30)) return "ejecucion";
  if (hoy <= c.maxInformeFinal) return "ultimo_mes";
  if (hoy <= c.maxAprobacionFinal) return "cierre";
  return "finalizada";
}

/** La cohorte está comenzando (recepción o pre-ejecución) o finalizando (ejecución en adelante). */
export const grupoFase = (f: FaseCohorte): "comenzando" | "finalizando" | null =>
  f === "por_iniciar" || f === "recepcion" || f === "pre_ejecucion" ? "comenzando" : f === "finalizada" ? null : "finalizando";

// ── Pre-ejecución (21 días) ──

export type ClaveRequisito = "plan" | "dictamen_propuesta" | "dictamen_plan" | "primer_contacto";

export const NOMBRE_REQUISITO: Record<ClaveRequisito, string> = {
  plan: "Plan de trabajo",
  dictamen_propuesta: "Dictamen de propuesta",
  dictamen_plan: "Dictamen de plan de trabajo",
  primer_contacto: "Informe de primer contacto",
};

/** Fecha en que se cumplió el requisito (AAAA-MM-DD), null si falta, o "no_aplica". */
export type EstadoRequisito = string | null | "no_aplica";

export interface EntradaPreEjecucion {
  fechaAprobacion: string;
  /** Fecha del inicio oficial de la ejecución, si ya inició. */
  inicioEjecucion: string | null;
  requisitos: Record<ClaveRequisito, EstadoRequisito>;
  cohorte: Pick<FechasCohorte, "maxInformeFinal" | "maxAprobacionFinal">;
}

export interface CalculoPreEjecucion {
  diasTranscurridos: number;
  /** Días que faltan para los 21 (negativo: días de retraso). */
  diasRestantes: number;
  diasRetraso: number;
  entregados: ClaveRequisito[];
  pendientes: ClaveRequisito[];
  /** Día (desde la aprobación) en que quedaron completos los requisitos, o null. */
  diaCompleto: number | null;
  /** Fin estimado del trabajo: el límite del informe final de la cohorte, corrido los días de retraso. */
  finEstimado: string;
  /** El fin estimado pasa del cierre administrativo de la cohorte (fin del período técnico): ya no alcanza. */
  riesgoBaja: boolean;
}

export function calcularPreEjecucion(e: EntradaPreEjecucion, hoy: string): CalculoPreEjecucion {
  const claves = Object.keys(NOMBRE_REQUISITO) as ClaveRequisito[];
  const aplican = claves.filter((k) => e.requisitos[k] !== "no_aplica");
  const entregados = aplican.filter((k) => e.requisitos[k]);
  const pendientes = aplican.filter((k) => !e.requisitos[k]);
  const fechas = entregados.map((k) => e.requisitos[k] as string);
  const completo = pendientes.length === 0 ? (fechas.length ? fechas.sort().at(-1)! : e.fechaAprobacion) : null;
  const diaCompleto = completo ? Math.max(0, diasEntre(e.fechaAprobacion, completo)) : null;
  const corte = e.inicioEjecucion ?? hoy;
  const diasTranscurridos = Math.max(0, diasEntre(e.fechaAprobacion, corte));
  const diasRestantes = DIAS_PREEJECUCION - diasTranscurridos;
  // Retraso: lo que pasó de los 21 días sin completar (o lo que tardó en completar, si ya completó).
  const diasHasta = diaCompleto ?? diasTranscurridos;
  const diasRetraso = Math.max(0, diasHasta - DIAS_PREEJECUCION);
  // Notas del 23-nov-2026: lo que pasa de los 21 días corre la fecha de finalización del trabajo; si pasa del período
  // técnico (cierre administrativo de la cohorte), ya no alcanza a terminar y se le debe dar de baja.
  const finEstimado = sumarDias(e.cohorte.maxInformeFinal, diasRetraso);
  return { diasTranscurridos, diasRestantes, diasRetraso, entregados, pendientes, diaCompleto, finEstimado, riesgoBaja: finEstimado > e.cohorte.maxAprobacionFinal };
}

/** Cuántos completaron los requisitos al día 7, al 14 y cuántos pasaron de los 21 (acumulado). */
export function cumplimientoPorDia(calculos: Pick<CalculoPreEjecucion, "diaCompleto" | "diasTranscurridos">[]) {
  return {
    dia7: calculos.filter((c) => c.diaCompleto !== null && c.diaCompleto <= 7).length,
    dia14: calculos.filter((c) => c.diaCompleto !== null && c.diaCompleto <= 14).length,
    dia21: calculos.filter((c) => c.diaCompleto !== null && c.diaCompleto <= DIAS_PREEJECUCION).length,
    pasaron21: calculos.filter((c) => (c.diaCompleto ?? c.diasTranscurridos) > DIAS_PREEJECUCION).length,
  };
}

// ── CSV ──

/** CSV que abre Excel con tildes: BOM UTF-8, punto y coma (configuración regional de El Salvador) y comillas. */
export function aCsv(filas: (string | number | null | undefined)[][]): string {
  const celda = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
}

// ── Cohorte que finaliza (entrega K2) ──

/** Límites de los informes de período de la cohorte (1 a 5; el quinto es el del informe final). */
export const limitesInformes = (c: { maxPrimerInforme: string; maxSegundoInforme: string; maxTercerInforme: string; maxCuartoInforme: string; maxInformeFinal: string }) =>
  [c.maxPrimerInforme, c.maxSegundoInforme, c.maxTercerInforme, c.maxCuartoInforme, c.maxInformeFinal];

export interface EntregaSeguimiento {
  /** "Informe 2", "Informe final"… */
  nombre: string;
  limite: string;
  /** Fecha en que se envió (AAAA-MM-DD) o null. */
  enviado: string | null;
  /** El asesor lo observó alguna vez (pidió correcciones). */
  observado: boolean;
}

export type EstadoSeguimiento = "terminado" | "al_dia" | "retrasado";

export interface CalculoSeguimiento {
  estado: EstadoSeguimiento;
  /** Días del atraso más largo al corte. */
  diasRetraso: number;
  /** Lo que debe al corte, con sus días: "Informe 2 (12 días)". */
  atrasadoEn: string[];
  entregados: number;
  vencidos: number;
  total: number;
  entregadosTarde: number;
  observados: number;
}

/**
 * Estado de un trabajo en ejecución a una fecha de corte: lo vencido que no se había enviado a esa fecha es retraso.
 * Sirve para el corte de hoy y para cortes pasados (seguimiento de cada 30 días), porque usa las fechas de envío.
 */
export function calcularSeguimiento(entregas: EntregaSeguimiento[], terminado: boolean, corte: string): CalculoSeguimiento {
  const enviadoAlCorte = (e: EntregaSeguimiento) => !!e.enviado && e.enviado <= corte;
  const vencidas = entregas.filter((e) => e.limite < corte);
  const debe = vencidas.filter((e) => !enviadoAlCorte(e));
  const dias = (e: EntregaSeguimiento) => diasEntre(e.limite, corte);
  const r: CalculoSeguimiento = {
    estado: terminado ? "terminado" : debe.length ? "retrasado" : "al_dia",
    diasRetraso: terminado ? 0 : Math.max(0, ...debe.map(dias)),
    atrasadoEn: terminado ? [] : debe.map((e) => `${e.nombre} (${dias(e)} días)`),
    entregados: entregas.filter(enviadoAlCorte).length,
    vencidos: vencidas.length,
    total: entregas.length,
    entregadosTarde: entregas.filter((e) => enviadoAlCorte(e) && e.enviado! > e.limite).length,
    observados: entregas.filter((e) => e.observado).length,
  };
  return r;
}

/**
 * Corte automático del seguimiento: cada 30 días desde el inicio del proceso de la cohorte y, en el último mes y en el
 * cierre, diario (hoy).
 */
export function corteAutomatico(c: FechasCohorte, hoy: string): { corte: string; diario: boolean; proximo: string | null } {
  const fase = faseCohorte(c, hoy);
  if (fase === "ultimo_mes" || fase === "cierre" || fase === "finalizada") return { corte: hoy, diario: true, proximo: null };
  const desde = c.maxInicioProceso;
  if (hoy <= desde) return { corte: hoy, diario: false, proximo: sumarDias(desde, 30) };
  const n = Math.floor(diasEntre(desde, hoy) / 30);
  const corte = n === 0 ? hoy : sumarDias(desde, n * 30);
  return { corte, diario: false, proximo: sumarDias(desde, (n + 1) * 30) };
}

/** Asesor disponible para la nueva cohorte: ya no tiene trabajos sin terminar; «terminando»: solo le falta el cierre. */
export function disponibilidadAsesor(trabajos: { estado: EstadoSeguimiento; soloFalta: "final" | "mas" }[]): "disponible" | "terminando" | "ocupado" {
  const pendientes = trabajos.filter((t) => t.estado !== "terminado");
  if (pendientes.length === 0) return "disponible";
  return pendientes.every((t) => t.soloFalta === "final") ? "terminando" : "ocupado";
}
