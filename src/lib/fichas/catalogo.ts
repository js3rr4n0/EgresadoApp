// Catálogo de elementos con los que se arman las etapas con espacios de una ficha (propuesta, protocolo e informe final).
// Reúne todos los elementos usados en las fichas de pasantía, proyecto e investigación, y cualquiera se puede elegir en
// cualquier ficha (revisión del 13-nov-2026). "formularioEn" solo informa en qué asistentes ya tiene formulario.
// Los valores por defecto de los parámetros reproducen el comportamiento actual. Módulo puro.
import type { ClaveElemento, Modalidad, ValorParametro } from "./tipos";
import { TIPOS_ARCHIVO } from "./elementosRecurso";
import { CATEGORIAS_RECURSO } from "./recursos";
import { TIPOS_APARTADO_OPCIONES } from "./apartadosAcademicos";

export type DefinicionParametro =
  | { clave: string; etiqueta: string; tipo: "numero"; porDefecto: number; min: number; max: number; ayuda?: string; sufijo?: string }
  | { clave: string; etiqueta: string; tipo: "booleano"; porDefecto: boolean; ayuda?: string; soloEquipo?: boolean }
  | { clave: string; etiqueta: string; tipo: "opciones"; porDefecto: string[]; opciones: { valor: string; etiqueta: string }[]; minimo: number; ayuda?: string }
  /** Una sola opción de la lista (por ejemplo, el tipo de apartado académico). */
  | { clave: string; etiqueta: string; tipo: "opcion"; porDefecto: string; opciones: { valor: string; etiqueta: string }[]; ayuda?: string }
  /** Lista de textos que escribe el administrador (por ejemplo, las columnas de una tabla). */
  | { clave: string; etiqueta: string; tipo: "textos"; porDefecto: string[]; minimo: number; maximo: number; ayuda?: string };

/** Etapas que se arman con espacios del catálogo. */
export type EtapaDeEspacios = "propuesta" | "protocolo" | "informe_final";

/** Secciones del catálogo, en el orden en que se muestran. */
export const GRUPOS_CATALOGO = [
  { grupo: "Datos generales", descripcion: "Identifican el trabajo y a quienes lo realizan." },
  { grupo: "Institución", descripcion: "Dónde se realiza el trabajo y quién lo respalda." },
  { grupo: "Planteamiento", descripcion: "Quiénes intervienen y qué se busca lograr." },
  { grupo: "Planificación", descripcion: "Actividades distribuidas en el tiempo." },
  { grupo: "Contenido", descripcion: "Texto y datos que redacta el egresado." },
  { grupo: "Recursos y evidencias", descripcion: "Imágenes, archivos y enlaces de apoyo." },
  { grupo: "Apartados académicos", descripcion: "Partes de un protocolo o informe que se redactan por subapartados, con guía y revisión de redacción y citas." },
] as const;
export type GrupoCatalogo = (typeof GRUPOS_CATALOGO)[number]["grupo"];

export interface ElementoCatalogo {
  clave: ClaveElemento;
  nombre: string;
  grupo: GrupoCatalogo;
  descripcion: string;
  /**
   * Asistentes que ya tienen formulario para este elemento. Es informativo: el elemento se puede usar en cualquier ficha.
   * El asistente de pasantía todavía es el de la fase 1 (sus 7 pasos fijos); proyecto e investigación siguen la ficha.
   */
  formularioEn: Modalidad[];
  /** Puede aparecer más de una vez en la misma etapa (por ejemplo, varios bloques de texto). */
  repetible: boolean;
  /** "equipo": una respuesta por propuesta; "integrante": una por cada integrante. */
  alcance: "equipo" | "integrante";
  /** Elementos que deben estar antes en la misma etapa. */
  requiere: ClaveElemento[];
  /** Etapas en las que puede usarse; si falta, en todas las que se arman con espacios. */
  etapas?: EtapaDeEspacios[];
  parametros: DefinicionParametro[];
}

/** Texto provisional de la hoja de derechos de autoría (Q8): se reemplaza por el oficial cuando la universidad lo dé. */
export const DERECHOS_PROVISIONALES = [
  "Texto provisional: la Universidad Católica de El Salvador proporcionará el texto oficial de los derechos de autoría de los trabajos de graduación.",
  "Los autores declaran que el contenido de esta investigación es original y que las fuentes consultadas se citan y se referencian conforme a las normas APA 7.",
];

export const DOCUMENTOS_ESTUDIANTE = [
  { valor: "pago_tg", etiqueta: "Hoja de inscripción del trabajo de graduación" },
  { valor: "servicio_social", etiqueta: "Constancia de servicio social" },
  { valor: "certificacion_notas", etiqueta: "Hoja de notas" },
];

