// Valores con los que el constructor agrega una etapa nueva, según la modalidad. Módulo puro.
// Las fichas base describen la fase 1 tal como funciona hoy (el proyecto termina en la aprobación), así que no
// incluyen plan ni ejecución de proyecto: estas plantillas son el punto de partida al agregarlas en una ficha nueva.
// Los valores de proyecto salen del documento "Ejemplo para plantilla proyecto" (5-nov-2026).
import { parametrosPorDefecto } from "./catalogo";
import { PRECARGA_CONCLUSIONES_OBJETIVOS, type ClaveElemento, type Espacio, type EtapaEjecucion, type EtapaInformeFinal, type EtapaPlan, type EtapaProtocolo, type Modalidad } from "./tipos";

/** Plan de trabajo jerárquico con los valores recomendados para proyecto (e investigación, que usa el mismo formato). */
export function planNuevo(id: string, modalidad: Modalidad = "proyecto"): EtapaPlan {
  return {
    // Investigación: cada actividad declara el documento que se entrega como prueba (contexto del 12-nov-2026).
    ...(modalidad === "investigacion" ? { documentoSolicitado: "obligatorio" as const } : {}),
    // Cada objetivo específico declara sus productos esperados (notas del 13-nov-2026).
    productosObjetivo: "obligatorio",
    tipo: "plan",
    id,
    nombre: "Plan de trabajo",
    subactividades: "opcional",
    minimos: { objetivosPorIntegrante: 3, macroPorObjetivo: 1, actividadesPorMacro: 1 },
    // Investigación: el plan no lleva presupuesto (respuesta del 12-nov-2026, Q4).
    presupuesto: { activo: modalidad !== "investigacion", desglose: "monto", moneda: "USD" },
    granularidad: "subperiodo",
    equipo: { responsable: "objetivo", planIndividual: true, panelCarga: true },
    aprobacion: { validaSupervisor: true, diasRevision: 5 },
  };
}

/**
 * Etapa de ejecución nueva. Pasantía: los valores de hoy. Proyecto e investigación: 5 informes mensuales, sin
 * métrica (sin mínimo de páginas, palabras ni imágenes), un registro por actividad con su avance, fechas y evidencias, y
 * un solo informe general del equipo (notas del 13-nov-2026: sin marco teórico en el registro ni informes individuales;
 * el sistema ya muestra el avance de cada integrante).
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
  const investigacion = modalidad === "investigacion";
  const total = base.periodos * base.duracionPeriodo;
  return {
    ...base,
    // Investigación: la fase 4 es la presentación de los resultados, al final de la ejecución.
    hitos: investigacion && primera
      ? [{ id: "presentacion-resultados", nombre: "Presentación de los resultados", tipo: "personalizado", momento: "durante", desde: total - 9, hasta: total, requisitoDeInforme: null }]
      : [],
    registro: {
      descripcion: { min: 0, max: 0 },
      conclusion: { min: 0, max: 0 },
      imagenes: 0,
      modo: "actividad",
      // El registro es puntual: qué se hizo, el resultado, el avance y la evidencia (notas del 13-nov-2026).
      marcoTeorico: "no",
      avance: true,
      evidencias: { min: 1, max: 5 },
      modificaciones: true,
      adelantar: true,
    },
    informe: {
      paginasMinimas: 0,
      exigirActividadesAprobadas: true,
      comentariosDecanato: { activo: true, minPalabras: 40 },
      modo: "unico",
    },
  };
}

function espacioProtocolo(id: string, elemento: ClaveElemento, titulo: string, descripcion: string, extra: Partial<Espacio> = {}): Espacio {
  return { id, elemento, titulo, descripcion, ayuda: "", obligatorio: true, parametros: parametrosPorDefecto(elemento), ...extra };
}

/**
 * Protocolo de investigación con las partes del contexto del 12-nov-2026. La portada y el índice se generan, y el
 * "cronograma de actividades" es el plan de trabajo, así que no son espacios. La problemática, la justificación y
 * los objetivos se precargan desde la propuesta (ids de la ficha base de investigación).
 */
