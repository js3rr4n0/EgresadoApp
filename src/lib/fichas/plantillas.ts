// Valores con los que el constructor agrega una etapa nueva, según la modalidad. Módulo puro.
// Las fichas base describen la fase 1 tal como funciona hoy (el proyecto termina en la aprobación), así que no
// incluyen plan ni ejecución de proyecto: estas plantillas son el punto de partida al agregarlas en una ficha nueva.
// Los valores de proyecto salen del documento "Ejemplo para plantilla proyecto" (5-nov-2026).
import type { EtapaEjecucion, EtapaPlan, Modalidad } from "./tipos";

/** Plan de trabajo jerárquico con los valores recomendados para proyecto. */
export function planNuevo(id: string): EtapaPlan {
  return {
    tipo: "plan",
    id,
    nombre: "Plan de trabajo",
    subactividades: "opcional",
    minimos: { objetivosPorIntegrante: 3, macroPorObjetivo: 1, actividadesPorMacro: 1 },
    presupuesto: { activo: true, desglose: "monto", moneda: "USD" },
    granularidad: "subperiodo",
    equipo: { responsable: "objetivo", planIndividual: true, panelCarga: true },
    aprobacion: { validaSupervisor: true, diasRevision: 5 },
  };
}

/**
 * Etapa de ejecución nueva. Pasantía: los valores de hoy. Proyecto e investigación: 5 informes mensuales, sin
 * métrica (sin mínimo de páginas, palabras ni imágenes), marco teórico opcional, un registro por actividad con su
 * avance y un informe individual por integrante más el general.
 */
export function ejecucionNueva(id: string, modalidad: Modalidad, n: number, primera: boolean): EtapaEjecucion {
  const base = {
    tipo: "ejecucion" as const,
    id,
    nombre: primera ? "Ejecución" : `Etapa de ejecución ${n}`,
    inicio: primera ? ("carta" as const) : ("etapa_anterior" as const),
    unidad: "dias" as const,
    periodos: 5,
    duracionPeriodo: 30,
    subperiodos: 4,
    diasRevision: 3,
    subperiodosAdelantables: 1,
    eliminacionesPorPeriodo: 1,
    diasPrimerContacto: primera ? 7 : null,
    hitos: [],
  };
  if (modalidad === "pasantia") {
    return {
      ...base,
      registro: { descripcion: { min: 200, max: 300 }, conclusion: { min: 40, max: 60 }, imagenes: 2 },
      informe: { paginasMinimas: 20, exigirActividadesAprobadas: true, comentariosDecanato: { activo: true, minPalabras: 40 } },
    };
  }
  return {
    ...base,
    registro: {
      descripcion: { min: 0, max: 0 },
      conclusion: { min: 0, max: 0 },
      imagenes: 0,
      modo: "actividad",
      marcoTeorico: "no",
      avance: true,
      evidencias: { min: 1, max: 5 },
    },
    informe: {
      paginasMinimas: 0,
      exigirActividadesAprobadas: true,
      comentariosDecanato: { activo: true, minPalabras: 40 },
      modo: "individual_y_general",
    },
  };
}
