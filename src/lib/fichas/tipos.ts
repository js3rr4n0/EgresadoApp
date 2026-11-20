// Formato de la definición de una ficha (configuración de un tipo de trabajo de graduación).
// Se guarda como JSON en fichas_versiones.definicion. Módulo puro: se usa en servidor y en cliente.
//
// Glosario (specs/fichas): una ficha tiene etapas; la etapa de propuesta tiene espacios, y cada espacio es una
// instancia de un elemento del catálogo con sus parámetros. La etapa de ejecución tiene períodos, subperíodos e hitos.

import type { CampoPropio, CopiaElementoPropio } from "./elementosPropios";

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
  | "documentos"
  | "imagen"
  | "archivo"
  | "enlace"
  | "lista"
  | "tabla"
  | "apartado"
  | "resultados_objetivos"
  | "reporte_modificaciones"
  /** Informe final (entrega F3): las fuentes citadas en el informe; lo genera el sistema. */
  | "referencias_citadas"
  /** Informe final (entrega F4): anexos y páginas que genera el sistema. */
  | "anexo_involucrados"
  | "anexo_recursos"
  /** Informe final de proyecto (notas del 20-nov-2026): el cronograma original y el ejecutado como capítulo propio. */
  | "cronograma_comparado"
  | "derechos_autoria"
  | "recursos_presupuesto"
  /** Elemento propio del catálogo (catálogo editable, C2): el espacio guarda su copia en `propio`. */
  | "propio";

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
  /**
   * Solo en el protocolo: id de un espacio de la propuesta cuya respuesta se precarga aquí (por ejemplo, la
   * problemática parte de la descripción del problema). El egresado la ajusta en lugar de escribirla de nuevo.
   */
  precargarDe?: string;
  /**
   * Solo apartados académicos (ajustes al protocolo, 19-nov-2026): configuración de cada subapartado en la ficha, en
   * su orden (activar o desactivar, renombrar, reglas) y subapartados propios. Falta = los del tipo, como están.
   */
  partes?: ConfigParte[];
  /** Solo el elemento "propio" (catálogo editable, C2): copia del elemento al agregarlo o al actualizarlo. */
  propio?: CopiaElementoPropio;
  /**
   * Campos adicionales al final de un elemento del sistema (catálogo editable, C4), en la propuesta o el protocolo. Su
   * respuesta va aparte, en "<id>#extra". Los campos propios del elemento no cambian: otras partes dependen de ellos.
   */
  camposExtra?: CampoPropio[];
}

/** Configuración de un subapartado de un apartado académico en la ficha. Lo que falta toma el valor del tipo. */
export interface ConfigParte {
  /** Id del subapartado del tipo, o de uno propio (empieza con "x_"). */
  id: string;
  activa: boolean;
  titulo?: string;
  ayuda?: string;
  /** true: no bloquea el envío si queda vacío. */
  opcional?: boolean;
  /** Palabras (texto y pregunta). 0 = sin límite. */
  min?: number;
  max?: number;
  /** Elementos (lista) o filas (tabla). 0 = sin límite. */
  minItems?: number;
  maxItems?: number;
  /** Párrafos citados: cada párrafo debe tener al menos una fuente. */
  citaPorParrafo?: boolean;
  /** Solo subapartados propios: su formato (y las columnas, si es tabla). */
  propia?: { formato: "texto" | "lista" | "tabla"; columnas?: string[] };
}

export interface EtapaPropuesta {
  tipo: "propuesta";
  id: string;
  nombre: string;
  espacios: Espacio[];
}

/**
 * Protocolo (investigación, contexto del 12-nov-2026): documento que se redacta después de la propuesta aprobada,
 * junto con el plan de trabajo, que es su "cronograma de actividades". Lo dictamina el asesor. Sus espacios son
 * elementos del mismo catálogo que la propuesta. La portada y el índice se generan; no son espacios.
 */
