// Formulario institucional "Informe de visita del asesor a trabajos de graduación". Módulo puro (servidor y cliente).
// Los datos del egresado, la empresa y el supervisor no se preguntan: el sistema ya los tiene.

export type TipoPregunta = "opcion" | "multiple" | "texto" | "texto_largo" | "fecha";
export type Respuestas = Record<string, string | string[]>;

export interface PreguntaVisita {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  opciones?: string[];
  /** Agrega la opción "Otro" con un campo de texto (se guarda en `${id}_otro`). */
  otro?: boolean;
  requerida: boolean;
  /** La pregunta solo aplica cuando la respuesta indicada está (o no está) entre los valores. */
  visibleSi?: { id: string; valores: string[]; negado?: boolean };
  ayuda?: string;
}

export interface SeccionVisita {
  titulo: string;
  /** Las secciones de evaluación solo aplican si la visita se realizó. */
  soloSiRealizada?: boolean;
  preguntas: PreguntaVisita[];
}

export interface FotoVisita {
  url: string;
  leyenda: string;
}

export const OTRO = "Otro";
const SI_NO = ["Sí", "No"];
const SI_PARCIAL_NO = ["Sí", "Parcialmente", "No"];

export const SECCIONES_VISITA: SeccionVisita[] = [
  {
    titulo: "Realización de la visita",
    preguntas: [
      { id: "fecha_visita", texto: "Fecha en la que la visita fue realizada", tipo: "fecha", requerida: true },
      {
        id: "modalidad",
        texto: "Modalidad de la visita",
        tipo: "opcion",
        opciones: ["Presencial", "Virtual"],
        requerida: true,
        ayuda: "La visita virtual solo procede en pasantías internacionales o con autorización previa del decanato.",
      },
      {
        id: "justificacion_virtual",
        texto: "Indique si la pasantía es internacional o la referencia de la autorización previa del decanato",
        tipo: "texto_largo",
        requerida: true,
        visibleSi: { id: "modalidad", valores: ["Virtual"] },
      },
      {
        id: "programada",
        texto: "Indicar cuándo fue programada la visita",
        tipo: "opcion",
        opciones: ["Un mes antes", "Quince días antes", "Una semana antes", "Un par de días antes"],
        otro: true,
        requerida: true,
      },
      {
        id: "realizada",
        texto: "¿Logró realizar la visita a la institución o empresa?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "motivo_no_realizada",
        texto: "Indique la causa o justificación por la que no se realizó la visita",
        tipo: "texto_largo",
        requerida: true,
        visibleSi: { id: "realizada", valores: ["No"] },
        ayuda:
          "Si no logró realizar la visita por causas ajenas o imputables a terceros, además debe notificar al decanato vía correo, identificando el caso con el nombre y carnet del alumno, la empresa o institución y la causa.",
      },
    ],
  },
  {
    titulo: "Facilidad de acceso",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "dificultades_ingreso",
        texto: "Indicar si tuvo dificultades para ingresar a la empresa o institución",
        tipo: "opcion",
        opciones: ["Sí (tuve dificultades)", "No (ninguna dificultad)"],
        requerida: true,
      },
      {
        id: "tipo_dificultades",
        texto: "Indique brevemente qué tipo de dificultades enfrentó para el ingreso",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "dificultades_ingreso", valores: ["Sí (tuve dificultades)"] },
      },
    ],
  },
  {
    titulo: "Organización de la visita",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "recibido_supervisor",
        texto: "Indicar si fue recibido(a) y atendido(a) por el supervisor empresarial designado",
        tipo: "opcion",
        opciones: ["Sí", "No, otra persona me atendió en mi visita"],
        requerida: true,
      },
      {
        id: "persona_atendio",
        texto: "Indique el nombre y cargo de la persona que le atendió (no era el supervisor empresarial o institucional)",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "recibido_supervisor", valores: ["No, otra persona me atendió en mi visita"] },
      },
      {
        id: "egresado_presente",
        texto: "Al momento de recibirlo, ¿el egresado se encontraba presente?",
        tipo: "opcion",
        opciones: ["Sí", "No", "Se incorporó posteriormente"],
        requerida: true,
      },
      {
        id: "aspectos_visita",
        texto: "Indique los aspectos que aplican a la visita",
        tipo: "multiple",
        opciones: [
          "Se me brindó un breve tour por la operación de la empresa o institución",
          "Fuimos directamente a una sala de reuniones",
          "Fuimos directamente al espacio de trabajo del pasante",
          'La visita no se realizó en un lugar "particular" de la empresa sino en el piso de trabajo',
        ],
        otro: true,
        requerida: true,
      },
    ],
  },
  {
    titulo: "De la empresa o institución",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "ubicacion_acceso",
        texto: "La ubicación de la empresa es de fácil acceso",
        tipo: "opcion",
        opciones: [
          "Sí",
          "Parcialmente, si no se cuenta con vehículo propio es complicado",
          "Parcialmente, la empresa se encuentra bastante retirada de los accesos primarios y toma mucho tiempo llegar hasta ella",
          "No",
        ],
        requerida: true,
      },
      {
        id: "estado_fisico",
        texto: "La empresa o institución se encontraba físicamente en",
        tipo: "opcion",
        opciones: ["Excelente estado", "Muy buen estado", "Buen estado", "Regular estado", "Mal estado"],
        requerida: true,
      },
      {
        id: "espacio_adecuado",
        texto: "¿Cuenta la empresa con espacio adecuado, seguro y en condiciones adecuadas para el egresado?",
        tipo: "opcion",
        opciones: ["Sí, de forma permanente", "No de forma permanente", "No"],
        requerida: true,
      },
      {
        id: "equipo_necesario",
        texto: "¿Cuenta la empresa con el equipo necesario para realizar las funciones y actividades asignadas al egresado?",
        tipo: "opcion",
        opciones: [
          "Sí",
          "No",
          "No, no es necesaria la utilización de equipo o herramientas para el desarrollo de las actividades",
          "No, el pasante utiliza equipo propio o ha tenido que adquirir sus herramientas",
        ],
        requerida: true,
      },
      {
        id: "condiciones_sanitarias",
        texto: "¿Existen las condiciones sanitarias adecuadas para el correcto desempeño de las funciones y actividades del egresado?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "respeto_mutuo",
        texto: "¿Posee la empresa un ambiente de respeto mutuo entre los empleados?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "pasantes_otras_instituciones",
        texto: "¿Recibe la empresa o ha recibido pasantes o egresados de otras instituciones de educación superior? Indique de qué instituciones o NO",
        tipo: "texto",
        requerida: true,
      },
      {
        id: "pasantes_fiya",
        texto: "Indicar si la empresa ya ha recibido pasantes o egresados de FIYA UNICAES",
        tipo: "opcion",
        opciones: ["Sí", "No, primera ocasión"],
        requerida: true,
      },
      {
        id: "numero_pasantes_unicaes",
        texto: "Indique un número aproximado de pasantes o egresados provenientes de UNICAES",
        tipo: "opcion",
        opciones: ["De 1 a 5", "De 6 a 10", "De 10 a 15", "De 15 a 20", "Más de 20"],
        requerida: false,
        visibleSi: { id: "pasantes_fiya", valores: ["Sí"] },
      },
    ],
  },
  {
    titulo: "Familiaridad de la empresa con el trabajo del egresado",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "familiar_actividades",
        texto: "El supervisor o la persona encargada está familiarizada y conoce las actividades que desempeña el egresado",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "familiar_horarios",
        texto: "El supervisor o la persona encargada está familiarizada con los horarios del egresado",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "familiar_informes",
        texto: "El supervisor o la persona encargada está familiarizada con los informes mensuales del egresado",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
    ],
  },
  {
    titulo: "Satisfacción de la empresa o institución con el egresado",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "satisfaccion_desempeno",
        texto: "De forma general, ¿la empresa o institución se encuentra satisfecha con el desempeño y disposición general del egresado?",
        tipo: "opcion",
        opciones: ["Muy satisfecha", "Satisfecha", "Parcialmente satisfecha", "Nada satisfecha"],
        requerida: true,
      },
      {
        id: "mejora_desempeno",
        texto: "Indique qué debe mejorar el egresado de acuerdo con la empresa",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "satisfaccion_desempeno", valores: ["Muy satisfecha"], negado: true },
      },
      {
        id: "satisfaccion_actitud",
        texto: "¿Se encuentra la empresa satisfecha con la actitud, comportamiento y valores del egresado?",
        tipo: "opcion",
        opciones: ["Muy satisfecha", "Satisfecha", "Poco satisfecha", "Nada satisfecha"],
        requerida: true,
      },
      {
        id: "mejora_actitud",
        texto: "Indique qué debe mejorar el egresado en actitud, comportamiento y valores de acuerdo con la empresa",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "satisfaccion_actitud", valores: ["Muy satisfecha"], negado: true },
      },
      {
        id: "conoce_demanda_contratacion",
        texto: "¿Conoce la persona que recibe al asesor la demanda de contratación de profesionales de la empresa?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "conoce_numero_contratacion",
        texto: "¿Conoce la persona que recibe al asesor el número de contratación de profesionales de la empresa anualmente?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "numero_contrataciones",
        texto: "¿Cuántos profesionales se contratan anualmente en la empresa? (número aproximado)",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "conoce_numero_contratacion", valores: ["Sí"] },
      },
      {
        id: "conoce_graduados_unicaes",
        texto: "¿Conoce la persona cuántos profesionales graduados de UNICAES laboran actualmente en la empresa?",
        tipo: "opcion",
        opciones: SI_NO,
        requerida: true,
      },
      {
        id: "numero_graduados_unicaes",
        texto: "Indique cuántos (puede ser un aproximado)",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "conoce_graduados_unicaes", valores: ["Sí"] },
      },
      {
        id: "carta_recomendacion",
        texto: "¿Estaría la empresa en la disposición de emitir una carta de recomendación para el pasante?",
        tipo: "opcion",
        opciones: ["Sí", "No responde, no sabe o no quiere responder", "No por el momento"],
        requerida: true,
      },
      {
        id: "contratar_pasante",
        texto: "¿Estaría la empresa en disposición o en capacidad de contratar al pasante una vez concluido su proceso?",
        tipo: "opcion",
        opciones: ["Sí", "No responde, no sabe o no quiere responder", "No por el momento"],
        requerida: true,
      },
    ],
  },
  {
    titulo: "Grado de satisfacción del egresado con la empresa o institución",
    soloSiRealizada: true,
    preguntas: [
      { id: "egresado_comodo", texto: "¿Se encuentra el egresado cómodo en el ambiente laboral?", tipo: "opcion", opciones: SI_NO, requerida: true },
      {
        id: "motivo_incomodidad",
        texto: "Describa brevemente por qué no",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "egresado_comodo", valores: ["No"] },
      },
      {
        id: "plan_sin_desviaciones",
        texto: "¿Ha seguido el pasante el desarrollo del plan de trabajo sin desviaciones?",
        tipo: "opcion",
        opciones: ["Sí", "Sí, con algunas pequeñas desviaciones", "No, lo solicitado por la empresa está fuera del plan de trabajo"],
        requerida: true,
      },
      {
        id: "condiciones_adecuadas_egresado",
        texto: "¿Considera el egresado que la empresa o institución posee las condiciones adecuadas para realizar su trabajo?",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "ampliar_condiciones",
        texto: "Amplíe la respuesta anterior",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "condiciones_adecuadas_egresado", valores: ["Sí"], negado: true },
      },
      {
        id: "aprovechando_tiempo",
        texto: "¿Considera el egresado que está aprovechando su tiempo?",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "actividades_valor",
        texto: "¿Considera el egresado que las actividades desempeñadas en la empresa o institución le proporcionan valor a su formación?",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "ampliar_actividades_valor",
        texto: "Amplíe la respuesta anterior",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "actividades_valor", valores: ["Sí"], negado: true },
      },
      {
        id: "espera_contratacion",
        texto: "¿Esperaría el egresado ser contratado por la empresa?",
        tipo: "opcion",
        opciones: [
          "Sí",
          "No sabe, no está seguro",
          "No, solo es un requisito para graduarse y esta empresa le dio el espacio",
          "No, quiere explorar otras opciones",
        ],
        requerida: true,
      },
    ],
  },
  {
    titulo: "Apreciaciones de valor del asesor UNICAES",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "posibilidad_crecimiento",
        texto: "De acuerdo con su observación personal de la empresa, ¿existe posibilidad de crecimiento para el o los egresados?",
        tipo: "opcion",
        opciones: ["Sí", "Parcialmente", "No", "No fue observada la operación"],
        requerida: true,
      },
      {
        id: "posicion_acorde",
        texto: "¿Está el egresado en una posición o realizando actividades acordes al grado académico al que aspira?",
        tipo: "opcion",
        opciones: [
          "Sí",
          "No, el trabajo que realiza más parece un trabajo para una contratación temporal de una persona sin mayor instrucción profesional",
          "No, el trabajo que realiza no involucra al pasante directamente; solo se limita a ser parte de un proyecto puntual que no continuará en el tiempo",
          "No, el pasante solo se dedica a recibir inducciones y capacitaciones y su involucramiento en el desarrollo de actividades es mínimo",
          "No",
        ],
        requerida: true,
      },
      {
        id: "respeta_horarios",
        texto: "La empresa respeta los horarios del egresado, así como sus días de descanso y vacaciones",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "actitud_representante",
        texto: "Defina la actitud de la persona representante de la empresa que le atendió",
        tipo: "multiple",
        opciones: [
          "Motivada",
          "Amable",
          "Atenta",
          "Despreocupada en general",
          "Con claridad y visión",
          "Interesada en el proceso",
          "Desinteresada del proceso",
          "Organizada",
          "Agradecida con la visita",
        ],
        otro: true,
        requerida: true,
      },
    ],
  },
  {
    titulo: "Recomendación del asesor UNICAES",
    soloSiRealizada: true,
    preguntas: [
      {
        id: "recomienda_banco",
        texto:
          "Con base en lo observado en su visita, ¿recomienda que la empresa o institución forme parte del banco de instituciones aptas para realizar trabajos de graduación y vinculaciones con los alumnos y egresados de FIYA UNICAES?",
        tipo: "opcion",
        opciones: SI_PARCIAL_NO,
        requerida: true,
      },
      {
        id: "ampliar_recomendacion",
        texto: "Amplíe la respuesta anterior",
        tipo: "texto",
        requerida: true,
        visibleSi: { id: "recomienda_banco", valores: ["Sí"], negado: true },
      },
      {
        id: "recomendacion_universidad",
        texto: "Agregue alguna recomendación o valoración del asesor para la Universidad sobre esta empresa",
        tipo: "texto_largo",
        requerida: true,
      },
    ],
  },
];

