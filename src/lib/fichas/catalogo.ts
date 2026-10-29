// Catálogo de elementos con los que se arma la etapa de propuesta de una ficha.
// Sale del inventario del código de la fase 1 (specs/fichas): cada elemento corresponde a un paso que ya existe.
// Los valores por defecto de los parámetros reproducen el comportamiento actual. Módulo puro.
import type { ClaveElemento, Modalidad, ValorParametro } from "./tipos";

export type DefinicionParametro =
  | { clave: string; etiqueta: string; tipo: "numero"; porDefecto: number; min: number; max: number; ayuda?: string; sufijo?: string }
  | { clave: string; etiqueta: string; tipo: "booleano"; porDefecto: boolean; ayuda?: string; soloEquipo?: boolean }
  | { clave: string; etiqueta: string; tipo: "opciones"; porDefecto: string[]; opciones: { valor: string; etiqueta: string }[]; minimo: number; ayuda?: string };

export interface ElementoCatalogo {
  clave: ClaveElemento;
  nombre: string;
  grupo: "Generales" | "Institución" | "Planificación" | "Proyecto" | "Documentos";
  descripcion: string;
  /** Modalidades en las que la fase 1 ya sabe guardar y mostrar este elemento. */
  modalidades: Modalidad[];
  /** Puede aparecer más de una vez en la misma etapa (por ejemplo, varios bloques de texto). */
  repetible: boolean;
  /** "equipo": una respuesta por propuesta; "integrante": una por cada integrante. */
  alcance: "equipo" | "integrante";
  /** Elementos que deben estar antes en la misma etapa. */
  requiere: ClaveElemento[];
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
    grupo: "Generales",
    descripcion: "Título del trabajo y datos del egresado. Con equipo, incluye invitar y aceptar integrantes.",
    modalidades: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    parametros: [],
  },
  empresa: {
    clave: "empresa",
    nombre: "Datos empresariales",
    grupo: "Institución",
    descripcion: "Empresa o sucursal del catálogo. Si no existe o sus datos cambian, se solicita su registro.",
    modalidades: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "aprobarEmpresaNueva", etiqueta: "Una empresa nueva o con datos modificados requiere aprobación", tipo: "booleano", porDefecto: true },
    ],
  },
  supervisor: {
    clave: "supervisor",
    nombre: "Datos del supervisor",
    grupo: "Institución",
    descripcion: "Supervisor de la empresa que acompaña el proceso.",
    modalidades: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: ["empresa"],
    parametros: [
      { clave: "revisarSupervisorNuevo", etiqueta: "Un supervisor nuevo requiere revisión administrativa", tipo: "booleano", porDefecto: true },
    ],
  },
  carta: {
    clave: "carta",
    nombre: "Carta de aceptación",
    grupo: "Institución",
    descripcion: "Carta de la institución con fechas de emisión, inicio y fin.",
    modalidades: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
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
    modalidades: ["pasantia"],
    repetible: false,
    alcance: "equipo",
    requiere: ["carta"],
    parametros: [
      { clave: "minActividadesPeriodo", etiqueta: "Actividades mínimas por período", tipo: "numero", porDefecto: 4, min: 1, max: 20 },
      { clave: "minActividadesSubperiodo", etiqueta: "Actividades mínimas por subperíodo", tipo: "numero", porDefecto: 1, min: 0, max: 10 },
      { clave: "responsablePorActividad", etiqueta: "Cada actividad tiene un integrante responsable", tipo: "booleano", porDefecto: false, soloEquipo: true },
    ],
  },
  texto: {
    clave: "texto",
    nombre: "Bloque de texto",
    grupo: "Generales",
    descripcion: "Texto con título, ayuda y límites. Sirve para la justificación, el problema, el alcance y similares.",
    modalidades: ["pasantia", "proyecto", "investigacion"],
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
    grupo: "Proyecto",
    descripcion: "Patrocinador, beneficiario, ejecutor y financista.",
    modalidades: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "actores", etiqueta: "Actores que se piden", tipo: "opciones", porDefecto: ACTORES.map((a) => a.valor), opciones: ACTORES, minimo: 1 },
    ],
  },
  objetivos: {
    clave: "objetivos",
    nombre: "Objetivos",
    grupo: "Proyecto",
    descripcion: "Objetivo general y objetivos específicos.",
    modalidades: ["proyecto", "investigacion"],
    repetible: false,
    alcance: "equipo",
    requiere: [],
    parametros: [
      { clave: "minEspecificos", etiqueta: "Objetivos específicos mínimos", tipo: "numero", porDefecto: 4, min: 1, max: 20 },
      { clave: "maxEspecificos", etiqueta: "Objetivos específicos máximos", tipo: "numero", porDefecto: 6, min: 1, max: 20 },
    ],
  },
  documentos: {
    clave: "documentos",
    nombre: "Documentación de soporte",
    grupo: "Documentos",
    descripcion: "Documentos obligatorios que sube cada egresado.",
    modalidades: ["pasantia", "proyecto", "investigacion"],
    repetible: false,
    alcance: "integrante",
    requiere: [],
    parametros: [
      { clave: "documentos", etiqueta: "Documentos que se piden", tipo: "opciones", porDefecto: DOCUMENTOS_ESTUDIANTE.map((d) => d.valor), opciones: DOCUMENTOS_ESTUDIANTE, minimo: 0 },
    ],
  },
};

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
