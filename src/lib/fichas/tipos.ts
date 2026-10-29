// Formato de la definición de una ficha (configuración de un tipo de trabajo de graduación).
// Se guarda como JSON en fichas_versiones.definicion. Módulo puro: se usa en servidor y en cliente.
//
// Glosario (specs/fichas): una ficha tiene etapas; la etapa de propuesta tiene espacios, y cada espacio es una
// instancia de un elemento del catálogo con sus parámetros. La etapa de ejecución tiene períodos, subperíodos e hitos.

/** Versión del formato del JSON. Se incrementa si cambia la forma de la definición, no por cada ficha. */
export const FORMATO_DEFINICION = 1;

export type Modalidad = "pasantia" | "proyecto" | "investigacion";

export type EstadoVersion = "borrador" | "habilitada" | "retirada";

export type ClaveElemento =
  | "portada"
  | "empresa"
  | "supervisor"
  | "carta"
  | "cronograma"
  | "texto"
  | "actores"
  | "objetivos"
  | "documentos";

export type ValorParametro = number | boolean | string | string[];

export interface Espacio {
  /** Identificador estable dentro de la ficha; se conserva entre versiones para comparar cambios. */
  id: string;
  elemento: ClaveElemento;
  titulo: string;
  descripcion: string;
  ayuda: string;
  obligatorio: boolean;
  parametros: Record<string, ValorParametro>;
  /**
   * Dónde guarda hoy la fase 1 la respuesta de este espacio (por ejemplo "propuestas.justificacion_proceso").
   * Solo lo tienen los espacios de las fichas base; los espacios nuevos guardarán su respuesta en una tabla propia.
   */
  origenFase1?: string;
}

export interface EtapaPropuesta {
  tipo: "propuesta";
  id: string;
  nombre: string;
  espacios: Espacio[];
}

export interface Hito {
  id: string;
  nombre: string;
  /** Día (o mes, según la unidad de la etapa) en que se habilita, contado desde el inicio de la etapa. */
  desde: number;
  hasta: number;
  /** Número de informe que no puede aprobarse sin este hito; null si no es requisito de ninguno. */
  requisitoDeInforme: number | null;
}

export interface EtapaEjecucion {
  tipo: "ejecucion";
  id: string;
  nombre: string;
  /** De dónde sale la fecha de inicio: la carta de aceptación o el fin de la etapa de ejecución anterior. */
  inicio: "carta" | "etapa_anterior";
  unidad: "dias" | "meses";
  periodos: number;
  duracionPeriodo: number;
  /** Los subperíodos se reparten en partes iguales y el último se queda con el residuo (30 / 4 = 7, 7, 7 y 9). */
  subperiodos: number;
  registro: {
    descripcion: { min: number; max: number };
    conclusion: { min: number; max: number };
    imagenes: number;
  };
  /** Días recomendados para que el asesor revise un subperíodo enviado. */
  diasRevision: number;
  /** Subperíodos que el egresado puede adelantar en borrador mientras el anterior está en revisión. */
  subperiodosAdelantables: number;
  eliminacionesPorPeriodo: number;
  informe: {
    paginasMinimas: number;
    exigirActividadesAprobadas: boolean;
    comentariosDecanato: { activo: boolean; minPalabras: number };
  };
  /** Plazo, en días desde que el asesor lo crea, del informe de primer contacto; null si la etapa no lo pide. */
  diasPrimerContacto: number | null;
  hitos: Hito[];
}

export type Etapa = EtapaPropuesta | EtapaEjecucion;

export interface DefinicionFicha {
  formato: typeof FORMATO_DEFINICION;
  modalidad: Modalidad;
  participantes: { min: number; max: number };
  /** Una etapa de propuesta, seguida de cero o más etapas de ejecución. El cierre, los roles y la plantilla
   *  de documento se agregarán al formato en entregas posteriores. */
  etapas: Etapa[];
}

export const esEtapaPropuesta = (e: Etapa): e is EtapaPropuesta => e.tipo === "propuesta";
export const esEtapaEjecucion = (e: Etapa): e is EtapaEjecucion => e.tipo === "ejecucion";

/** Días de cada subperíodo de un período: partes iguales y el residuo en el último (30 / 4 → [7, 7, 7, 9]). */
export function diasSubperiodos(duracionPeriodo: number, subperiodos: number): number[] {
  const base = Math.floor(duracionPeriodo / subperiodos);
  return Array.from({ length: subperiodos }, (_, i) =>
    i === subperiodos - 1 ? duracionPeriodo - base * (subperiodos - 1) : base
  );
}
