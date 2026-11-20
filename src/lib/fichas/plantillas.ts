// Valores con los que el constructor agrega una etapa nueva, según la modalidad. Módulo puro.
// Las fichas base describen la fase 1 tal como funciona hoy (el proyecto termina en la aprobación), así que no
// incluyen plan ni ejecución de proyecto: estas plantillas son el punto de partida al agregarlas en una ficha nueva.
// Los valores de proyecto salen del documento "Ejemplo para plantilla proyecto" (5-nov-2026).
import { parametrosPorDefecto } from "./catalogo";
import { definicionBase } from "./fichasBase";
import type { DefinicionFicha } from "./tipos";
import { CIERRE_POR_DEFECTO, COMPONENTES_INVESTIGACION, PRECARGA_CONCLUSIONES_OBJETIVOS, type ClaveElemento, type Espacio, type EtapaEjecucion, type EtapaInformeFinal, type EtapaPlan, type EtapaProtocolo, type Modalidad } from "./tipos";

/**
 * Plantilla recomendada al crear una ficha (recorrido integral, 19-nov-2026): la propuesta de la ficha base y todas las
 * etapas que hoy funcionan con los valores recomendados, para no agregarlas una por una. Proyecto: plan de trabajo y
 * ejecución. Investigación: protocolo, cronograma de investigación, ejecución e informe final por capítulos. La
 * pasantía no tiene plantilla aparte: su ficha base ya es la de la fase 1.
 */
export function plantillaRecomendada(modalidad: Modalidad): DefinicionFicha {
  const base = definicionBase(modalidad);
  if (modalidad === "pasantia") return base;
  const investigacion = modalidad === "investigacion";
  // Notas del 20-nov-2026 (Q4): la propuesta de investigación tiene la sección "Involucrados": quién solicita o
  // patrocina (los actores de siempre, que usan la hoja de inscripción y los informes) y las demás personas o entidades.
  const propuesta = base.etapas.filter((e) => e.tipo === "propuesta").map((e) =>
    !investigacion || e.tipo !== "propuesta" ? e : {
      ...e,
      espacios: e.espacios.map((s) => (s.elemento !== "actores" ? s : {
        ...s,
        titulo: "Involucrados",
        descripcion: "Personas o entidades involucradas en la investigación, empezando por quién la solicita o patrocina.",
        camposExtra: [{
          id: "otros_involucrados", etiqueta: "Otras personas o entidades involucradas", tipo: "lista" as const, obligatorio: false,
          ayuda: "Una por línea: el nombre y cómo participa (por ejemplo, «Laboratorio de Química: presta los equipos»).",
          minimo: 0, maximo: 15, maxPalabras: 30,
        }],
      })),
    }
  );
  return {
    ...base,
    etapas: [
      ...propuesta,
      ...(investigacion ? [protocoloNuevo("protocolo")] : []),
      planNuevo("plan", modalidad),
      ejecucionNueva("ejecucion", modalidad, 1, true),
      // H7 (reunión del 20-nov-2026): proyecto también cierra con informe final por capítulos.
      investigacion ? informeFinalNuevo("informe_final") : informeFinalProyectoNuevo("informe_final"),
    ],
  };
}

