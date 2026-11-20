// Apartados académicos (revisión del 13-nov-2026; specs/fichas/REDACCION_ACADEMICA.md). Cada tipo de apartado del protocolo
// y del informe final se redacta por subapartados, con una guía (propósito, autoevaluación, errores frecuentes, ejemplo) y
// revisiones automáticas en vivo. Fuente principal: "Estructura del protocolo de investigación", UNICAES (DIYPS, 2024),
// complementada con rúbricas de evaluación de protocolos y el planteamiento del problema de Hernández-Sampieri.
// Las revisiones son orientativas: solo los subapartados vacíos o por debajo del mínimo impiden enviar. Módulo puro.
import type { ConfigParte, Espacio } from "./tipos";
import { leerParrafos, parrafoConCita } from "./fuentes";

/** "citado": párrafos con sus fuentes del registro y la cita armada (ajustes al protocolo, 19-nov-2026). */
export type FormatoParte = "texto" | "pregunta" | "seleccion" | "lista" | "tabla" | "referencias" | "citado";

export interface ParteApartado {
  id: string;
  titulo: string;
  ayuda: string;
  formato: FormatoParte;
  /** Palabras mínimas y máximas (texto y pregunta). 0 = sin límite. */
  min?: number;
  max?: number;
  opcional?: boolean;
  /** Tabla: encabezados. */
  columnas?: string[];
  /** Selección: opciones. */
  opciones?: { valor: string; etiqueta: string }[];
  /** Lista: elementos; tabla: filas con contenido. 0 o sin valor = sin límite (ajustes al protocolo, 19-nov-2026). */
  minItems?: number;
  maxItems?: number;
  /** Subapartado propio de la ficha (no viene del tipo). */
  propia?: boolean;
  /** Párrafos citados: cada párrafo debe tener al menos una fuente (por defecto, sí). */
  citaPorParrafo?: boolean;
}

export type RevisionEspecial = "pregunta" | "hipotesis" | "objetivos" | "conclusiones" | "referencias";

export interface TipoApartado {
  clave: string;
  nombre: string;
  /** Etapa en la que se usa normalmente (las plantillas lo respetan; el constructor permite cualquiera). */
  etapa: "protocolo" | "informe" | "ambas";
  proposito: string;
  partes: ParteApartado[];
  /** Citas APA mínimas en el texto (0 = no se exigen). La ficha puede cambiarlo. */
  citasMinimas: number;
  autoevaluacion: string[];
  errores: string[];
  ejemplo: string;
  especiales: RevisionEspecial[];
}

/** Líneas y ejes de investigación institucionales (UNICAES). */
export const LINEAS_UNICAES = [
  { valor: "educacion", etiqueta: "Educación, desarrollo personal y social", ejes: ["Educación", "Persona humana", "Familia y sociedad"] },
  { valor: "comunicacion", etiqueta: "Comunicación y ética", ejes: ["La ética en la publicidad y en las comunicaciones"] },
  { valor: "gestion_tic", etiqueta: "Gestión empresarial y tecnologías de la información y comunicación", ejes: ["Gestión, principalmente en la pequeña y mediana empresa", "Tecnologías de la información y la comunicación"] },
  { valor: "arquitectura", etiqueta: "Mantenimiento y desarrollo arquitectónico", ejes: ["Innovación del diseño y de la construcción", "Nuevas técnicas para la conservación del patrimonio arquitectónico", "Seguridad ocupacional"] },
  { valor: "salud", etiqueta: "Salud y seguridad alimentaria", ejes: ["Salud preventiva y curativa", "Producción alimentaria"] },
  { valor: "sostenible", etiqueta: "Desarrollo sostenible", ejes: ["Medio ambiente", "Desarrollo local"] },
];

const LINEAS_OPCIONES = LINEAS_UNICAES.flatMap((l) => l.ejes.map((e) => ({ valor: `${l.valor}::${e}`, etiqueta: `${l.etiqueta} — ${e}` })));