export function protocoloNuevo(id: string): EtapaProtocolo {
  const texto = (i: string, t: string, d: string, extra: Partial<Espacio> = {}) => espacioProtocolo(i, "texto", t, d, extra);
  // Redacción académica guiada (13-nov-2026): las partes del protocolo son apartados académicos por subapartados.
  const apartado = (i: string, tipo: string, t: string, d: string, extra: Partial<Espacio> = {}) =>
    espacioProtocolo(i, "apartado", t, d, { parametros: parametrosPorDefecto("apartado", { tipo }), ...extra });
  return {
    tipo: "protocolo",
    id,
    nombre: "Protocolo de investigación",
    revision: { diasRevision: 5, diasHabiles: true, ratificacion: true },
    espacios: [
      texto("introduccion", "Introducción", "Presentación general del estudio", { parametros: parametrosPorDefecto("texto", { minPalabras: 80, maxPalabras: 500 }) }),
      apartado("generalidades", "generalidades", "Generalidades del estudio", "Línea de investigación, contexto y delimitación"),
      apartado("problematica", "problematica", "Problemática a investigar", "Parte de la descripción del problema de la propuesta", { precargarDe: "problema" }),
      apartado("justificacion_protocolo", "justificacion", "Justificación de la investigación", "Parte de la justificación de la propuesta", { precargarDe: "justificacion" }),
      apartado("objetivos_protocolo", "objetivos", "Objetivos", "Parte de los objetivos de la propuesta", { precargarDe: "objetivos" }),
      apartado("hipotesis", "hipotesis", "Hipótesis", "Si procede según el tipo de investigación", { obligatorio: false }),
      espacioProtocolo("matriz_hipotesis", "tabla", "Matriz de hipótesis", "Desglose de la hipótesis", { obligatorio: false }),
      apartado("variables", "variables", "Definición de variables o categorías", "Definición conceptual, operacional e indicadores"),
      apartado("fundamentacion", "fundamentacion", "Fundamentación teórica", "Esquema de temas y desarrollo inicial, con citas APA 7"),
      apartado("metodologia", "metodologia", "Metodología", "Tipo, población y muestra, técnicas, procedimiento y análisis"),
      espacioProtocolo("esquema_informe", "lista", "Esquema del informe final", "Capítulos que llevará el informe de investigación"),
      apartado("bibliografia", "referencias", "Referencias", "Fuentes consultadas, en APA 7 y en orden alfabético"),
      espacioProtocolo("anexos_protocolo", "archivo", "Anexos", "Instrumentos y documentos de apoyo", {
        obligatorio: false,
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf", "word", "excel"], minimo: 0, maximo: 5 }),
      }),
    ],
  };
}

/**
 * Informe final de investigación por capítulos (I5; partes del contexto del 12-nov-2026). La portada, las autoridades
 * académicas y el índice se generan; los anexos de resultados salen de las evidencias de la ejecución. Los capítulos que
 * ya existen se precargan del protocolo (ids de protocoloNuevo); el marco teórico, de la fundamentación teórica.
 */
export function informeFinalNuevo(id: string): EtapaInformeFinal {
  // Redacción académica guiada (13-nov-2026): cada capítulo es un apartado académico (en pasado; conclusiones por objetivo).
  const apartado = (i: string, tipo: string, t: string, d: string, extra: Partial<Espacio> = {}) =>
    espacioProtocolo(i, "apartado", t, d, { parametros: parametrosPorDefecto("apartado", { tipo }), ...extra });
  return {
    tipo: "informe_final",
    id,
    nombre: "Informe final de investigación",
    revision: { porCapitulo: true, ratificacion: true, diasRevision: 5, diasHabiles: true },
    espacios: [
      apartado("if_introduccion", "introduccion", "Introducción", "Presentación del estudio y de la estructura del informe", { precargarDe: "introduccion" }),
      apartado("if_generalidades", "generalidades", "Generalidades del estudio", "Línea de investigación, contexto y delimitación", { precargarDe: "generalidades" }),
      apartado("if_problematica", "problematica", "Problemática o temática investigada", "Parte de la problemática del protocolo", { precargarDe: "problematica" }),
      apartado("if_justificacion", "justificacion", "Justificación de la investigación", "Parte de la justificación del protocolo", { precargarDe: "justificacion_protocolo" }),
      apartado("if_objetivos", "objetivos", "Objetivos", "Parte de los objetivos del protocolo", { precargarDe: "objetivos_protocolo" }),
      apartado("if_marco", "marco_teorico", "Marco teórico o referencial", "Parte de la fundamentación teórica del protocolo", { precargarDe: "fundamentacion" }),
      // Los cinco subapartados de la metodología del protocolo, ahora en pasado (con los cambios respecto de lo planificado).
      apartado("if_metodologia", "metodologia_realizada", "Metodología de la investigación", "Parte de la metodología del protocolo: lo que se realizó", { precargarDe: "metodologia" }),
      // Notas del 13-nov-2026: los resultados se generan solos, por objetivo, con sus productos y evidencias.
      espacioProtocolo("if_resultados", "resultados_objetivos", "Resultados obtenidos", "Se genera con los productos de cada objetivo y los registros de sus actividades"),
      apartado("if_hipotesis", "comprobacion_hipotesis", "Comprobación de hipótesis", "Si procede según el tipo de investigación", { obligatorio: false }),
      apartado("if_hallazgos", "discusion", "Presentación de los hallazgos principales", "Hallazgos más relevantes y su interpretación"),
      apartado("if_conclusiones", "conclusiones", "Conclusiones y recomendaciones", "Parte de las conclusiones aprobadas de cada objetivo específico", { precargarDe: PRECARGA_CONCLUSIONES_OBJETIVOS }),
      apartado("if_bibliografia", "referencias", "Bibliografía", "Referencias en APA 7 y en orden alfabético", { precargarDe: "bibliografia" }),
      // Notas del 13-nov-2026: la bitácora de la ejecución, como anexo que genera el sistema.
      espacioProtocolo("if_modificaciones", "reporte_modificaciones", "Reporte de modificaciones", "Se genera con los cambios reportados en las actividades y los objetivos"),
      espacioProtocolo("if_anexos", "archivo", "Anexos", "Instrumentos y documentos complementarios (las evidencias de las actividades se agregan solas)", {
        obligatorio: false,
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf", "word", "excel"], minimo: 0, maximo: 10 }),
      }),
    ],
  };
}
