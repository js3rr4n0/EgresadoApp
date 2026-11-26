// Historial de egresados en una empresa (specs/VALORACIONES_EMPRESAS_ASESORES.md, entrega V4). Módulo puro: el
// resultado de cada egresado según el cierre del proceso, la baja y la valoración que le dio el asesor.

import type { Modalidad } from "@/lib/estadisticasEmpresas";

export type Resultado = "en_curso" | "satisfactorio" | "no_satisfactorio" | "concluido" | "baja";

export const NOMBRE_RESULTADO: Record<Resultado, string> = {
  en_curso: "En curso",
  satisfactorio: "Satisfactorio",
  no_satisfactorio: "No satisfactorio",
  concluido: "Concluido",
  baja: "Dado de baja",
};

export const AYUDA_RESULTADO: Record<Resultado, string> = {
  en_curso: "El informe final todavía no está aprobado.",
  satisfactorio: "Proceso cerrado y el asesor valoró al egresado con 6 o más.",
  no_satisfactorio: "Proceso cerrado y el asesor valoró al egresado con menos de 6.",
  concluido: "Proceso cerrado; el asesor todavía no valora al egresado.",
  baja: "El proceso se anuló por una baja aprobada por la coordinación.",
};

/** Nota mínima del asesor al egresado para considerar el trabajo satisfactorio. */
export const NOTA_SATISFACTORIA = 6;

export function resultadoDe(o: { anulada: boolean; cerrado: boolean; notaAsesor: number | null }): Resultado {
  if (o.anulada) return "baja";
  if (!o.cerrado) return "en_curso";
  if (o.notaAsesor == null) return "concluido";
  return o.notaAsesor >= NOTA_SATISFACTORIA ? "satisfactorio" : "no_satisfactorio";
}

export interface FilaHistorial {
  propuestaId: number;
  egresadoId: number;
  egresado: string;
  carrera: string | null;
  modalidad: Modalidad;
  titulo: string;
  cohorte: string;
  /** Inicio de la recepción de la cohorte (AAAA-MM-DD), para ordenar. */
  cohorteInicio: string;
  asesor: string | null;
  cerradoEn: string | null;
  resultado: Resultado;
  /** Valoración que el asesor dio al egresado (1 a 10). */
  notaAsesorAlEgresado: number | null;
  /** Valoración que el egresado dio a la empresa (1 a 10). */
  notaEgresadoAEmpresa: number | null;
  motivoBaja: string | null;
}

/** Orden del historial: cohorte más reciente primero, luego por nombre del egresado. */
export const ordenarHistorial = (filas: FilaHistorial[]) =>
  [...filas].sort((a, b) => (a.cohorteInicio !== b.cohorteInicio ? (a.cohorteInicio < b.cohorteInicio ? 1 : -1) : a.egresado.localeCompare(b.egresado, "es")));

export function conteoResultados(filas: FilaHistorial[]): Record<Resultado, number> {
  const c: Record<Resultado, number> = { en_curso: 0, satisfactorio: 0, no_satisfactorio: 0, concluido: 0, baja: 0 };
  filas.forEach((f) => c[f.resultado]++);
  return c;
}