export const REGLAS_FOTOS_VISITA = [
  "La fotografía es la evidencia de que la visita fue realizada: en ella deben aparecer el asesor, el egresado y el supervisor empresarial.",
  "La visita solo puede realizarse de forma virtual en pasantías internacionales o con autorización previa del decanato; en ese caso adjunte la captura de la reunión con los tres participantes.",
  "Cada fotografía debe llevar su pie de imagen.",
];

export const MAX_FOTOS_VISITA = 4;

function valorTexto(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.join(", ") : (v ?? "");
}

export function visitaRealizada(r: Respuestas) {
  return r.realizada === "Sí";
}

export function seccionVisible(s: SeccionVisita, r: Respuestas) {
  return !s.soloSiRealizada || visitaRealizada(r);
}

export function preguntaVisible(p: PreguntaVisita, r: Respuestas) {
  if (!p.visibleSi) return true;
  const actual = valorTexto(r[p.visibleSi.id]);
  if (!actual) return false;
  const coincide = p.visibleSi.valores.includes(actual);
  return p.visibleSi.negado ? !coincide : coincide;
}

/** Texto legible de una respuesta, incluido el detalle de la opción "Otro". */
export function respuestaTexto(p: PreguntaVisita, r: Respuestas) {
  const v = r[p.id];
  const otro = typeof r[`${p.id}_otro`] === "string" ? (r[`${p.id}_otro`] as string).trim() : "";
  if (Array.isArray(v)) return v.map((x) => (x === OTRO && otro ? `Otro: ${otro}` : x)).join("; ");
  if (v === OTRO && otro) return `Otro: ${otro}`;
  return v ?? "";
}

/** Requisitos para completar el informe de visita. */
export function validarInformeVisita(r: Respuestas, fotos: FotoVisita[]): string[] {
  const problemas: string[] = [];
  for (const s of SECCIONES_VISITA) {
    if (!seccionVisible(s, r)) continue;
    for (const p of s.preguntas) {
      if (!p.requerida || !preguntaVisible(p, r)) continue;
      const v = r[p.id];
      const vacio = Array.isArray(v) ? v.length === 0 : !v || !String(v).trim();
      if (vacio) {
        problemas.push(`${s.titulo}: ${p.texto}.`);
        continue;
      }
      const eligioOtro = Array.isArray(v) ? v.includes(OTRO) : v === OTRO;
      if (p.otro && eligioOtro && !String(r[`${p.id}_otro`] || "").trim()) {
        problemas.push(`${s.titulo}: especifique la opción "Otro" en "${p.texto}".`);
      }
    }
  }
  if (visitaRealizada(r)) {
    if (fotos.length === 0) problemas.push("Debe adjuntar al menos una fotografía de la visita.");
    if (fotos.some((f) => !f.leyenda?.trim())) problemas.push("Cada fotografía de la visita debe llevar su pie de imagen.");
  }
  return problemas;
}
