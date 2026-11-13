// Catálogo de elementos con los que se arman las etapas con espacios de una ficha (propuesta, protocolo e informe final).
// Reúne todos los elementos usados en las fichas de pasantía, proyecto e investigación, y cualquiera se puede elegir en
// cualquier ficha (revisión del 13-nov-2026). "formularioEn" solo informa en qué asistentes ya tiene formulario.
// Los valores por defecto de los parámetros reproducen el comportamiento actual. Módulo puro.
import type { ClaveElemento, Modalidad, ValorParametro } from "./tipos";
import { TIPOS_ARCHIVO } from "./elementosRecurso";
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

export const DOCUMENTOS_ESTUDIANTE = [
  { valor: "pago_tg", etiqueta: "Comprobante de pago del trabajo de graduación" },
  { valor: "certificacion_notas", etiqueta: "Certificación de notas" },
  { valor: "servicio_social", etiqueta: "Constancia de servicio social" },
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
    nombre: "Cronograma de actividades",
    grupo: "Planificación",
    descripcion: "Actividades por período y subperíodo. Su forma sale de la primera etapa de ejecución.",
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
      { clave: "minEspecificos", etiqueta: "Objetivos específicos mínimos", tipo: "numero", porDefecto: 4, min: 1, max: 20 },
      { clave: "maxEspecificos", etiqueta: "Objetivos específicos máximos", tipo: "numero", porDefecto: 6, min: 1, max: 20 },
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
};

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