export interface EtapaProtocolo {
  tipo: "protocolo";
  id: string;
  nombre: string;
  espacios: Espacio[];
  revision: {
    /** Plazo del asesor para emitir el dictamen. */
    diasRevision: number;
    /** El plazo se cuenta en días hábiles (sin sábados ni domingos). */
    diasHabiles: boolean;
    /** En equipo, todos los integrantes ratifican el protocolo antes de enviarlo, como la propuesta. */
    ratificacion: boolean;
  };
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
    /** Evidencias por actividad (imágenes, documentos o enlaces) en el modo "actividad". 0 = sin mínimo. */
    evidencias?: { min: number; max: number };
    /**
     * Bitácora o reporte de modificaciones (notas del 13-nov-2026): en cada actividad y objetivo, un texto opcional
     * para cambios de tiempo, recursos o alcance; se anexa a los informes. Falta = false.
     */
    modificaciones?: boolean;
    /** Actividades menos atadas a su período (notas del 13-nov-2026): se pueden adelantar al período abierto. Falta = false. */
    adelantar?: boolean;
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
    evidencias: et.registro.evidencias ?? { min: 0, max: (et.registro.modo ?? "subperiodo") === "actividad" ? 5 : 0 },
    modificaciones: et.registro.modificaciones ?? false,
    adelantar: et.registro.adelantar ?? false,
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
    /**
     * Máximo por integrante (H19/H27). Si la propuesta tiene el elemento «objetivos», el mínimo y el máximo salen de él
     * (de 3 a 4 por defecto) para que propuesta, protocolo y plan pidan lo mismo.
     */
    maxObjetivosPorIntegrante?: number;
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
  /**
   * Opcional en el formato 1 (falta = "no"). Cada actividad declara el documento que se entregará como prueba;
   * el informe del período lo muestra en "Resultados por actividad" (investigación).
   */
  documentoSolicitado?: "no" | "opcional" | "obligatorio";
  /**
   * Opcional (falta = "no"). Cada objetivo específico declara sus productos esperados; al terminar sus actividades el
   * egresado los entrega con la conclusión del objetivo y el asesor los revisa juntos (notas del 13-nov-2026).
   */
  productosObjetivo?: "no" | "opcional" | "obligatorio";
  /**
   * Tipo de cronograma (notas del 19-nov-2026). Falta = "actividades" (cronograma de proyecto: macroactividades y
   * actividades). "investigacion": cada objetivo específico se organiza por los elementos de su proceso metodológico.
   */
  estructura?: "actividades" | "investigacion";
  /** Solo investigación: nombre y obligatoriedad de los elementos de cada objetivo. Falta = COMPONENTES_INVESTIGACION. */
  componentes?: ConfigComponente[];
  /** Solo investigación: bloque final para preparar el informe final y las conclusiones finales. */
  cierre?: { activo: boolean; titulo: string };
  /**
   * Solo investigación (entrega E2): el elemento "Metodología" de cada objetivo describe el procedimiento con párrafos
   * citados del registro de fuentes; una metodología propia lleva su fundamentación. Falta = no se pide.
   */
  metodologiaObjetivo?: boolean;
}

/** Elementos del proceso de investigación (nivel 3 del cronograma de investigación). */
export type ClaveComponente = "metodologia" | "desarrollo" | "resultados" | "conclusiones" | "discusion" | "redaccion_informe" | "conclusiones_finales";

export interface ConfigComponente {
  clave: ClaveComponente;
  nombre: string;
  /** Un elemento opcional (la discusión) puede quedar sin planificar y solo cuenta en el avance si se usa. */
  obligatorio: boolean;
}

/** Elementos de cada objetivo específico, al mismo nivel y en este orden. */
export const COMPONENTES_INVESTIGACION: ConfigComponente[] = [
  { clave: "metodologia", nombre: "Metodología", obligatorio: true },
  { clave: "desarrollo", nombre: "Desarrollo", obligatorio: true },
  { clave: "resultados", nombre: "Resultados", obligatorio: true },
  { clave: "conclusiones", nombre: "Conclusiones preliminares", obligatorio: true },
  { clave: "discusion", nombre: "Elementos de discusión", obligatorio: false },
];

/** Elementos del bloque final de preparación del informe. */
export const COMPONENTES_CIERRE: ConfigComponente[] = [
  { clave: "redaccion_informe", nombre: "Redacción del informe final", obligatorio: true },
  { clave: "conclusiones_finales", nombre: "Conclusiones finales", obligatorio: true },
];

export const CIERRE_POR_DEFECTO = { activo: true, titulo: "Preparación del informe final y conclusiones finales" };

/** Tipo de cronograma efectivo de un plan (las versiones anteriores no lo tienen). */
export const estructuraPlan = (p: Pick<EtapaPlan, "estructura">) => p.estructura ?? "actividades";
export const esCronogramaInvestigacion = (p: Pick<EtapaPlan, "estructura">) => estructuraPlan(p) === "investigacion";

/** Elementos de cada objetivo según la ficha: los de siempre, en su orden, con el nombre y la obligatoriedad configurados. */
export function componentesDe(p: Pick<EtapaPlan, "componentes">): ConfigComponente[] {
  return COMPONENTES_INVESTIGACION.map((d) => {
    const c = (p.componentes ?? []).find((x) => x.clave === d.clave);
    return { clave: d.clave, nombre: c?.nombre?.trim() || d.nombre, obligatorio: c ? !!c.obligatorio : d.obligatorio };
  });
}

/** Bloque de preparación del informe final: solo en el cronograma de investigación. */
export function cierreDe(p: Pick<EtapaPlan, "estructura" | "cierre">): { activo: boolean; titulo: string } {
  if (!esCronogramaInvestigacion(p)) return { activo: false, titulo: "" };
  return { activo: p.cierre?.activo ?? CIERRE_POR_DEFECTO.activo, titulo: p.cierre?.titulo?.trim() || CIERRE_POR_DEFECTO.titulo };
}

