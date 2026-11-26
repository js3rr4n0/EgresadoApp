// Estadísticas del catálogo de empresas (specs/VALORACIONES_EMPRESAS_ASESORES.md, entrega V1). Módulo puro: recibe
// los procesos ya leídos de la base y arma, por empresa, los conteos de la tabla y del detalle.

import { faseCohorte, NOMBRE_FASE, type FechasCohorte, type FaseCohorte } from "@/lib/seguimientoCohortes";

/** Estados de propuesta que cuentan como proceso realizado con la empresa (aprobada en adelante). */
export const ESTADOS_PROCESO = ["aprobada", "primer_contacto_completado", "en_ejecucion"] as const;

export type Modalidad = "pasantia" | "proyecto" | "investigacion";

export const NOMBRE_MODALIDAD: Record<Modalidad, string> = {
  pasantia: "Pasantía",
  proyecto: "Proyecto",
  investigacion: "Investigación",
};

export interface ProcesoEmpresa {
  propuestaId: number;
  empresaId: number;
  tipo: Modalidad;
  estado: string;
  titulo: string | null;
  fechaAprobacion: string | null;
  cohorte: { id: number } & FechasCohorte & { nombre: string };
  asesor: { id: number; nombre: string } | null;
  /** Egresado responsable e integrantes aceptados (proyecto e investigación). */
  egresados: { id: number; nombre: string; carrera: string | null }[];
}

export interface CohorteEmpresa {
  id: number;
  nombre: string;
  /** Inicio de la recepción (AAAA-MM-DD), sirve para ordenar. */
  inicio: string;
  fase: FaseCohorte;
  nombreFase: string;
  enCurso: boolean;
  procesos: number;
}

export interface AsesorEmpresa {
  id: number;
  nombre: string;
  procesos: number;
  ultimaCohorte: string;
}

export interface EstadisticasEmpresa {
  procesos: number;
  egresados: number;
  porModalidad: Record<Modalidad, number>;
  cohortes: CohorteEmpresa[]; // de la más reciente a la más antigua
  ultimaCohorte: CohorteEmpresa | null;
  cohortesEnCurso: number;
  asesores: AsesorEmpresa[];
  ultimoAsesor: { id: number; nombre: string; cohorte: string } | null;
}

export const estadisticasVacias = (): EstadisticasEmpresa => ({
  procesos: 0,
  egresados: 0,
  porModalidad: { pasantia: 0, proyecto: 0, investigacion: 0 },
  cohortes: [],
  ultimaCohorte: null,
  cohortesEnCurso: 0,
  asesores: [],
  ultimoAsesor: null,
});

/** Orden del más reciente al más antiguo: por inicio de la cohorte y luego por fecha de aprobación. */
export function compararRecientes(a: ProcesoEmpresa, b: ProcesoEmpresa): number {
  if (a.cohorte.inicioRecepcion !== b.cohorte.inicioRecepcion) return a.cohorte.inicioRecepcion < b.cohorte.inicioRecepcion ? 1 : -1;
  const fa = a.fechaAprobacion ?? "";
  const fb = b.fechaAprobacion ?? "";
  if (fa !== fb) return fa < fb ? 1 : -1;
  return b.propuestaId - a.propuestaId;
}

export function calcularEstadisticas(procesos: ProcesoEmpresa[], hoy: string): EstadisticasEmpresa {
  const est = estadisticasVacias();
  if (procesos.length === 0) return est;
  const ordenados = [...procesos].sort(compararRecientes);

  const egresados = new Set<number>();
  const cohortes = new Map<number, CohorteEmpresa>();
  const asesores = new Map<number, AsesorEmpresa>();

  for (const p of ordenados) {
    est.procesos++;
    est.porModalidad[p.tipo]++;
    p.egresados.forEach((e) => egresados.add(e.id));

    const c = cohortes.get(p.cohorte.id);
    if (c) c.procesos++;
    else {
      const fase = faseCohorte(p.cohorte, hoy);
      cohortes.set(p.cohorte.id, {
        id: p.cohorte.id,
        nombre: p.cohorte.nombre,
        fase,
        nombreFase: NOMBRE_FASE[fase],
        enCurso: fase !== "finalizada" && fase !== "por_iniciar",
        procesos: 1,
        inicio: p.cohorte.inicioRecepcion,
      });
    }

    if (p.asesor) {
      const a = asesores.get(p.asesor.id);
      if (a) a.procesos++;
      else asesores.set(p.asesor.id, { id: p.asesor.id, nombre: p.asesor.nombre, procesos: 1, ultimaCohorte: p.cohorte.nombre });
      if (!est.ultimoAsesor) est.ultimoAsesor = { id: p.asesor.id, nombre: p.asesor.nombre, cohorte: p.cohorte.nombre };
    }
  }

  est.egresados = egresados.size;
  est.cohortes = [...cohortes.values()].sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
  est.ultimaCohorte = est.cohortes[0] ?? null;
  est.cohortesEnCurso = est.cohortes.filter((c) => c.enCurso).length;
  est.asesores = [...asesores.values()];
  return est;
}
