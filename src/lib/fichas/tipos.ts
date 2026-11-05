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

export type TipoHito = "primer_contacto" | "visita" | "dictamen_propuesta" | "dictamen_plan" | "personalizado";

export const TIPOS_HITO: { tipo: TipoHito; nombre: string; momento: MomentoHito; descripcion: string }[] = [
  { tipo: "dictamen_propuesta", nombre: "Dictamen de aprobación de la propuesta", momento: "antes", descripcion: "Documento que aprueba la propuesta; sin él no inicia la ejecución." },
  { tipo: "dictamen_plan", nombre: "Dictamen de aprobación del plan de trabajo", momento: "antes", descripcion: "Documento que aprueba el plan de trabajo; sin él no inicia la ejecución." },
  { tipo: "primer_contacto", nombre: "Primer contacto con el asesor", momento: "durante", descripcion: "Informe del asesor al iniciar la ejecución." },
  { tipo: "visita", nombre: "Visita del asesor", momento: "durante", descripcion: "Visita a la institución en una ventana de días." },
  { tipo: "personalizado", nombre: "Hito personalizado", momento: "durante", descripcion: "Cualquier otro momento de control." },
];

/** "antes": requisito para iniciar la ejecución; "durante": ocurre en una ventana de la ejecución. */
export type MomentoHito = "antes" | "durante";

export interface Hito {
  id: string;
  nombre: string;
  /** Opcionales en el formato 1: las definiciones guardadas antes de agregarlos se leen como "personalizado"/"durante". */
  tipo?: TipoHito;
  momento?: MomentoHito;
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
  /** En palabras e imágenes, 0 significa "sin mínimo" (proyecto e investigación no aplican métrica). */
  registro: {
    descripcion: { min: number; max: number };
    conclusion: { min: number; max: number };
    imagenes: number;
    /** Opcionales en el formato 1; si faltan se leen con los valores de la pasantía (ver opcionesRegistro). */
    modo?: ModoRegistro;
    marcoTeorico?: ExigenciaMarco;
    avance?: boolean;
  };
  /** Días recomendados para que el asesor revise un subperíodo enviado. */
  diasRevision: number;
  /** Subperíodos que el egresado puede adelantar en borrador mientras el anterior está en revisión. */
  subperiodosAdelantables: number;
  eliminacionesPorPeriodo: number;
  informe: {
    /** 0 = sin mínimo de páginas. */
    paginasMinimas: number;
    exigirActividadesAprobadas: boolean;
    comentariosDecanato: { activo: boolean; minPalabras: number };
    /** Opcional en el formato 1; si falta se lee "unico". */
    modo?: ModoInforme;
  };
  /** Plazo, en días desde que el asesor lo crea, del informe de primer contacto; null si la etapa no lo pide. */
  diasPrimerContacto: number | null;
  hitos: Hito[];
}

/** "subperiodo": un registro por subperíodo (pasantía). "actividad": un registro por actividad del plan, con su avance (proyecto). */
export type ModoRegistro = "subperiodo" | "actividad";
export type ExigenciaMarco = "obligatorio" | "opcional" | "no";
/** "unico": un informe por trabajo. "individual_y_general": cada integrante redacta el suyo y con ellos se arma el general. */
export type ModoInforme = "unico" | "individual_y_general";

/** Valores efectivos del registro y del informe, con los valores de la pasantía para las versiones guardadas antes. */
export function opcionesRegistro(et: EtapaEjecucion) {
  return {
    modo: et.registro.modo ?? "subperiodo",
    marcoTeorico: et.registro.marcoTeorico ?? "obligatorio",
    avance: et.registro.avance ?? false,
    informe: et.informe.modo ?? "unico",
  } as const;
}

/**
 * Plan de trabajo jerárquico (proyecto e investigación). Va entre la propuesta aprobada y la ejecución:
 * objetivo general → objetivos específicos → macroactividades → actividades → subactividades.
 * El cronograma es también la tabla de presupuesto: cada actividad lleva su monto en los subperíodos en que
 * se ejecuta y cada nivel suma los de sus hijos. En equipo hay un plan general y uno individual por integrante.
 */