export const ACTORES = [
  { valor: "patrocinador", etiqueta: "Patrocinador" },
  { valor: "beneficiario", etiqueta: "Beneficiario" },
  { valor: "ejecutor", etiqueta: "Ejecutor" },
  { valor: "financista", etiqueta: "Financista" },
];

export const CATALOGO: Record<ClaveElemento, ElementoCatalogo> = {
  portada: {
    clave: "portada",
    nombre: "Portada",
    grupo: "Datos generales",
    descripcion: "Título del trabajo y datos del egresado. Con equipo, incluye invitar y aceptar integrantes.",
    formularioEn: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [],
  },
  empresa: {
    clave: "empresa",
    nombre: "Datos empresariales",
    grupo: "Institución",
    descripcion: "Empresa o sucursal del catálogo. Si no existe o sus datos cambian, se solicita su registro.",
    formularioEn: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [
      { clave: "aprobarEmpresaNueva", etiqueta: "Una empresa nueva o con datos modificados requiere aprobación", tipo: "booleano", porDefecto: true },
    ],
  },
  supervisor: {
    clave: "supervisor",
    nombre: "Datos del supervisor",
    grupo: "Institución",
    descripcion: "Supervisor de la empresa que acompaña el proceso.",
    formularioEn: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: ["empresa"],
    etapas: ["propuesta"],
    parametros: [
      { clave: "revisarSupervisorNuevo", etiqueta: "Un supervisor nuevo requiere revisión administrativa", tipo: "booleano", porDefecto: true },
    ],
  },
  carta: {
    clave: "carta",
    nombre: "Carta de aceptación",
    grupo: "Institución",
    descripcion: "Carta de la institución con fechas de emisión, inicio y fin.",
    formularioEn: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [
      { clave: "diasAnticipacion", etiqueta: "Días mínimos entre la emisión y el inicio", tipo: "numero", porDefecto: 21, min: 0, max: 120, sufijo: "días" },
      { clave: "duracionDias", etiqueta: "Duración entre el inicio y el fin", tipo: "numero", porDefecto: 150, min: 1, max: 730, sufijo: "días", ayuda: "Si la ficha tiene etapa de ejecución, debe coincidir con su duración total." },
    ],
  },
  cronograma: {
    clave: "cronograma",
    nombre: "Cronograma de pasantía",
    grupo: "Planificación",
    descripcion: "Actividades por período y subperíodo. Su forma sale de la primera etapa de ejecución. El cronograma de proyecto y el de investigación son el plan de trabajo (pestaña Plan).",
    formularioEn: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: ["carta"],
    etapas: ["propuesta"],
    parametros: [
      { clave: "minActividadesPeriodo", etiqueta: "Actividades mínimas por período", tipo: "numero", porDefecto: 4, min: 1, max: 20 },
      { clave: "minActividadesSubperiodo", etiqueta: "Actividades mínimas por subperíodo", tipo: "numero", porDefecto: 1, min: 0, max: 10 },
      { clave: "responsablePorActividad", etiqueta: "Cada actividad tiene un integrante responsable", tipo: "booleano", porDefecto: false, soloEquipo: true },
    ],
  },
  texto: {
    clave: "texto",
    nombre: "Bloque de texto",
    grupo: "Contenido",
    descripcion: "Texto con título, ayuda y límites. Sirve para la justificación, el problema, el alcance y similares.",
    formularioEn: ["pasantia", "proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "minPalabras", etiqueta: "Palabras mínimas", tipo: "numero", porDefecto: 0, min: 0, max: 5000, ayuda: "0 = sin mínimo" },
      { clave: "maxPalabras", etiqueta: "Palabras máximas", tipo: "numero", porDefecto: 0, min: 0, max: 5000, ayuda: "0 = sin máximo" },
    ],
  },
  actores: {
    clave: "actores",
    nombre: "Actores intervinientes",
    grupo: "Planteamiento",
    descripcion: "Patrocinador, beneficiario, ejecutor y financista.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [
      { clave: "actores", etiqueta: "Actores que se piden", tipo: "opciones", porDefecto: ACTORES.map((a) => a.valor), opciones: ACTORES, minimo: 1 },
    ],
  },
  objetivos: {
    clave: "objetivos",
    nombre: "Objetivos",
    grupo: "Planteamiento",
    descripcion: "Objetivo general y objetivos específicos.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [
      // H19/H27: por integrante; el total de un equipo se multiplica por sus integrantes. Rige también el protocolo y el plan.
      { clave: "minEspecificos", etiqueta: "Objetivos específicos mínimos por integrante", tipo: "numero", porDefecto: 3, min: 1, max: 10, ayuda: "Rige la propuesta, el protocolo y el plan de trabajo. En equipo se multiplica por los integrantes." },
      { clave: "maxEspecificos", etiqueta: "Objetivos específicos máximos por integrante", tipo: "numero", porDefecto: 4, min: 1, max: 10 },
    ],
  },
  documentos: {
    clave: "documentos",
    nombre: "Documentación de soporte",
    grupo: "Datos generales",
    descripcion: "Documentos obligatorios que sube cada egresado.",
    formularioEn: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "integrante",
    requiere: [],
    etapas: ["propuesta"],
    parametros: [
      { clave: "documentos", etiqueta: "Documentos que se piden", tipo: "opciones", porDefecto: DOCUMENTOS_ESTUDIANTE.map((d) => d.valor), opciones: DOCUMENTOS_ESTUDIANTE, minimo: 0 },
    ],
  },
  // Recursos (reunión 6-nov-2026, catálogo ampliado, parte 1). Por ahora el asistente que lee la ficha es el de proyecto.
  imagen: {
    clave: "imagen",
    nombre: "Imagen",
    grupo: "Recursos y evidencias",
    descripcion: "Una o varias imágenes con su pie y su origen; por ejemplo, un código QR, un diagrama o una captura.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "minimo", etiqueta: "Imágenes mínimas", tipo: "numero", porDefecto: 1, min: 0, max: 10 },
      { clave: "maximo", etiqueta: "Imágenes máximas", tipo: "numero", porDefecto: 1, min: 1, max: 10 },
      { clave: "pedirOrigen", etiqueta: "Pedir el origen de la imagen (autoría propia o fuente citada)", tipo: "booleano", porDefecto: true },
    ],
  },
  archivo: {
    clave: "archivo",
    nombre: "Archivo adjunto",
    grupo: "Recursos y evidencias",
    descripcion: "Uno o varios archivos: un manual, un acta, una hoja de cálculo u otro documento de apoyo.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "tipos", etiqueta: "Formatos permitidos", tipo: "opciones", porDefecto: ["pdf"], opciones: TIPOS_ARCHIVO.map(({ valor, etiqueta }) => ({ valor, etiqueta })), minimo: 1 },
      { clave: "minimo", etiqueta: "Archivos mínimos", tipo: "numero", porDefecto: 1, min: 0, max: 10 },
      { clave: "maximo", etiqueta: "Archivos máximos", tipo: "numero", porDefecto: 1, min: 1, max: 10 },
      { clave: "maxMB", etiqueta: "Tamaño máximo por archivo", tipo: "numero", porDefecto: 5, min: 1, max: 10, sufijo: "MB" },
    ],
  },
  enlace: {
    clave: "enlace",
    nombre: "Enlace",
    grupo: "Recursos y evidencias",
    descripcion: "Direcciones a recursos en línea con su descripción: un video, un repositorio, un sitio publicado o un proceso.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "minimo", etiqueta: "Enlaces mínimos", tipo: "numero", porDefecto: 1, min: 0, max: 20 },
      { clave: "maximo", etiqueta: "Enlaces máximos", tipo: "numero", porDefecto: 3, min: 1, max: 20 },
    ],
  },
  lista: {
    clave: "lista",
    nombre: "Lista de elementos",
    grupo: "Contenido",
    descripcion: "Una lista de elementos cortos: requisitos, entregables, herramientas, beneficiarios, etc.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "minimo", etiqueta: "Elementos mínimos", tipo: "numero", porDefecto: 3, min: 0, max: 50 },
      { clave: "maximo", etiqueta: "Elementos máximos", tipo: "numero", porDefecto: 10, min: 1, max: 50 },
      { clave: "maxPalabrasElemento", etiqueta: "Palabras máximas por elemento", tipo: "numero", porDefecto: 0, min: 0, max: 200, ayuda: "0 = sin máximo" },
    ],
  },
  // Tabla (catálogo ampliado, parte 2): en el protocolo y el informe final, por ejemplo para la matriz de hipótesis o la
  // definición de variables. Todas las columnas son de texto.
  tabla: {
    clave: "tabla",
    nombre: "Tabla",
    grupo: "Contenido",
    descripcion: "Filas con las columnas que define el administrador; por ejemplo, la matriz de hipótesis o una operacionalización de variables.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    etapas: ["protocolo", "informe_final"],
    parametros: [
      { clave: "columnas", etiqueta: "Columnas", tipo: "textos", porDefecto: ["Hipótesis", "Variables", "Indicadores"], minimo: 1, maximo: 8, ayuda: "Encabezados de la tabla, en orden." },
      { clave: "minimo", etiqueta: "Filas mínimas", tipo: "numero", porDefecto: 1, min: 0, max: 50 },
      { clave: "maximo", etiqueta: "Filas máximas", tipo: "numero", porDefecto: 10, min: 1, max: 50 },
    ],
  },
  // Apartado académico (redacción académica guiada, 13-nov-2026; specs/fichas/REDACCION_ACADEMICA.md).
  apartado: {
    clave: "apartado",
    nombre: "Apartado académico",
    grupo: "Apartados académicos",
    descripcion: "Una parte del protocolo o del informe (problemática, objetivos, hipótesis, variables, metodología, referencias…) que se redacta por subapartados, con guía, autoevaluación y revisiones de redacción y de citas APA 7.",
    formularioEn: ["investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    etapas: ["protocolo", "informe_final"],
    parametros: [
      { clave: "tipo", etiqueta: "Tipo de apartado", tipo: "opcion", porDefecto: "problematica", opciones: TIPOS_APARTADO_OPCIONES, ayuda: "Define los subapartados, la guía y las revisiones." },
      { clave: "extension", etiqueta: "Extensión respecto de la recomendada", tipo: "numero", porDefecto: 100, min: 25, max: 300, sufijo: "%", ayuda: "Escala los mínimos y máximos de palabras." },
      { clave: "citasMinimas", etiqueta: "Citas APA mínimas", tipo: "numero", porDefecto: -1, min: -1, max: 50, ayuda: "-1 = las del tipo" },
      {
        clave: "tiempo", etiqueta: "Tiempo verbal que se revisa", tipo: "opcion", porDefecto: "etapa",
        opciones: [
          { valor: "etapa", etiqueta: "Según la etapa (protocolo: futuro; informe: pasado)" },
          { valor: "futuro", etiqueta: "Futuro" },
          { valor: "pasado", etiqueta: "Pasado" },
          { valor: "no", etiqueta: "No revisar" },
        ],
      },
      { clave: "revisarPersona", etiqueta: "Revisar que esté redactado en tercera persona", tipo: "booleano", porDefecto: true },
      { clave: "autoevaluacion", etiqueta: "Mostrar la autoevaluación al egresado (el asesor ve lo que marcó)", tipo: "booleano", porDefecto: true },
    ],
  },
  // Notas del 13-nov-2026: los resultados del informe final se generan solos, ordenados por objetivo.
  resultados_objetivos: {
    clave: "resultados_objetivos",
    nombre: "Resultados por objetivo",
    grupo: "Apartados académicos",
    descripcion: "Capítulo del informe final que genera el sistema: objetivo general, cada objetivo específico con sus productos y cada macroactividad con sus actividades (fechas, resultado y evidencias), con el índice del plan. Las evidencias y los productos pasan a los anexos en ese orden. El equipo no lo redacta ni el asesor lo revisa aparte: ya revisó cada actividad y cada objetivo. Con el cronograma de investigación va por objetivo y por su proceso: metodología utilizada, desarrollo realizado, resultados obtenidos, conclusiones preliminares y elementos de discusión.",
    formularioEn: ["investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  // Ajustes al protocolo (19-nov-2026): recursos por categoría y presupuesto calculado.
  recursos_presupuesto: {
    clave: "recursos_presupuesto",
    nombre: "Recursos y presupuesto",
    grupo: "Planificación",
    descripcion: "Recursos necesarios para la investigación, por categoría (económicos, técnicos o de infraestructura, inmateriales, materiales o consumibles, operacionales y tiempo del investigador), con su cantidad y costo. El presupuesto se calcula solo: un total por categoría y el total general.",
    formularioEn: ["investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["protocolo"],
    parametros: [
      { clave: "conCostos", etiqueta: "Pedir cantidad y costo de cada recurso (presupuesto)", tipo: "booleano", porDefecto: true },
      { clave: "moneda", etiqueta: "Moneda", tipo: "opcion", porDefecto: "USD", opciones: [{ valor: "USD", etiqueta: "Dólares (USD)" }] },
      { clave: "categorias", etiqueta: "Categorías que se piden", tipo: "opciones", porDefecto: CATEGORIAS_RECURSO.map((c) => c.valor), opciones: CATEGORIAS_RECURSO.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta })), minimo: 1 },
      { clave: "minimo", etiqueta: "Recursos mínimos", tipo: "numero", porDefecto: 3, min: 0, max: 50 },
    ],
  },
  // Notas del 13-nov-2026: la bitácora de la ejecución como anexo del informe final.
  reporte_modificaciones: {
    clave: "reporte_modificaciones",
    nombre: "Reporte de modificaciones",
    grupo: "Apartados académicos",
    descripcion: "Anexo del informe final que genera el sistema con la bitácora de la ejecución: los cambios de tiempo, recursos y costos o alcance, y otros acontecimientos que el equipo reportó en sus actividades y objetivos, en orden y con el índice del plan. Necesita que la ejecución pida la bitácora.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  // Informe final de investigación (notas del 20-nov-2026, entrega F3): citas y referencias separadas de la bibliografía.
  referencias_citadas: {
    clave: "referencias_citadas",
    nombre: "Citas y referencias",
    grupo: "Apartados académicos",
    descripcion: "Capítulo que genera el sistema con las fuentes citadas dentro del informe (del registro de fuentes y de la bibliografía escrita a mano), en APA 7 y en orden alfabético. Las fuentes que no se citaron quedan en la bibliografía.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  // Informe final (notas del 20-nov-2026, entrega F4): anexos obligatorios y la hoja de derechos de autoría.
  anexo_involucrados: {
    clave: "anexo_involucrados",
    nombre: "Anexo de involucrados",
    grupo: "Apartados académicos",
    descripcion: "Anexo que genera el sistema con las personas y entidades involucradas: las de la sección «Involucrados» de la propuesta (quién solicita o patrocina y las demás), el equipo y el asesor.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  anexo_recursos: {
    clave: "anexo_recursos",
    nombre: "Anexo de recursos",
    grupo: "Apartados académicos",
    descripcion: "Anexo que genera el sistema con los recursos y el presupuesto del protocolo y los cambios de recursos y costos reportados en la bitácora. Necesita los recursos en el protocolo.",
    formularioEn: ["investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  // Informe final de proyecto (notas del 20-nov-2026): el cronograma como capítulo propio, después del desarrollo.
  cronograma_comparado: {
    clave: "cronograma_comparado",
    nombre: "Cronograma original y ejecutado",
    grupo: "Apartados académicos",
    descripcion: "Capítulo que genera el sistema con el cronograma del plan de trabajo (lo planificado) y lo que se ejecutó en cada período. Si está en el informe, el desarrollo por objetivo ya no lo incluye al final.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [],
  },
  derechos_autoria: {
    clave: "derechos_autoria",
    nombre: "Derechos de autoría",
    grupo: "Apartados académicos",
    descripcion: "Hoja fija del documento final. Mientras la universidad da el texto oficial, lleva uno provisional que se edita aquí.",
    formularioEn: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    etapas: ["informe_final"],
    parametros: [
      { clave: "parrafos", etiqueta: "Texto de la hoja (un párrafo por línea)", tipo: "textos", porDefecto: DERECHOS_PROVISIONALES, minimo: 1, maximo: 10, ayuda: "Reemplácelo por el texto oficial cuando la universidad lo dé." },
    ],
  },
  // Catálogo editable (C2): los elementos propios que crea el administrador. No se agrega desde esta lista: cada espacio
  // guarda la copia de un elemento propio publicado (elementosPropios.ts), con sus campos, etapas y si se repite.
  propio: {
    clave: "propio",
    nombre: "Elemento propio",
    grupo: "Contenido",
    descripcion: "Formulario armado en el catálogo con campos de tipos conocidos. La ficha guarda una copia: editarlo en el catálogo no la cambia.",
    // C3: formulario general en la propuesta, el protocolo y el informe final (el asistente de pasantía sigue siendo el de la fase 1).
    formularioEn: ["proyecto", "investigacion"],
    repetible: true,
    alcance: "equipo",
    requiere: [],
    parametros: [],
  },
};

/** Elementos del sistema (los de esta lista menos el genérico de los elementos propios). */
export const ELEMENTOS_SISTEMA = Object.values(CATALOGO).filter((e) => e.clave !== "propio");

/** El elemento puede usarse en esa etapa (propuesta o protocolo). */
export const elementoEnEtapa = (clave: ClaveElemento, etapa: EtapaDeEspacios) => (CATALOGO[clave].etapas ?? ["propuesta", "protocolo", "informe_final"]).includes(etapa);

/** Parámetros de un elemento con sus valores por defecto, opcionalmente sobrescritos. */
export function parametrosPorDefecto(
  clave: ClaveElemento,
  valores: Record<string, ValorParametro> = {}
): Record<string, ValorParametro> {
  const base = Object.fromEntries(
    CATALOGO[clave].parametros.map((p) => [p.clave, Array.isArray(p.porDefecto) ? [...p.porDefecto] : p.porDefecto])
  );
  return { ...base, ...valores };
}