/**
 * Informe final por capítulos (investigación, I5; respuesta Q8): el documento final de la investigación (la tesis),
 * redactado dentro del sistema por todo el equipo. Sus capítulos son espacios del catálogo; la portada, las autoridades
 * y el índice se generan. Cada guardado crea una versión nueva (nada se sobrescribe), el asesor revisa y al final el
 * equipo ratifica la versión completa, que queda congelada con su huella.
 */
export interface EtapaInformeFinal {
  tipo: "informe_final";
  id: string;
  nombre: string;
  espacios: Espacio[];
  revision: {
    /** true: el asesor revisa capítulo por capítulo; false: el equipo envía el documento completo. */
    porCapitulo: boolean;
    /** En equipo, todos ratifican la versión final antes de entregarla. */
    ratificacion: boolean;
    diasRevision: number;
    diasHabiles: boolean;
  };
}

/** Fuente de precarga especial del informe final: el marco teórico registrado en las actividades de la ejecución. */
export const PRECARGA_MARCO_REGISTROS = "registros:marco_teorico";
/** Fuente de precarga del informe final: las conclusiones aprobadas de cada objetivo específico (productos por objetivo). */
export const PRECARGA_CONCLUSIONES_OBJETIVOS = "entregas:conclusiones";
/** Fuentes de precarga que vienen de la ejecución (solo en el informe final, en un texto o un apartado). */
export const PRECARGAS_EJECUCION = [PRECARGA_MARCO_REGISTROS, PRECARGA_CONCLUSIONES_OBJETIVOS];

export type Etapa = EtapaPropuesta | EtapaProtocolo | EtapaPlan | EtapaEjecucion | EtapaInformeFinal;

export interface DefinicionFicha {
  formato: typeof FORMATO_DEFINICION;
  modalidad: Modalidad;
  /** Los integrantes siempre son de la misma cohorte. `mismaCarrera` es opcional en el formato 1 (falta = no se exige). */
  participantes: { min: number; max: number; mismaCarrera?: boolean };
  /** Una etapa de propuesta, opcionalmente un protocolo (investigación) y un plan de trabajo, cero o más etapas de ejecución y, al final,
   *  opcionalmente el informe final por capítulos (investigación). El cierre, los
   *  roles y la plantilla de documento se agregarán al formato en entregas posteriores. */
  etapas: Etapa[];
}

export const esEtapaPropuesta = (e: Etapa): e is EtapaPropuesta => e.tipo === "propuesta";
export const esEtapaProtocolo = (e: Etapa): e is EtapaProtocolo => e.tipo === "protocolo";
export const esEtapaPlan = (e: Etapa): e is EtapaPlan => e.tipo === "plan";
export const esEtapaInformeFinal = (e: Etapa): e is EtapaInformeFinal => e.tipo === "informe_final";
/** Etapas que se arman con espacios del catálogo. */
export type EtapaConEspacios = EtapaPropuesta | EtapaProtocolo | EtapaInformeFinal;
export const tieneEspacios = (e: Etapa): e is EtapaConEspacios => e.tipo === "propuesta" || e.tipo === "protocolo" || e.tipo === "informe_final";
/** Valor efectivo de "documento solicitado" de un plan (las versiones anteriores no lo tienen). */
export const documentoSolicitado = (p: EtapaPlan) => p.documentoSolicitado ?? "no";
export const productosObjetivo = (p: EtapaPlan) => p.productosObjetivo ?? "no";
export const esEtapaEjecucion = (e: Etapa): e is EtapaEjecucion => e.tipo === "ejecucion";

/** Niveles del plan, con su numeración de ejemplo. */
export const NIVELES_PLAN = [
  { nivel: 1, nombre: "Objetivo general", codigo: "1" },
  { nivel: 2, nombre: "Objetivo específico", codigo: "1.1" },
  { nivel: 3, nombre: "Macroactividad", codigo: "1.1.1" },
  { nivel: 4, nombre: "Actividad", codigo: "1.1.1.1" },
  { nivel: 5, nombre: "Subactividad", codigo: "1.1.1.1.1" },
] as const;

/** Niveles del cronograma de investigación (notas del 19-nov-2026). */
export const NIVELES_PLAN_INVESTIGACION = [
  { nivel: 1, nombre: "Objetivo general", codigo: "1" },
  { nivel: 2, nombre: "Objetivo específico", codigo: "1.1" },
  { nivel: 3, nombre: "Elemento del proceso (metodología, desarrollo, resultados…)", codigo: "1.1.1" },
  { nivel: 4, nombre: "Subactividad", codigo: "1.1.1.1" },
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