export interface EtapaPlan {
  tipo: "plan";
  id: string;
  nombre: string;
  subactividades: "no" | "opcional" | "obligatorio";
  minimos: {
    /** Objetivos específicos de cada integrante (en trabajo individual, del egresado). */
    objetivosPorIntegrante: number;
    macroPorObjetivo: number;
    actividadesPorMacro: number;
  };
  presupuesto: { activo: boolean; desglose: "monto" | "recursos_gastos"; moneda: string };
  /** Columnas del cronograma: cada subperíodo o cada período de la ejecución. */
  granularidad: "subperiodo" | "periodo";
  /** Solo aplica a trabajos en equipo. */
  equipo: {
    /** Nivel en el que se asigna el integrante responsable; lo que cuelga de él es del mismo integrante. */
    responsable: "objetivo" | "actividad";
    planIndividual: boolean;
    /** Muestra al asesor la carga de cada integrante. El reparto equitativo lo decide el asesor, no el sistema. */
    panelCarga: boolean;
  };
  aprobacion: {
    /** El supervisor de la institución valida el plan y queda documentado en el informe de primer contacto. */
    validaSupervisor: boolean;
    /** Días que tiene el asesor para revisar el plan enviado. */
    diasRevision: number;
  };
}

export type Etapa = EtapaPropuesta | EtapaPlan | EtapaEjecucion;

export interface DefinicionFicha {
  formato: typeof FORMATO_DEFINICION;
  modalidad: Modalidad;
  /** Los integrantes siempre son de la misma cohorte. `mismaCarrera` es opcional en el formato 1 (falta = no se exige). */
  participantes: { min: number; max: number; mismaCarrera?: boolean };
  /** Una etapa de propuesta, opcionalmente un plan de trabajo, y cero o más etapas de ejecución. El cierre, los
   *  roles y la plantilla de documento se agregarán al formato en entregas posteriores. */
  etapas: Etapa[];
}

export const esEtapaPropuesta = (e: Etapa): e is EtapaPropuesta => e.tipo === "propuesta";
export const esEtapaPlan = (e: Etapa): e is EtapaPlan => e.tipo === "plan";
export const esEtapaEjecucion = (e: Etapa): e is EtapaEjecucion => e.tipo === "ejecucion";

/** Niveles del plan, con su numeración de ejemplo. */
export const NIVELES_PLAN = [
  { nivel: 1, nombre: "Objetivo general", codigo: "1" },
  { nivel: 2, nombre: "Objetivo específico", codigo: "1.1" },
  { nivel: 3, nombre: "Macroactividad", codigo: "1.1.1" },
  { nivel: 4, nombre: "Actividad", codigo: "1.1.1.1" },
  { nivel: 5, nombre: "Subactividad", codigo: "1.1.1.1.1" },
] as const;

/** Días de cada subperíodo de un período: partes iguales y el residuo en el último (30 / 4 → [7, 7, 7, 9]). */
export function diasSubperiodos(duracionPeriodo: number, subperiodos: number): number[] {
  const base = Math.floor(duracionPeriodo / subperiodos);
  return Array.from({ length: subperiodos }, (_, i) =>
    i === subperiodos - 1 ? duracionPeriodo - base * (subperiodos - 1) : base
  );
}

/** Rango de palabras en texto: 0 significa "sin mínimo" o "sin máximo". */
export function rangoPalabras(min: number, max: number, sufijo = "palabras"): string {
  if (min > 0 && max > 0) return `${min}–${max} ${sufijo}`.trim();
  if (min > 0) return `al menos ${min} ${sufijo}`.trim();
  if (max > 0) return `hasta ${max} ${sufijo}`.trim();
  return sufijo ? `${sufijo}: sin límite` : "sin límite";
}