export const TIPOS_APARTADO: Record<string, TipoApartado> = {
  consideraciones_eticas: {
    clave: "consideraciones_eticas", nombre: "Consideraciones éticas", etapa: "protocolo",
    proposito: "Explica cómo se protegerá a las personas que participan: su consentimiento, la confidencialidad de sus datos y los riesgos del estudio.",
    partes: [
      { id: "consentimiento", titulo: "Consentimiento informado", ayuda: "Cómo se informará a los participantes y cómo darán su consentimiento (y el de sus tutores, si son menores).", formato: "texto", min: 30, max: 250 },
      { id: "confidencialidad", titulo: "Confidencialidad y uso de los datos", ayuda: "Cómo se protegerán la identidad y los datos, quién tendrá acceso y por cuánto tiempo se guardarán.", formato: "texto", min: 30, max: 250 },
      { id: "riesgos", titulo: "Riesgos y beneficios", ayuda: "Posibles riesgos para los participantes, cómo se reducirán y qué beneficios obtienen.", formato: "texto", min: 20, max: 250, opcional: true },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Expliqué cómo se pedirá el consentimiento.", "Indiqué cómo se protegerán los datos."],
    errores: ["Prometer anonimato y luego pedir el nombre en el instrumento.", "Omitir el consentimiento de los tutores de participantes menores de edad."],
    ejemplo: "Antes de aplicar la encuesta se explicará el propósito del estudio y se pedirá el consentimiento por escrito; las respuestas serán anónimas y solo el equipo tendrá acceso a la base de datos.",
    especiales: [],
  },
  generalidades: {
    clave: "generalidades", nombre: "Generalidades", etapa: "ambas",
    proposito: "Ubica el estudio: la línea y el eje de investigación de la universidad, la unidad donde se genera y el contexto en que se realizará.",
    partes: [
      { id: "linea", titulo: "Línea y eje temático de investigación", ayuda: "Elija la línea institucional de UNICAES a la que aporta el estudio.", formato: "seleccion", opciones: LINEAS_OPCIONES },
      { id: "contexto", titulo: "Contexto y delimitación del estudio", ayuda: "Dónde (institución, lugar), cuándo (período) y con quiénes se realizará el estudio.", formato: "texto", min: 80, max: 400 },
      // Ajustes al protocolo (19-nov-2026): opcional en el tipo para no cambiar las versiones habilitadas; la plantilla lo pide.
      { id: "resumen", titulo: "Resumen del proyecto", ayuda: "En un párrafo: qué se investigará, con quiénes, cómo y qué se espera obtener.", formato: "texto", min: 80, max: 300, opcional: true },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Indiqué el lugar, el período y la población del estudio.", "La línea elegida corresponde al tema."],
    errores: ["Repetir aquí el problema completo: basta con ubicar el estudio.", "Omitir el período de ejecución."],
    ejemplo: "El estudio se realizará en la Facultad de Ingeniería de la Universidad Católica de El Salvador, con estudiantes de primer año, entre octubre de 2026 y marzo de 2027.",
    especiales: [],
  },
  problematica: {
    clave: "problematica", nombre: "Problemática", etapa: "ambas",
    proposito: "Describe la situación que necesita investigarse, fundamentada en la realidad y en la teoría (estado del arte), y la formula como una pregunta de investigación, con su importancia y sus beneficiarios.",
    partes: [
      { id: "situacion", titulo: "Situación problemática", ayuda: "Describa el problema en la realidad: qué ocurre, dónde, desde cuándo, a quiénes afecta. Use datos cuando los tenga.", formato: "texto", min: 120, max: 600 },
      { id: "estado_arte", titulo: "Estado del arte", ayuda: "Qué se sabe del tema: estudios previos, teorías y qué falta por conocer. Cite las fuentes en APA 7.", formato: "texto", min: 120, max: 700 },
      { id: "pregunta", titulo: "Pregunta de investigación", ayuda: "Formule el problema como una pregunta clara que relacione las variables o categorías, entre signos de interrogación.", formato: "pregunta", min: 8, max: 60 },
      { id: "importancia", titulo: "Importancia y beneficiarios", ayuda: "Por qué es importante resolverlo y quiénes se benefician con los resultados.", formato: "texto", min: 60, max: 300 },
    ],
    citasMinimas: 2,
    autoevaluacion: ["El problema está delimitado en lugar, tiempo y población.", "La pregunta relaciona las variables o categorías del estudio.", "El problema es observable o medible.", "Expliqué qué se sabe y qué falta por conocer."],
    errores: ["Plantear una solución en lugar de un problema.", "Una pregunta que se responde con sí o no.", "Afirmaciones sin datos ni fuentes."],
    ejemplo: "¿Qué relación existe entre la frecuencia de uso de asistentes de inteligencia artificial y el desempeño en los fundamentos de programación de los estudiantes de primer año de Ingeniería en Sistemas de UNICAES en 2026?",
    especiales: ["pregunta"],
  },
  justificacion: {
    clave: "justificacion", nombre: "Justificación", etapa: "ambas",
    proposito: "Explica para qué sirve la investigación: su conveniencia, su relevancia social, su valor teórico o práctico y su viabilidad.",
    partes: [
      { id: "conveniencia", titulo: "Conveniencia y relevancia social", ayuda: "Para qué sirve el estudio y a quién beneficia en la sociedad o en la institución.", formato: "texto", min: 60, max: 300 },
      { id: "valor", titulo: "Valor teórico, práctico o metodológico", ayuda: "Qué aporta: llena un vacío de conocimiento, resuelve un problema práctico o propone un instrumento.", formato: "texto", min: 60, max: 300 },
      { id: "viabilidad", titulo: "Viabilidad", ayuda: "Por qué se puede realizar: acceso a la población, tiempo, recursos y aspectos éticos.", formato: "texto", min: 40, max: 250 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Expliqué el aporte del estudio, no solo su importancia general.", "Consideré los aspectos éticos (consentimiento, confidencialidad)."],
    errores: ["Repetir la problemática.", "Justificar solo con opiniones personales."],
    ejemplo: "Los resultados permitirán a la carrera orientar el uso de asistentes de IA en las asignaturas de programación y proponer buenas prácticas a docentes y estudiantes.",
    especiales: [],
  },
  objetivos: {
    clave: "objetivos", nombre: "Objetivos", etapa: "ambas",
    proposito: "Son la guía de la investigación: un objetivo general y de tres a cuatro específicos por integrante, puntuales y claros, donde se identifican las variables o categorías.",
    partes: [
      { id: "general", titulo: "Objetivo general", ayuda: "Inicie con un verbo en infinitivo y responda a la pregunta de investigación.", formato: "texto", min: 10, max: 60 },
      { id: "especificos", titulo: "Objetivos específicos", ayuda: "Uno por línea, cada uno con un verbo en infinitivo medible (identificar, determinar, analizar, comparar, describir…).", formato: "lista", minItems: 3, maxItems: 4 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Cada objetivo identifica una variable o categoría.", "Los específicos, juntos, cumplen el general.", "Son alcanzables con la metodología y el tiempo disponibles."],
    errores: ["Verbos difíciles de medir: conocer, comprender, entender, saber.", "Objetivos que son actividades (aplicar la encuesta) y no resultados."],
    ejemplo: "Determinar la frecuencia de uso de asistentes de IA en los estudiantes de primer año de Ingeniería en Sistemas.",
    especiales: ["objetivos"],
  },
  hipotesis: {
    clave: "hipotesis", nombre: "Hipótesis", etapa: "ambas",
    proposito: "Son los supuestos del estudio (si proceden): la hipótesis de investigación y la hipótesis nula, que anticipan la respuesta a la pregunta.",
    partes: [
      { id: "hi", titulo: "Hipótesis de investigación (Hi)", ayuda: "Afirmación que relaciona las variables y que se puede comprobar.", formato: "texto", min: 10, max: 80 },
      { id: "ho", titulo: "Hipótesis nula (Ho)", ayuda: "La negación de la hipótesis de investigación.", formato: "texto", min: 10, max: 80 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["La hipótesis responde a la pregunta de investigación.", "Usa las mismas variables que los objetivos.", "Se puede comprobar con los instrumentos previstos."],
    errores: ["Hipótesis que no se pueden medir.", "Una hipótesis nula que no es la negación de la de investigación."],
    ejemplo: "Hi: A mayor frecuencia de uso de asistentes de IA, menor es el desempeño en los fundamentos de programación. Ho: No existe relación entre ambas variables.",
    especiales: ["hipotesis"],
  },
  variables: {
    clave: "variables", nombre: "Definición de variables o categorías", etapa: "ambas",
    proposito: "Cuadro que define conceptual y operacionalmente cada variable o categoría del estudio, con los indicadores que la conforman.",
    partes: [
      { id: "cuadro", titulo: "Cuadro de variables o categorías", ayuda: "Una fila por variable o categoría de los objetivos.", formato: "tabla", columnas: ["Variable o categoría", "Definición conceptual", "Definición operacional", "Indicadores"], minItems: 1, maxItems: 10 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Están todas las variables de los objetivos y de la hipótesis.", "Cada indicador se puede observar o medir con un instrumento."],
    errores: ["Definiciones de diccionario sin fuente.", "Indicadores que no se pueden medir."],
    ejemplo: "Frecuencia de uso de IA · Grado en que el estudiante recurre a asistentes de IA (autor, año) · Horas semanales reportadas en la encuesta · Horas por semana; tareas resueltas con IA.",
    especiales: [],
  },
  fundamentacion: {
    clave: "fundamentacion", nombre: "Fundamentación teórica", etapa: "protocolo",
    proposito: "Lectura inicial de teoría: el esquema de los temas que darán forma conceptual a la investigación, en función de las variables, con fuentes académicas confiables (APA 7).",
    partes: [
      { id: "esquema", titulo: "Esquema de temas", ayuda: "Un tema por línea, en orden (1., 1.1, 1.2…), organizado por variables o categorías.", formato: "lista" },
      { id: "desarrollo", titulo: "Desarrollo inicial", ayuda: "Escriba por párrafos lo que dicen los autores sobre cada variable. Cada párrafo se sustenta en una o más fuentes: elíjalas y el sistema agrega la cita (Apellido, año) y la referencia.", formato: "citado", min: 200, max: 1200, citaPorParrafo: true },
    ],
    citasMinimas: 3,
    autoevaluacion: ["El esquema sigue las variables o categorías.", "Usé fuentes académicas (libros, artículos arbitrados), no solo páginas web."],
    errores: ["Copiar textos sin citar (plagio).", "Temas que no se relacionan con las variables."],
    ejemplo: "1. Asistentes de inteligencia artificial en la educación · 1.1 Definición y tipos · 2. Aprendizaje de la programación · 2.1 Fundamentos y dificultades frecuentes",
    especiales: [],
  },
  metodologia: {
    clave: "metodologia", nombre: "Metodología", etapa: "ambas",
    proposito: "Describe cómo se realizará la investigación: tipo y enfoque, población y muestra, técnicas e instrumentos de recolección, procedimiento y análisis.",
    partes: [
      { id: "tipo", titulo: "Tipo y enfoque de investigación", ayuda: "Enfoque (cuantitativo, cualitativo o mixto), alcance (exploratorio, descriptivo, correlacional, explicativo) y diseño.", formato: "texto", min: 40, max: 250 },
      { id: "poblacion", titulo: "Población y muestra", ayuda: "A quiénes se estudia, cuántos son, cómo se selecciona la muestra y su tamaño.", formato: "texto", min: 40, max: 250 },
      { id: "tecnicas", titulo: "Técnicas e instrumentos", ayuda: "Cómo se recolectarán los datos (encuesta, entrevista, observación…) y con qué instrumento; cómo se validará.", formato: "texto", min: 40, max: 250 },
      { id: "procedimiento", titulo: "Procedimiento", ayuda: "Pasos para realizar el estudio, en orden.", formato: "texto", min: 40, max: 300 },
      { id: "analisis", titulo: "Análisis de datos", ayuda: "Cómo se analizarán los datos: estadística descriptiva, pruebas, software o análisis de contenido.", formato: "texto", min: 30, max: 250 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["El tipo de estudio corresponde a los objetivos y a la hipótesis.", "El instrumento mide los indicadores del cuadro de variables.", "La muestra es suficiente y su selección está explicada."],
    errores: ["Nombrar el tipo de investigación sin explicar por qué.", "Un instrumento que no mide las variables."],
    ejemplo: "Enfoque cuantitativo, alcance correlacional y diseño no experimental transversal.",
    especiales: [],
  },
  referencias: {
    clave: "referencias", nombre: "Referencias", etapa: "ambas",
    proposito: "Las fuentes que fundamentan la investigación, en normas APA séptima edición, en orden alfabético.",
    partes: [
      { id: "lista", titulo: "Referencias (APA 7)", ayuda: "Las fuentes que citó se agregan solas. Agregue también las que consultó aunque no las haya citado.", formato: "referencias", minItems: 20 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Toda cita del texto está en las referencias, y al revés.", "Las fuentes son recientes (preferentemente de los últimos 10 años)."],
    errores: ["Referencias sin año o sin título.", "Mezclar formatos distintos de APA."],
    ejemplo: "Hernández-Sampieri, R., y Mendoza, C. P. (2018). Metodología de la investigación: las rutas cuantitativa, cualitativa y mixta. McGraw-Hill.",
    especiales: ["referencias"],
  },
  // ── Informe final ──
  introduccion: {
    clave: "introduccion", nombre: "Introducción", etapa: "informe",
    proposito: "Presenta el estudio al lector: el tema, el propósito, cómo se realizó y cómo está organizado el informe.",
    partes: [
      { id: "presentacion", titulo: "Presentación del estudio", ayuda: "Tema, problema y propósito en pocas líneas.", formato: "texto", min: 80, max: 400 },
      { id: "estructura", titulo: "Estructura del informe", ayuda: "Qué contiene cada capítulo.", formato: "texto", min: 40, max: 250 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Un lector entiende de qué trata el estudio sin leer el resto."],
    errores: ["Adelantar resultados o conclusiones."],
    ejemplo: "El presente informe expone los resultados del estudio sobre…",
    especiales: [],
  },
  marco_teorico: {
    clave: "marco_teorico", nombre: "Marco teórico o referencial", etapa: "informe",
    proposito: "Desarrolla los conceptos y estudios que sustentan la investigación, organizados por variables o categorías y vinculados a los objetivos.",
    partes: [
      { id: "desarrollo", titulo: "Desarrollo del marco teórico", ayuda: "Organice por temas (variables). Cite en APA 7 todo lo que no es propio.", formato: "texto", min: 400, max: 6000 },
    ],
    citasMinimas: 5,
    autoevaluacion: ["Cada tema se relaciona con una variable u objetivo.", "Comparé posturas de distintos autores, no solo las describí."],
    errores: ["Párrafos copiados sin cita.", "Teoría que luego no se usa en la discusión."],
    ejemplo: "Según Chen et al. (2021), los asistentes de programación basados en IA…",
    especiales: [],
  },
  metodologia_realizada: {
    clave: "metodologia_realizada", nombre: "Metodología de la investigación (realizada)", etapa: "informe",
    proposito: "Describe en pasado cómo se realizó la investigación, incluidos los cambios respecto del protocolo.",
    partes: [
      { id: "tipo", titulo: "Tipo de investigación", ayuda: "Enfoque, alcance y diseño utilizados.", formato: "texto", min: 40, max: 250 },
      { id: "poblacion", titulo: "Población y muestra", ayuda: "Población real alcanzada y muestra efectiva.", formato: "texto", min: 40, max: 250 },
      { id: "tecnicas", titulo: "Técnicas e instrumentos utilizados", ayuda: "Instrumentos aplicados y su validación.", formato: "texto", min: 40, max: 250 },
      { id: "procedimiento", titulo: "Procedimiento realizado", ayuda: "Qué se hizo, en orden, y cualquier cambio respecto del protocolo.", formato: "texto", min: 40, max: 400 },
      { id: "analisis", titulo: "Análisis estadístico o de información realizado", ayuda: "Cómo se procesaron y analizaron los datos.", formato: "texto", min: 30, max: 300 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Expliqué las diferencias con lo planificado en el protocolo."],
    errores: ["Copiar la metodología del protocolo en futuro."],
    ejemplo: "Se aplicó un cuestionario de 20 ítems a 60 estudiantes…",
    especiales: [],
  },
  resultados: {
    clave: "resultados", nombre: "Resultados obtenidos", etapa: "informe",
    proposito: "Presenta los datos obtenidos de forma objetiva, ordenados por objetivo, sin interpretarlos todavía.",
    partes: [
      { id: "resultados", titulo: "Resultados por objetivo", ayuda: "Un bloque por objetivo específico, con los datos que lo responden (tablas y figuras en anexos o en el texto).", formato: "texto", min: 300, max: 6000 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Presenté resultados para cada objetivo específico.", "No mezclé opiniones con los datos."],
    errores: ["Interpretar en lugar de presentar.", "Datos sin indicar de dónde salen."],
    ejemplo: "El 65 % de los estudiantes reportó usar asistentes de IA más de cinco horas por semana…",
    especiales: [],
  },
  comprobacion_hipotesis: {
    clave: "comprobacion_hipotesis", nombre: "Comprobación de hipótesis", etapa: "informe",
    proposito: "Indica si la hipótesis se acepta o se rechaza, con la prueba y los datos que lo sustentan.",
    partes: [
      { id: "prueba", titulo: "Prueba realizada y decisión", ayuda: "Prueba estadística o criterio, valor obtenido y decisión sobre Hi y Ho.", formato: "texto", min: 40, max: 400 },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Indiqué con claridad si se acepta o se rechaza la hipótesis nula."],
    errores: ["Afirmar que la hipótesis se 'demostró' sin una prueba."],
    ejemplo: "Con r = -0.42 (p < 0.05) se rechaza la hipótesis nula…",
    especiales: [],
  },
  discusion: {
    clave: "discusion", nombre: "Presentación de los hallazgos principales", etapa: "informe",
    proposito: "Interpreta los resultados y los contrasta con el marco teórico y con estudios previos.",
    partes: [
      { id: "hallazgos", titulo: "Hallazgos y discusión", ayuda: "Qué significan los resultados, si coinciden o no con otros autores, y por qué.", formato: "texto", min: 200, max: 3000 },
    ],
    citasMinimas: 2,
    autoevaluacion: ["Contrasté cada hallazgo con al menos un autor del marco teórico."],
    errores: ["Repetir los resultados sin interpretarlos."],
    ejemplo: "Estos resultados coinciden con lo señalado por…",
    especiales: [],
  },
  conclusiones: {
    clave: "conclusiones", nombre: "Conclusiones", etapa: "informe",
    proposito: "Responden al problema y a cada objetivo específico a partir de los hallazgos, sin repetir los resultados.",
    partes: [
      { id: "conclusiones", titulo: "Conclusiones", ayuda: "Una conclusión por objetivo específico, cada una en su propio párrafo.", formato: "texto", min: 120, max: 1500 },
      { id: "recomendaciones", titulo: "Recomendaciones", ayuda: "Acciones concretas que se desprenden de las conclusiones (opcional).", formato: "texto", min: 0, max: 800, opcional: true },
    ],
    citasMinimas: 0,
    autoevaluacion: ["Cada objetivo específico tiene su conclusión.", "No introduje datos nuevos."],
    errores: ["Confundir conclusiones con recomendaciones.", "Conclusiones que no se apoyan en los resultados."],
    ejemplo: "En relación con el primer objetivo, se concluye que…",
    especiales: ["conclusiones"],
  },
};

export const TIPOS_APARTADO_OPCIONES = Object.values(TIPOS_APARTADO).map((t) => ({
  valor: t.clave,
  etiqueta: `${t.nombre}${t.etapa === "informe" ? " (informe final)" : t.etapa === "protocolo" ? " (protocolo)" : ""}`,
}));

// ─────────────────────────── Contenido ───────────────────────────

export interface ContenidoApartado {
  partes: Record<string, string>;
  /** Afirmaciones de la autoevaluación que el egresado marcó (por índice). */
  autoevaluacion: number[];
}

export const contenidoVacio = (): ContenidoApartado => ({ partes: {}, autoevaluacion: [] });

/** Lee la respuesta guardada; un texto plano (de antes o precargado) queda en el primer subapartado de texto. */
export function leerApartado(tipo: TipoApartado, contenido: string | null | undefined): ContenidoApartado {
  if (!contenido?.trim()) return contenidoVacio();
  try {
    const v = JSON.parse(contenido);
    if (v && typeof v === "object" && !Array.isArray(v) && v.partes && typeof v.partes === "object") {
      const partes: Record<string, string> = {};
      for (const [k, x] of Object.entries(v.partes)) if (typeof x === "string") partes[k] = x;
      return { partes, autoevaluacion: Array.isArray(v.autoevaluacion) ? v.autoevaluacion.filter((n: unknown) => Number.isInteger(n)) : [] };
    }
  } catch {
    // texto plano
  }
  const primera = tipo.partes.find((p) => p.formato === "texto" || p.formato === "lista") ?? tipo.partes[0];
  return { partes: { [primera.id]: contenido }, autoevaluacion: [] };
}

export const guardarComoTexto = (c: ContenidoApartado) => JSON.stringify({ v: 1, partes: c.partes, autoevaluacion: c.autoevaluacion });

export const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
export const lineas = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);

export function leerTabla(valor: string | undefined, columnas: number): string[][] {
  try {
    const v = JSON.parse(valor || "[]");
    if (!Array.isArray(v)) return [];
    return v.filter(Array.isArray).map((f: unknown[]) => Array.from({ length: columnas }, (_, i) => String(f[i] ?? "")));
  } catch {
    return [];
  }
}

/** Un subapartado sin contenido (una tabla sin filas con texto cuenta como vacía). */
export function parteVacia(p: ParteApartado, valor: string | undefined): boolean {
  const v = (valor ?? "").trim();
  if (!v) return true;
  if (p.formato === "citado") return !leerParrafos(v).some((x) => x.texto.trim());
  if (p.formato === "tabla") return !leerTabla(v, p.columnas?.length ?? 1).some((f) => f.some((x) => x.trim()));
  return false;
}

/** Texto de un subapartado: la etiqueta de la opción elegida, o la tabla en filas separadas por " · ". */
export function textoParte(tipo: TipoApartado, c: ContenidoApartado, parteId: string): string {
  const p = tipo.partes.find((x) => x.id === parteId);
  const v = c.partes[parteId]?.trim() ?? "";
  if (!p || parteVacia(p, v)) return "";
  if (p.formato === "seleccion") return p.opciones?.find((o) => o.valor === v)?.etiqueta ?? v;
  if (p.formato === "citado") return leerParrafos(v).filter((x) => x.texto.trim()).map((x) => parrafoConCita(x)).join("\n\n");
  if (p.formato === "tabla") return leerTabla(v, p.columnas?.length ?? 1).filter((f) => f.some(Boolean)).map((f) => f.join(" · ")).join("\n");
  return v;
}

/** Texto continuo del apartado (para exportar o precargar otros apartados), con el título de cada subapartado. */
export function textoApartado(tipo: TipoApartado, c: ContenidoApartado, conTitulos = true): string {
  return tipo.partes
    .map((p) => {
      const cuerpo = textoParte(tipo, c, p.id);
      if (!cuerpo) return "";
      return conTitulos && tipo.partes.length > 1 ? `${p.titulo}\n${cuerpo}` : cuerpo;
    })
    .filter(Boolean)
    .join("\n\n");
}

// ─────────────────────────── Revisiones ───────────────────────────

export type NivelRevision = "ok" | "aviso" | "falta";

export interface Revision {
  id: string;
  nivel: NivelRevision;
  mensaje: string;
  /** Subapartado al que se refiere (si aplica). */
  parte?: string;
}

export interface OpcionesRevision {
  citasMinimas: number;
  revisarPersona: boolean;
  /** Protocolo: futuro; informe final: pasado. */
  tiempo: "futuro" | "pasado" | "no";
}

export interface ContextoRevision {
  /** Referencias del registro de fuentes (ya en APA 7): cuentan para el mínimo de referencias. */
  fuentesReferencias?: string[];
  /** Entradas de las referencias del mismo documento (para cruzar las citas). */
  referencias?: string[];
  /** Objetivos específicos del trabajo (para las conclusiones). */
  objetivos?: string[];
  /** Cantidad de objetivos específicos del trabajo (H19/H27): de 3 a 4 por integrante, como la propuesta y el plan. */
  rangoObjetivos?: { min: number; max: number };
  /** Integrantes del trabajo (líder incluido): los elementos propios por integrante piden la parte de cada uno (C3). */
  integrantes?: { id: number; nombre: string }[];
}

/** El tipo «objetivos» con la cantidad de específicos del trabajo (la de la propuesta y el plan), si se conoce. */
export function conRangoObjetivos<T extends TipoApartado | undefined>(tipo: T, rango?: { min: number; max: number }): T {
  if (!tipo || !rango || !tipo.especiales.includes("objetivos")) return tipo;
  return { ...tipo, partes: tipo.partes.map((p) => (p.id === "especificos" ? { ...p, minItems: rango.min, maxItems: rango.max } : p)) };
}

const PRIMERA_PERSONA = /\b(yo|nosotros|nosotras|mi|mis|nuestro|nuestra|nuestros|nuestras|hemos|haremos|realizaremos|aplicaremos|investigaremos|analizaremos|creemos|considero|consideramos|pienso|pensamos)\b/gi;
// Con la bandera "u" y \p{L}: \b no reconoce las letras con tilde ("aplicó").
const FUTURO = /(?<!\p{L})se\s+\p{L}+(?:ará|erá|irá|arán|erán|irán)(?!\p{L})|(?<!\p{L})\p{L}+(?:ará|erá|irá)\s+(?:a|el|la|los|las|un|una)(?!\p{L})/giu;
const PASADO = /(?<!\p{L})se\s+\p{L}+(?:ó|aron|ieron)(?!\p{L})/giu;
/** Citas APA en el texto: (Apellido, 2020), (Apellido y Otro, 2020), (Apellido et al., 2020), Apellido (2020). */
const CITA_PARENTESIS = /\(([A-ZÁÉÍÓÚÑ][^()]{1,120}?),\s*(\d{4}[a-z]?|s\.\s?f\.)(?:,\s*p+\.\s*\d+(?:-\d+)?)?\)/g;
const APELLIDO = "[A-ZÁÉÍÓÚÑ][a-záéíóúñ'’]+(?:-[A-ZÁÉÍÓÚÑ]?[a-záéíóúñ'’]+)*";
const CITA_NARRATIVA = new RegExp(`(?<![\\wÁÉÍÓÚÑáéíóúñ-])(${APELLIDO}(?:\\s+(?:et al\\.|y\\s+${APELLIDO}))?)\\s+\\((\\d{4}[a-z]?|s\\.\\s?f\\.)\\)`, "g");
const VERBOS_NO_MEDIBLES = ["conocer", "comprender", "entender", "saber", "aprender", "apreciar", "creer", "pensar"];
const REFERENCIA_APA = /^[^().]{2,}?,\s*(?:[A-ZÁÉÍÓÚÑ]\.\s?)+.*?\((\d{4}[a-z]?|s\.\s?f\.)(?:,[^)]*)?\)\.\s+\S.+/;

/** Citas en el texto: el primer apellido y el año de cada una. */
export function citasEnTexto(texto: string): { autor: string; anio: string; texto: string }[] {
  const r: { autor: string; anio: string; texto: string }[] = [];
  for (const m of texto.matchAll(CITA_PARENTESIS)) {
    // (Autor, 2020; Otro, 2019): cada cita separada por punto y coma.
    for (const parte of m[0].slice(1, -1).split(";")) {
      const mm = parte.trim().match(/^([A-ZÁÉÍÓÚÑ][^,]*?),\s*(\d{4}[a-z]?|s\.\s?f\.)/);
      if (mm) r.push({ autor: mm[1].split(/\s+(?:y|&|et al\.)/)[0].trim(), anio: mm[2], texto: `(${parte.trim()})` });
    }
  }
  for (const m of texto.matchAll(CITA_NARRATIVA)) r.push({ autor: m[1].split(/\s+(?:y|et al\.)/)[0].trim(), anio: m[2], texto: m[0] });
  return r;
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Revisa la estructura básica de cada referencia APA 7 y el orden alfabético. */
export function revisarReferencias(entradas: string[], anioActual = new Date().getFullYear()): Revision[] {
  const r: Revision[] = [];
  const malas = entradas.filter((e) => !REFERENCIA_APA.test(e));
  if (malas.length) r.push({ id: "apa-formato", nivel: "aviso", mensaje: `${malas.length} referencia(s) no siguen la forma APA 7 (Apellido, A. (año). Título. Fuente): «${malas[0].slice(0, 60)}…»`, parte: "lista" });
  const ordenadas = [...entradas].sort((a, b) => sinTildes(a).localeCompare(sinTildes(b)));
  if (entradas.some((e, i) => e !== ordenadas[i])) r.push({ id: "apa-orden", nivel: "aviso", mensaje: "Las referencias no están en orden alfabético.", parte: "lista" });
  const vistas = new Set<string>();
  const repetidas = entradas.filter((e) => { const k = sinTildes(e).replace(/\s+/g, " "); if (vistas.has(k)) return true; vistas.add(k); return false; });
  if (repetidas.length) r.push({ id: "apa-duplicadas", nivel: "aviso", mensaje: `Hay ${repetidas.length} referencia(s) repetida(s).`, parte: "lista" });
  const antiguas = entradas.filter((e) => { const a = Number(e.match(/\((\d{4})/)?.[1]); return a && anioActual - a > 10; });
  if (antiguas.length) r.push({ id: "apa-antiguas", nivel: "aviso", mensaje: `${antiguas.length} referencia(s) tienen más de 10 años: úselas si son obras clásicas o fundamentales.`, parte: "lista" });
  if (entradas.length && !malas.length) r.push({ id: "apa-ok", nivel: "ok", mensaje: `${entradas.length} referencia(s) con la forma APA 7.` });
  return r;
}

/** Revisiones del apartado. "falta" impide enviar; "aviso" orienta; "ok" confirma lo que está bien. */
export function revisarApartado(tipoFicha: TipoApartado, c: ContenidoApartado, op: OpcionesRevision, ctx: ContextoRevision = {}): Revision[] {
  const tipo = conRangoObjetivos(tipoFicha, ctx.rangoObjetivos);
  const r: Revision[] = [];
  const textos: string[] = [];

  for (const p of tipo.partes) {
    const crudo = (c.partes[p.id] ?? "").trim();
    // Párrafos citados: se revisan como un texto continuo (con sus citas) y cada párrafo debe tener su fuente.
    const parrafos = p.formato === "citado" ? leerParrafos(crudo).filter((x) => x.texto.trim()) : [];
    const v = p.formato === "citado" ? parrafos.map((x) => parrafoConCita(x)).join("\n\n") : crudo;
    // Las referencias del registro de fuentes cuentan aunque la lista escrita a mano esté vacía.
    const delRegistro = p.formato === "referencias" ? (ctx.fuentesReferencias ?? []) : [];
    if (p.formato === "citado" && parrafos.length) {
      const sinFuente = parrafos.filter((x) => !x.fuentes.length).length;
      if (sinFuente && p.citaPorParrafo !== false) r.push({ id: `sin-fuente-${p.id}`, nivel: "falta", mensaje: `«${p.titulo}»: ${sinFuente} párrafo(s) sin fuente. Cada párrafo se sustenta en la literatura: elija al menos una fuente.`, parte: p.id });
    }
    if (parteVacia(p, crudo) && delRegistro.length === 0) {
      if (!p.opcional) r.push({ id: `vacio-${p.id}`, nivel: "falta", mensaje: `Falta «${p.titulo}».`, parte: p.id });
      continue;
    }
    if (p.formato === "texto" || p.formato === "pregunta" || p.formato === "citado") {
      textos.push(v);
      const n = palabras(v);
      if (p.min && n < p.min) r.push({ id: `min-${p.id}`, nivel: "falta", mensaje: `«${p.titulo}» tiene ${n} palabras; el mínimo es ${p.min}.`, parte: p.id });
      if (p.max && n > p.max) r.push({ id: `max-${p.id}`, nivel: "aviso", mensaje: `«${p.titulo}» tiene ${n} palabras; se recomiendan hasta ${p.max}.`, parte: p.id });
      const largas = v.split(/(?<=[.!?])\s+/).filter((o) => palabras(o) > 45).length;
      if (largas) r.push({ id: `largas-${p.id}`, nivel: "aviso", mensaje: `«${p.titulo}»: ${largas} oración(es) de más de 45 palabras; conviene dividirlas.`, parte: p.id });
    }
    if (p.formato === "pregunta" && !(v.includes("¿") && v.includes("?"))) {
      r.push({ id: "pregunta-signos", nivel: "aviso", mensaje: "La pregunta de investigación debe ir entre signos de interrogación (¿…?).", parte: p.id });
    }
    if (p.formato === "lista") textos.push(lineas(v).join(". "));
    // Elementos o filas dentro de los límites de la ficha (por ejemplo, de 1 a 10 variables o de 3 a 5 objetivos).
    if (p.formato === "lista" || p.formato === "tabla" || p.formato === "referencias") {
      const n = p.formato === "tabla" ? leerTabla(v, p.columnas?.length ?? 1).filter((f) => f.some((x) => x.trim())).length : lineas(v).length + delRegistro.length;
      const que = p.formato === "lista" ? "elemento(s)" : p.formato === "referencias" ? "referencia(s)" : "fila(s)";
      if (p.minItems && n < p.minItems) r.push({ id: `items-min-${p.id}`, nivel: "falta", mensaje: `«${p.titulo}» necesita al menos ${p.minItems} ${que}; hay ${n}.`, parte: p.id });
      else if (p.maxItems && n > p.maxItems) r.push({ id: `items-max-${p.id}`, nivel: "falta", mensaje: `«${p.titulo}» admite hasta ${p.maxItems} ${que}; hay ${n}.`, parte: p.id });
    }
  }

  const todo = textos.join("\n");
  if (op.revisarPersona && todo) {
    const encontradas = [...new Set((todo.match(PRIMERA_PERSONA) ?? []).map((x) => x.toLowerCase()))];
    if (encontradas.length) r.push({ id: "persona", nivel: "aviso", mensaje: `Redacte en tercera persona: aparecen «${encontradas.slice(0, 4).join("», «")}».` });
    else r.push({ id: "persona-ok", nivel: "ok", mensaje: "Redactado en tercera persona." });
  }
  if (op.tiempo === "futuro" && todo) {
    const pasados = todo.match(PASADO) ?? [];
    if (pasados.length >= 2) r.push({ id: "tiempo", nivel: "aviso", mensaje: `El protocolo se redacta en futuro: aparecen formas en pasado como «${pasados[0]}».` });
  }
  if (op.tiempo === "pasado" && todo) {
    const futuros = todo.match(FUTURO) ?? [];
    if (futuros.length >= 2) r.push({ id: "tiempo", nivel: "aviso", mensaje: `El informe final describe lo realizado, en pasado: aparecen formas en futuro como «${futuros[0]}».` });
  }

  // Citas APA y su cruce con las referencias.
  const citas = citasEnTexto(todo);
  if (op.citasMinimas > 0) {
    if (citas.length < op.citasMinimas) r.push({ id: "citas", nivel: "aviso", mensaje: `Se esperan al menos ${op.citasMinimas} citas en formato APA, por ejemplo (Apellido, 2020); hay ${citas.length}.` });
    else r.push({ id: "citas-ok", nivel: "ok", mensaje: `${citas.length} citas en formato APA.` });
  }
  if (citas.length && ctx.referencias) {
    const refs = ctx.referencias.map(sinTildes);
    const sinReferencia = [...new Set(citas.filter((x) => !refs.some((ref) => ref.startsWith(sinTildes(x.autor)) && (x.anio.startsWith("s") || ref.includes(x.anio)))).map((x) => x.texto))];
    const lista = `${sinReferencia.slice(0, 3).join("; ")}${sinReferencia.length > 3 ? "…" : ""}`;
    if (sinReferencia.length) {
      r.push({ id: "citas-referencias", nivel: "aviso", mensaje: ctx.referencias.length ? `Citas que no aparecen en Referencias: ${lista}.` : `Agregue estas fuentes en el apartado de Referencias: ${lista}.` });
    }
  }

  // Revisiones propias del tipo.
  if (tipo.especiales.includes("objetivos")) {
    const general = (c.partes.general ?? "").trim();
    const especificos = lineas(c.partes.especificos ?? "");
    const verbo = (t: string) => sinTildes(t.replace(/^[\d.)\-•\s]+/, "").split(/\s+/)[0] ?? "");
    const todos = [general, ...especificos].filter(Boolean);
    const noInfinitivo = todos.filter((t) => !/(ar|er|ir)$/.test(verbo(t)));
    if (noInfinitivo.length) r.push({ id: "obj-infinitivo", nivel: "aviso", mensaje: `${noInfinitivo.length} objetivo(s) no empiezan con un verbo en infinitivo: «${noInfinitivo[0].slice(0, 50)}».` });
    const noMedibles = todos.filter((t) => VERBOS_NO_MEDIBLES.includes(verbo(t)));
    if (noMedibles.length) r.push({ id: "obj-medibles", nivel: "aviso", mensaje: `Use verbos medibles en lugar de «${verbo(noMedibles[0])}» (por ejemplo: identificar, determinar, analizar, comparar).` });
    // La cantidad la revisan los límites del subapartado (minItems y maxItems: los del trabajo o de 3 a 4).
    const pe = tipo.partes.find((x) => x.id === "especificos");
    const enRango = (!pe?.minItems || especificos.length >= pe.minItems) && (!pe?.maxItems || especificos.length <= pe.maxItems);
    if (especificos.length && enRango && !noInfinitivo.length && !noMedibles.length) r.push({ id: "obj-ok", nivel: "ok", mensaje: `${especificos.length} objetivos específicos con verbos medibles en infinitivo.` });
  }
  if (tipo.especiales.includes("hipotesis")) {
    const ho = sinTildes(c.partes.ho ?? "");
    if (ho && !/\bno\b|\bningun|\bni\b/.test(ho)) r.push({ id: "ho-negacion", nivel: "aviso", mensaje: "La hipótesis nula suele ser la negación de la de investigación (no existe relación, no hay diferencia…).", parte: "ho" });
  }
  if (tipo.especiales.includes("referencias")) r.push(...revisarReferencias([...lineas(c.partes.lista ?? ""), ...(ctx.fuentesReferencias ?? [])]));
  if (tipo.especiales.includes("conclusiones") && ctx.objetivos?.length) {
    const parrafos = (c.partes.conclusiones ?? "").split(/\n\s*\n|\n/).map((x) => x.trim()).filter(Boolean);
    if (parrafos.length < ctx.objetivos.length) r.push({ id: "conclusiones-objetivos", nivel: "aviso", mensaje: `Hay ${ctx.objetivos.length} objetivos específicos y ${parrafos.length} párrafo(s) de conclusiones: escriba una conclusión por objetivo.`, parte: "conclusiones" });
    else r.push({ id: "conclusiones-ok", nivel: "ok", mensaje: "Una conclusión por objetivo específico." });
  }
  return r;
}

/** Subapartados completos (con contenido y sobre el mínimo) y total, para el avance. */
export function avanceApartado(tipo: TipoApartado, c: ContenidoApartado) {
  const obligatorias = tipo.partes.filter((p) => !p.opcional);
  const completas = obligatorias.filter((p) => {
    const v = (c.partes[p.id] ?? "").trim();
    if (parteVacia(p, v)) return false;
    if (p.formato === "citado") return !p.min || palabras(leerParrafos(v).map((x) => x.texto).join(" ")) >= p.min;
    return !(p.formato === "texto" || p.formato === "pregunta") || !p.min || palabras(v) >= p.min;
  }).length;
  return { completas, total: obligatorias.length };
}

// ─────────────────────────── Espacios de la ficha ───────────────────────────

/** "metodologia#tipo" → ["metodologia", "tipo"]: precarga desde un subapartado de un apartado académico. */
export const partePrecarga = (precargarDe: string): [string, string | undefined] => {
  const [id, parte] = precargarDe.split("#");
  return [id, parte || undefined];
};

/**
 * Subapartados de un espacio "apartado" tal como los configuró la ficha (ajustes al protocolo, 19-nov-2026), incluidos
 * los desactivados, en su orden: los del tipo con sus cambios y los propios. Los del tipo que la ficha no menciona (por
 * ejemplo, porque se agregaron al tipo después) van al final, activos. Es lo que muestra el constructor.
 */
export function partesConfiguradas(e: Pick<Espacio, "parametros" | "partes">): (ParteApartado & { activa: boolean })[] {
  const base = TIPOS_APARTADO[String(e.parametros.tipo)];
  if (!base) return [];
  const escala = (Number(e.parametros.extension) || 100) / 100;
  const ajustar = (n: number | undefined) => (n ? Math.max(1, Math.round(n * escala)) : n);
  const delTipo = new Map(base.partes.map((p) => [p.id, escala === 1 ? p : { ...p, min: ajustar(p.min), max: ajustar(p.max) }]));
  const usados = new Set<string>();
  const res: (ParteApartado & { activa: boolean })[] = [];
  for (const c of e.partes ?? []) {
    if (usados.has(c.id)) continue;
    const p = delTipo.get(c.id);
    if (!p && !c.propia) continue;
    usados.add(c.id);
    const origen: ParteApartado = p ?? { id: c.id, titulo: c.titulo || "Subapartado", ayuda: "", formato: c.propia!.formato, columnas: c.propia!.columnas, propia: true };
    res.push({
      ...origen,
      titulo: c.titulo?.trim() || origen.titulo,
      ayuda: c.ayuda?.trim() || origen.ayuda,
      opcional: c.opcional ?? origen.opcional,
      min: c.min ?? origen.min,
      max: c.max ?? origen.max,
      minItems: c.minItems ?? origen.minItems,
      maxItems: c.maxItems ?? origen.maxItems,
      citaPorParrafo: c.citaPorParrafo ?? origen.citaPorParrafo,
      activa: c.activa,
    });
  }
  for (const p of delTipo.values()) if (!usados.has(p.id)) res.push({ ...p, activa: true });
  return res;
}

/** Tipo de un espacio "apartado", con la extensión, las citas y los subapartados que configuró la ficha. */
export function tipoApartado(e: Pick<Espacio, "parametros" | "partes">): TipoApartado | undefined {
  const base = TIPOS_APARTADO[String(e.parametros.tipo)];
  if (!base) return undefined;
  const citas = Number(e.parametros.citasMinimas);
  return {
    ...base,
    citasMinimas: Number.isInteger(citas) && citas >= 0 ? citas : base.citasMinimas,
    partes: partesConfiguradas(e).filter((p) => p.activa).map((p) => { const copia: ParteApartado & { activa?: boolean } = { ...p }; delete copia.activa; return copia; }),
  };
}

/** Configuración inicial de los subapartados para el constructor: los del tipo, todos activos y sin cambios. */
export const configInicial = (tipo: string): ConfigParte[] => (TIPOS_APARTADO[tipo]?.partes ?? []).map((p) => ({ id: p.id, activa: true }));

/**
 * Puntos de partida de la metodología según el enfoque (ajustes al protocolo, punto 7). Usan los subapartados del tipo
 * (con otro título si hace falta) más los propios de cada enfoque; después se ajustan en el constructor.
 */
export const ENFOQUES_METODOLOGIA = [
  { valor: "cuantitativa", etiqueta: "Cuantitativa" },
  { valor: "cualitativa", etiqueta: "Cualitativa" },
  { valor: "mixta", etiqueta: "Mixta" },
] as const;

export function configMetodologia(enfoque: (typeof ENFOQUES_METODOLOGIA)[number]["valor"]): ConfigParte[] {
  if (enfoque === "cualitativa") {
    return [
      { id: "tipo", activa: true, titulo: "Enfoque y diseño", ayuda: "Diseño cualitativo (fenomenológico, etnográfico, estudio de caso, teoría fundamentada…) y por qué responde a los objetivos." },
      { id: "poblacion", activa: true, titulo: "Participantes y criterios de selección", ayuda: "Quiénes participan, cuántos y con qué criterios se eligen (muestreo intencional, bola de nieve, saturación)." },
      { id: "tecnicas", activa: true, titulo: "Técnicas e instrumentos", ayuda: "Entrevista, grupo focal, observación o análisis documental, y el instrumento de cada una (guía, ficha)." },
      { id: "x_categorias", activa: true, titulo: "Categorías de análisis", ayuda: "Categorías y subcategorías que orientan la recolección y el análisis.", propia: { formato: "tabla", columnas: ["Categoría", "Subcategorías", "Preguntas o temas"] }, minItems: 1, maxItems: 10 },
      { id: "procedimiento", activa: true },
      { id: "analisis", activa: true, titulo: "Análisis de la información", ayuda: "Cómo se codifica y analiza la información (análisis de contenido, triangulación, software)." },
    ];
  }
  if (enfoque === "mixta") {
    return [
      { id: "tipo", activa: true, titulo: "Enfoque, alcance y diseño", ayuda: "Diseño mixto (secuencial o concurrente) y el peso de cada enfoque." },
      { id: "poblacion", activa: true, titulo: "Población, muestra y participantes", ayuda: "Muestra de la parte cuantitativa y participantes de la parte cualitativa, con sus criterios." },
      { id: "tecnicas", activa: true },
      { id: "procedimiento", activa: true },
      { id: "analisis", activa: true, titulo: "Análisis de los datos", ayuda: "Análisis estadístico de los datos cuantitativos y análisis de contenido de los cualitativos." },
      { id: "x_integracion", activa: true, titulo: "Integración de los datos", ayuda: "Cómo se combinan los resultados de ambos enfoques para responder a la pregunta.", propia: { formato: "texto" }, min: 30, max: 250 },
    ];
  }
  return [
    { id: "tipo", activa: true, titulo: "Enfoque, alcance y diseño" },
    { id: "poblacion", activa: true },
    { id: "tecnicas", activa: true },
    { id: "procedimiento", activa: true },
    { id: "analisis", activa: true, titulo: "Análisis estadístico" },
  ];
}

/** Opciones de revisión de un espacio según su etapa (protocolo en futuro, informe final en pasado). */
export function opcionesDeEspacio(e: Pick<Espacio, "parametros">, etapa: "protocolo" | "informe_final" | string): OpcionesRevision {
  const tipo = tipoApartado(e);
  const t = String(e.parametros.tiempo ?? "etapa");
  return {
    citasMinimas: tipo?.citasMinimas ?? 0,
    revisarPersona: e.parametros.revisarPersona !== false,
    tiempo: t === "futuro" || t === "pasado" || t === "no" ? t : etapa === "informe_final" ? "pasado" : "futuro",
  };
}

/**
 * Referencias y objetivos específicos de un documento (protocolo o informe), para cruzar citas y revisar conclusiones.
 * Con "fuentesReferencias", las referencias del registro de fuentes también cuentan.
 */
export function contextoDeRevision(espacios: Espacio[], respuestas: Record<string, string | null | undefined>, fuentesReferencias?: string[]): ContextoRevision {
  const ctx: ContextoRevision = fuentesReferencias?.length ? { fuentesReferencias, referencias: [...fuentesReferencias] } : {};
  for (const e of espacios) {
    if (e.elemento === "lista" && /bibliograf|referenc/i.test(e.titulo)) {
      try {
        const v = JSON.parse(respuestas[e.id] || "[]");
        if (Array.isArray(v)) ctx.referencias = [...(ctx.referencias ?? []), ...v.filter((x): x is string => typeof x === "string")];
      } catch {
        // sin referencias
      }
    }
    if (e.elemento !== "apartado") continue;
    const tipo = tipoApartado(e);
    if (!tipo) continue;
    const c = leerApartado(tipo, respuestas[e.id]);
    if (tipo.especiales.includes("referencias")) ctx.referencias = [...(ctx.referencias ?? []), ...lineas(c.partes.lista ?? "")];
    if (tipo.especiales.includes("objetivos")) ctx.objetivos = lineas(c.partes.especificos ?? "");
  }
  return ctx;
}
