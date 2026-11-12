// Valores con los que el constructor agrega una etapa nueva, según la modalidad. Módulo puro.
// Las fichas base describen la fase 1 tal como funciona hoy (el proyecto termina en la aprobación), así que no
// incluyen plan ni ejecución de proyecto: estas plantillas son el punto de partida al agregarlas en una ficha nueva.
// Los valores de proyecto salen del documento "Ejemplo para plantilla proyecto" (5-nov-2026).
import { parametrosPorDefecto } from "./catalogo";
import { PRECARGA_MARCO_REGISTROS, type ClaveElemento, type Espacio, type EtapaEjecucion, type EtapaInformeFinal, type EtapaPlan, type EtapaProtocolo, type Modalidad } from "./tipos";

/** Plan de trabajo jerárquico con los valores recomendados para proyecto (e investigación, que usa el mismo formato). */
export function planNuevo(id: string, modalidad: Modalidad = "proyecto"): EtapaPlan {
  return {
    // Investigación: cada actividad declara el documento que se entrega como prueba (contexto del 12-nov-2026).
    ...(modalidad === "investigacion" ? { documentoSolicitado: "obligatorio" as const } : {}),
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
      // Investigación: el desarrollo incluye la elaboración del marco teórico o referencial.
      marcoTeorico: investigacion ? "opcional" : "no",
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
  return {
    tipo: "protocolo",
    id,
    nombre: "Protocolo de investigación",
    revision: { diasRevision: 5, diasHabiles: true, ratificacion: true },
    espacios: [
      texto("introduccion", "Introducción", "Presentación general del estudio"),
      texto("generalidades", "Generalidades del estudio", "Institución, contexto y delimitación"),
      texto("problematica", "Problemática a investigar", "Parte de la descripción del problema de la propuesta", { precargarDe: "problema" }),
      texto("justificacion_protocolo", "Justificación de la investigación", "Parte de la justificación de la propuesta", { precargarDe: "justificacion" }),
      texto("objetivos_protocolo", "Objetivos", "Parte de los objetivos de la propuesta", { precargarDe: "objetivos" }),
      texto("hipotesis", "Enunciado de la hipótesis", "Si procede según el tipo de investigación", { obligatorio: false }),
      espacioProtocolo("matriz_hipotesis", "tabla", "Matriz de hipótesis", "Desglose de la hipótesis", { obligatorio: false }),
      texto("tipo_investigacion", "Tipo de investigación", "Metodología: enfoque y tipo de estudio"),
      texto("poblacion_muestra", "Población y muestra", "Metodología: a quién se estudia y cómo se selecciona"),
      texto("tecnicas", "Técnica e instrumentos", "Metodología: cómo se recopilan los datos"),
      texto("procedimiento", "Procedimiento", "Metodología: pasos para realizar el estudio"),
      texto("analisis", "Análisis estadístico o de información", "Metodología: cómo se analizarán los datos"),
      espacioProtocolo("esquema_informe", "lista", "Esquema del informe final", "Capítulos que llevará el informe de investigación"),
      espacioProtocolo("bibliografia", "lista", "Bibliografía", "Referencias consultadas, en formato APA"),
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
 * ya existen se precargan: del protocolo (ids de protocoloNuevo) o del marco teórico registrado en las actividades.
 */
export function informeFinalNuevo(id: string): EtapaInformeFinal {
  const texto = (i: string, t: string, d: string, extra: Partial<Espacio> = {}) => espacioProtocolo(i, "texto", t, d, extra);
  return {
    tipo: "informe_final",
    id,
    nombre: "Informe final de investigación",
    revision: { porCapitulo: true, ratificacion: true, diasRevision: 5, diasHabiles: true },
    espacios: [
      texto("if_introduccion", "Introducción", "Presentación del estudio y de la estructura del informe", { precargarDe: "introduccion" }),
      texto("if_generalidades", "Generalidades del estudio", "Institución, contexto y delimitación", { precargarDe: "generalidades" }),
      texto("if_problematica", "Problemática o temática investigada", "Parte de la problemática del protocolo", { precargarDe: "problematica" }),
      texto("if_justificacion", "Justificación de la investigación", "Parte de la justificación del protocolo", { precargarDe: "justificacion_protocolo" }),
      texto("if_objetivos", "Objetivos", "Parte de los objetivos del protocolo", { precargarDe: "objetivos_protocolo" }),
      texto("if_marco", "Marco teórico o referencial", "Parte del marco teórico registrado en las actividades", { precargarDe: PRECARGA_MARCO_REGISTROS }),
      texto("if_tipo", "Tipo de investigación", "Metodología", { precargarDe: "tipo_investigacion" }),
      texto("if_poblacion", "Población y muestra", "Metodología", { precargarDe: "poblacion_muestra" }),
      texto("if_tecnicas", "Técnica e instrumentos utilizados", "Metodología", { precargarDe: "tecnicas" }),
      texto("if_procedimiento", "Procedimiento realizado", "Metodología", { precargarDe: "procedimiento" }),
      texto("if_analisis", "Análisis estadístico o de información realizada", "Metodología", { precargarDe: "analisis" }),
      texto("if_resultados", "Resultados obtenidos", "Presentación de los resultados del estudio"),
      texto("if_hipotesis", "Comprobación de hipótesis", "Si procede según el tipo de investigación", { obligatorio: false }),
      texto("if_hallazgos", "Presentación de los hallazgos principales", "Hallazgos más relevantes y su interpretación"),
      texto("if_conclusiones", "Conclusiones", "Conclusiones de la investigación"),
      espacioProtocolo("if_bibliografia", "lista", "Bibliografía", "Referencias en formato APA", {
        precargarDe: "bibliografia",
        parametros: parametrosPorDefecto("lista", { minimo: 3, maximo: 50 }),
      }),
      espacioProtocolo("if_anexos", "archivo", "Anexos", "Instrumentos y documentos complementarios (las evidencias de las actividades se agregan solas)", {
        obligatorio: false,
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf", "word", "excel"], minimo: 0, maximo: 10 }),
      }),
    ],
  };
}