/** Plan de trabajo jerárquico con los valores recomendados para proyecto (e investigación, que usa el mismo formato). */
export function planNuevo(id: string, modalidad: Modalidad = "proyecto"): EtapaPlan {
  const investigacion = modalidad === "investigacion";
  return {
    // Proyecto: cada objetivo específico declara sus productos esperados (notas del 13-nov-2026). Investigación
    // (notas del 19-nov-2026): cronograma por elementos del proceso, sin productos ni documentos en el cronograma (las
    // evidencias van en los registros) y con un bloque final para preparar el informe.
    productosObjetivo: investigacion ? "no" : "obligatorio",
    ...(investigacion
      ? { documentoSolicitado: "no" as const, estructura: "investigacion" as const, componentes: COMPONENTES_INVESTIGACION.map((c) => ({ ...c })), cierre: { ...CIERRE_POR_DEFECTO }, metodologiaObjetivo: true }
      : {}),
    tipo: "plan",
    id,
    nombre: "Plan de trabajo",
    subactividades: "opcional",
    minimos: { objetivosPorIntegrante: 3, maxObjetivosPorIntegrante: 4, macroPorObjetivo: 1, actividadesPorMacro: 1 },
    // Investigación también lleva presupuesto (notas del 19-nov-2026; corrige la respuesta Q4 del 12-nov).
    presupuesto: { activo: true, desglose: "monto", moneda: "USD" },
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
      // Ajustes al protocolo (19-nov-2026): el orden de la lista de la reunión; la portada, el índice y el cronograma
      // (el plan de trabajo) se generan; sin "Esquema del informe final", que saldrá de un formato estándar.
      apartado("generalidades", "generalidades", "Resumen y generalidades del proyecto", "Resumen, línea de investigación, contexto y delimitación", {
        partes: [{ id: "resumen", activa: true, opcional: false }, { id: "linea", activa: true }, { id: "contexto", activa: true }],
      }),
      apartado("problematica", "problematica", "Planteamiento del problema", "Parte de la descripción del problema de la propuesta", { precargarDe: "problema" }),
      apartado("justificacion_protocolo", "justificacion", "Justificación de la investigación", "Parte de la justificación de la propuesta", { precargarDe: "justificacion" }),
      apartado("objetivos_protocolo", "objetivos", "Objetivos general y específicos", "Parte de los objetivos de la propuesta", { precargarDe: "objetivos" }),
      apartado("fundamentacion", "fundamentacion", "Marco teórico o fundamentación teórica", "Esquema de temas y desarrollo por párrafos, cada uno con sus fuentes"),
      apartado("hipotesis", "hipotesis", "Hipótesis o supuestos", "Si procede según el tipo de investigación", { obligatorio: false }),
      espacioProtocolo("matriz_hipotesis", "tabla", "Matriz de la hipótesis", "Desglose de la hipótesis", { obligatorio: false }),
      apartado("variables", "variables", "Definición de variables o categorías", "Definición conceptual, operacional e indicadores"),
      apartado("metodologia", "metodologia", "Metodología", "Tipo y enfoque, población y muestra, técnicas e instrumentos, procedimiento y análisis"),
      apartado("eticas", "consideraciones_eticas", "Consideraciones éticas", "Consentimiento, confidencialidad y riesgos (si el estudio trabaja con personas)", { obligatorio: false }),
      espacioProtocolo("recursos", "recursos_presupuesto", "Recursos y presupuesto", "Recursos por categoría y presupuesto de la investigación"),
      apartado("bibliografia", "referencias", "Referencias bibliográficas", "Las fuentes citadas y las consultadas, en APA 7 (mínimo 20)"),
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
/**
 * Informe final por capítulos de proyecto (H7, reunión del 20-nov-2026): el mismo módulo que investigación (versiones,
 * revisión por capítulo, ratificación, PDF y Word). Sin protocolo, los capítulos parten de la propuesta; el desarrollo
 * por objetivo con sus productos y la bitácora los genera el sistema; las conclusiones parten de las de cada objetivo.
 * Orden de los elementos del informe final de proyecto (notas del 20-nov-2026): portada, autoridades e índices los
 * genera el sistema; luego agradecimientos (una página por integrante), introducción, justificación, alcance,
 * objetivos, desarrollo y ejecución, cronograma original y ejecutado, involucrados, conclusiones, bibliografía, reporte
 * de cambios, carta de finalización y anexos.
 */
export function informeFinalProyectoNuevo(id: string): EtapaInformeFinal {
  const apartado = (i: string, tipo: string, t: string, d: string, extra: Partial<Espacio> = {}) =>
    espacioProtocolo(i, "apartado", t, d, { parametros: parametrosPorDefecto("apartado", { tipo }), ...extra });
  const texto = (i: string, t: string, d: string, extra: Partial<Espacio> = {}) =>
    espacioProtocolo(i, "texto", t, d, { parametros: parametrosPorDefecto("texto", { minPalabras: 100, maxPalabras: 0 }), ...extra });
  return {
    tipo: "informe_final",
    id,
    nombre: "Informe final del proyecto",
    revision: { porCapitulo: true, ratificacion: true, diasRevision: 5, diasHabiles: true },
    espacios: [
      apartado("if_agradecimientos", "agradecimientos_equipo", "Agradecimientos", "Opcional: una página por integrante", { obligatorio: false }),
      apartado("if_introduccion", "introduccion_proyecto", "Introducción", "Cuatro párrafos, como en pasantía e investigación"),
      texto("if_justificacion", "Justificación del proyecto", "Parte de la justificación de la propuesta", { precargarDe: "justificacion" }),
      texto("if_alcance", "Alcance del proyecto", "Límites y entregables, a partir de la propuesta", { precargarDe: "alcance" }),
      apartado("if_objetivos", "objetivos", "Objetivos", "Parte de los objetivos de la propuesta", { precargarDe: "objetivos" }),
      // El desarrollo por objetivo, con sus productos y evidencias, lo genera el sistema con la ejecución.
      espacioProtocolo("if_resultados", "resultados_objetivos", "Desarrollo y ejecución del proyecto", "Se genera por objetivo con lo realizado en los cinco meses: sus actividades, sus productos aprobados y las evidencias de la ejecución"),
      espacioProtocolo("if_cronograma", "cronograma_comparado", "Cronograma original y ejecutado", "Se genera con el cronograma del plan y lo ejecutado en cada período"),
      espacioProtocolo("if_involucrados", "anexo_involucrados", "Involucrados", "Se genera con los involucrados de la propuesta, el equipo y el asesor"),
      apartado("if_conclusiones", "conclusiones", "Conclusiones y recomendaciones", "Parte de las conclusiones aprobadas de cada objetivo", { precargarDe: PRECARGA_CONCLUSIONES_OBJETIVOS }),
      apartado("if_bibliografia", "referencias", "Bibliografía", "Referencias en APA 7 y en orden alfabético, si se usaron", { obligatorio: false }),
      espacioProtocolo("if_modificaciones", "reporte_modificaciones", "Reporte de cambios, inconvenientes y modificaciones", "Se genera con los cambios, inconvenientes y modificaciones reportados en la bitácora"),
      // Q7 (20-nov-2026): proyecto también lleva la presentación pública y la carta de finalización.
      apartado("if_presentacion", "presentacion_publica", "Evidencia de presentación pública", "Fecha, lugar, público y fotografías de la presentación"),
      espacioProtocolo("if_carta", "archivo", "Carta de finalización satisfactoria", "PDF de la carta; la revisa el asesor", {
        ayuda: "Suba la carta de finalización satisfactoria en PDF. El sistema no la verifica: la revisa el asesor.",
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf"], minimo: 1, maximo: 1 }),
      }),
      espacioProtocolo("if_anexos", "archivo", "Anexos", "Manuales, planos u otros documentos del proyecto (las evidencias y los productos se agregan solos)", {
        obligatorio: false,
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf", "word", "excel"], minimo: 0, maximo: 10 }),
      }),
    ],
  };
}

export function informeFinalNuevo(id: string): EtapaInformeFinal {
  // Redacción académica guiada (13-nov-2026): cada capítulo es un apartado académico (en pasado; conclusiones por objetivo).
  const apartado = (i: string, tipo: string, t: string, d: string, extra: Partial<Espacio> = {}) =>
    espacioProtocolo(i, "apartado", t, d, { parametros: parametrosPorDefecto("apartado", { tipo }), ...extra });
  return {
    tipo: "informe_final",
    id,
    nombre: "Informe final de investigación",
    revision: { porCapitulo: true, ratificacion: true, diasRevision: 5, diasHabiles: true },
    // Orden de las notas del 20-nov-2026 (INFORME_FINAL_INVESTIGACION.md). Portada, autoridades e índices los genera
    // el sistema. Todo se precarga y se puede modificar, salvo «Desarrollo o ejecución de la investigación».
    espacios: [
      apartado("if_agradecimientos", "agradecimientos", "Agradecimientos", "A mentores, personas y entidades que apoyaron la investigación", { obligatorio: false }),
      apartado("if_introduccion", "introduccion_informe", "Introducción", "Cuatro párrafos, como en el informe final de pasantía"),
      apartado("if_generalidades", "generalidades", "Generalidades del estudio", "Línea de investigación, contexto y delimitación", { precargarDe: "generalidades" }),
      apartado("if_problematica", "problematica", "Problemática o temática investigada", "Parte de la problemática del protocolo", { precargarDe: "problematica" }),
      apartado("if_justificacion", "justificacion", "Justificación de la investigación", "Parte de la justificación del protocolo", { precargarDe: "justificacion_protocolo" }),
      apartado("if_objetivos", "objetivos_informe", "Objetivos", "Los originales del protocolo y, si cambiaron, los finales y por qué", { precargarDe: "objetivos_protocolo" }),
      apartado("if_marco", "marco_teorico", "Marco teórico o referencial", "Parte de la fundamentación teórica del protocolo", { precargarDe: "fundamentacion" }),
      apartado("if_metodologia", "metodologia_informe", "Metodología de la investigación", "Metodología general, tipo de investigación, población y muestra, técnicas e instrumentos", { precargarDe: "metodologia" }),
      // El cuerpo de la investigación: lo que se hizo, se redactó y se aprobó durante la ejecución (no se modifica).
      espacioProtocolo("if_resultados", "resultados_objetivos", "Desarrollo o ejecución de la investigación", "Se genera por objetivo con la metodología, el desarrollo, los resultados, las conclusiones preliminares y la discusión de la ejecución, y con el cronograma original y el ejecutado"),
      apartado("if_analisis", "analisis_informe", "Análisis estadístico o de información realizado", "Notas de los elementos estadísticos, fórmulas, tablas y resultados de su aplicación"),
      apartado("if_resultados_obtenidos", "resultados", "Resultados obtenidos", "Párrafos y datos (tablas, gráficos o fotografías)"),
      // Entrega F2: la tabla de cumplimiento parte de los indicadores del cuadro de variables del protocolo.
      apartado("if_hipotesis", "comprobacion_hipotesis", "Comprobación de hipótesis", "Si procede: fórmulas y cumplimiento de los indicadores del protocolo", { obligatorio: false, precargarDe: "variables" }),
      apartado("if_hallazgos", "discusion", "Presentación de los hallazgos principales", "Hallazgos más relevantes y su interpretación"),
      // Cronograma de investigación (notas del 19-nov-2026): las conclusiones finales se redactan aparte; las de cada
      // objetivo son conclusiones preliminares y ya no se precargan aquí.
      apartado("if_conclusiones", "conclusiones", "Conclusiones y recomendaciones", "Conclusiones finales de la investigación, distintas de las conclusiones preliminares de cada objetivo"),
      // Entrega F3: las fuentes citadas se separan solas de la bibliografía (las consultadas que no se citaron).
      espacioProtocolo("if_referencias", "referencias_citadas", "Citas y referencias", "Se genera con las fuentes citadas dentro del informe"),
      apartado("if_bibliografia", "referencias", "Bibliografía", "Fuentes consultadas o analizadas que no se citaron (las citadas pasan a «Citas y referencias»)", { precargarDe: "bibliografia", obligatorio: false }),
      // Entrega F4: presentación pública, derechos de autoría y anexos obligatorios.
      apartado("if_presentacion", "presentacion_publica", "Evidencia de presentación pública", "Fecha, lugar, público y fotografías de la presentación"),
      espacioProtocolo("if_derechos", "derechos_autoria", "Derechos de autoría de la investigación", "Hoja fija; se edita en la ficha"),
      espacioProtocolo("if_carta", "archivo", "Carta de finalización satisfactoria", "PDF de la carta; la revisa el asesor", {
        ayuda: "Suba la carta de finalización satisfactoria en PDF. El sistema no la verifica: la revisa el asesor.",
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf"], minimo: 1, maximo: 1 }),
      }),
      // Notas del 13-nov-2026: la bitácora de la ejecución, como anexo que genera el sistema.
      espacioProtocolo("if_modificaciones", "reporte_modificaciones", "Reporte de modificaciones", "Se genera con los cambios reportados en las actividades y los objetivos"),
      espacioProtocolo("if_involucrados", "anexo_involucrados", "Involucrados", "Se genera con los involucrados de la propuesta, el equipo y el asesor"),
      espacioProtocolo("if_recursos", "anexo_recursos", "Recursos", "Se genera con los recursos del protocolo y los cambios de la bitácora"),
      espacioProtocolo("if_anexos", "archivo", "Anexos", "Instrumentos y documentos complementarios (las evidencias de las actividades se agregan solas)", {
        obligatorio: false,
        parametros: parametrosPorDefecto("archivo", { tipos: ["pdf", "word", "excel"], minimo: 0, maximo: 10 }),
      }),
    ],
  };
}
