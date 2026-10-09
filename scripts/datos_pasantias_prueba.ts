// Datos inventados para las pasantías de prueba (scripts/sembrar_pasantias_prueba.ts). Solo para revisión del flujo.
import { datosCitaVacios, type DatosCitaApa } from "../src/lib/citaApa";

const cita = (d: Partial<DatosCitaApa>): DatosCitaApa => ({ ...datosCitaVacios(d.tipo ?? "libro"), ...d });

// ── Cronogramas: 4 actividades por semana, 4 semanas por período ──

export const CRONOGRAMA_CREDITOS: string[][][] = [
  [
    [
      "Inducción a los procesos de la Caja de Crédito",
      "Recorrido por las áreas de créditos y cobros",
      "Revisión del control actual en hojas de cálculo",
      "Identificación de actores del proceso de crédito",
    ],
    [
      "Entrevistas con analistas de crédito",
      "Entrevistas con gestores de cobro",
      "Levantamiento de requerimientos funcionales",
      "Levantamiento de requerimientos no funcionales",
    ],
    [
      "Modelado de procesos actuales con BPMN",
      "Elaboración de casos de uso del sistema",
      "Priorización de requerimientos con el supervisor",
      "Validación del alcance del proyecto",
    ],
    [
      "Análisis de riesgos del proyecto",
      "Estimación de esfuerzo y cronograma detallado",
      "Elaboración del documento de especificación",
      "Presentación del análisis a la jefatura",
    ],
  ],
  [
    [
      "Definición de la arquitectura del sistema",
      "Selección de tecnologías de desarrollo",
      "Diseño del modelo conceptual de datos",
      "Diseño del modelo entidad relación",
    ],
    [
      "Normalización de la base de datos",
      "Diseño físico de la base de datos",
      "Elaboración del diccionario de datos",
      "Diseño de la política de respaldos",
    ],
    [
      "Prototipo de la pantalla de inicio de sesión",
      "Prototipo del registro de solicitudes de crédito",
      "Prototipo del módulo de cobros",
      "Prototipo de reportes gerenciales",
    ],
    [
      "Validación de prototipos con usuarios",
      "Diseño de la interfaz de programación de aplicaciones",
      "Diseño del esquema de seguridad y roles",
      "Elaboración del plan de pruebas",
    ],
  ],
  [
    [
      "Configuración del entorno de desarrollo",
      "Configuración del repositorio y control de versiones",
      "Creación de la base de datos de pruebas",
      "Implementación del módulo de autenticación",
    ],
    [
      "Implementación de la gestión de usuarios y roles",
      "Implementación del registro de clientes",
      "Implementación de la consulta de clientes",
      "Implementación de la validación de documentos",
    ],
    [
      "Implementación del registro de solicitudes de crédito",
      "Implementación del cálculo de cuotas",
      "Implementación del flujo de aprobación de créditos",
      "Implementación del historial crediticio",
    ],
    [
      "Pruebas unitarias del módulo de créditos",
      "Corrección de defectos del módulo de créditos",
      "Revisión de código con el equipo",
      "Demostración del avance al supervisor",
    ],
  ],
  [
    [
      "Implementación del registro de pagos",
      "Implementación del cálculo de mora",
      "Implementación del plan de pagos",
      "Implementación de recordatorios de pago",
    ],
    [
      "Implementación del módulo de gestión de cobros",
      "Implementación de la asignación de cartera a gestores",
      "Implementación del reporte de cartera vencida",
      "Implementación del tablero de indicadores",
    ],
    [
      "Integración con el sistema contable",
      "Implementación de la exportación de reportes",
      "Implementación de la bitácora de auditoría",
      "Optimización de consultas a la base de datos",
    ],
    [
      "Pruebas unitarias del módulo de cobros",
      "Pruebas de integración entre módulos",
      "Corrección de defectos detectados",
      "Demostración del sistema completo al supervisor",
    ],
  ],
  [
    [
      "Elaboración de casos de prueba de aceptación",
      "Pruebas de aceptación con analistas de crédito",
      "Pruebas de aceptación con gestores de cobro",
      "Registro y priorización de observaciones",
    ],
    [
      "Corrección de observaciones de las pruebas",
      "Pruebas de rendimiento del sistema",
      "Pruebas básicas de seguridad",
      "Preparación del ambiente de producción",
    ],
    [
      "Migración de datos históricos",
      "Validación de los datos migrados",
      "Elaboración del manual de usuario",
      "Elaboración del manual técnico",
    ],
    [
      "Capacitación a usuarios del área de créditos",
      "Capacitación a usuarios del área de cobros",
      "Puesta en producción del sistema",
      "Cierre del proyecto y entrega de documentación",
    ],
  ],
];

export const CRONOGRAMA_HOSPITAL: string[][][] = [
  [
    [
      "Inducción al hospital y sus servicios",
      "Recorrido por admisión y consulta externa",
      "Revisión del proceso actual de citas",
      "Identificación de usuarios del sistema",
    ],
    [
      "Entrevistas con personal de admisión",
      "Entrevistas con médicos de consulta externa",
      "Levantamiento de requerimientos de citas",
      "Levantamiento de requerimientos del expediente",
    ],
    [
      "Modelado del proceso de atención al paciente",
      "Elaboración de casos de uso del sistema",
      "Validación de requerimientos con el supervisor",
      "Definición del alcance del proyecto",
    ],
    [
      "Análisis de riesgos del proyecto",
      "Estimación del cronograma detallado",
      "Elaboración del documento de especificación",
      "Presentación del análisis a la dirección médica",
    ],
  ],
  [
    [
      "Definición de la arquitectura del sistema",
      "Diseño del modelo de datos de pacientes",
      "Diseño del modelo de datos de citas",
      "Selección de tecnologías de desarrollo",
    ],
    [
      "Prototipo de la agenda de citas",
      "Prototipo del expediente clínico",
      "Prototipo del portal del paciente",
      "Validación de prototipos con médicos",
    ],
    [
      "Diseño físico de la base de datos",
      "Elaboración del diccionario de datos",
      "Diseño del esquema de seguridad y roles",
      "Diseño de la interfaz de programación de aplicaciones",
    ],
    [
      "Configuración del entorno de desarrollo",
      "Implementación del módulo de autenticación",
      "Implementación del registro de pacientes",
      "Revisión del avance con el supervisor",
    ],
  ],
  [
    ["Implementación de la agenda de citas", "Implementación de la reprogramación de citas", "Implementación de recordatorios", "Pruebas del módulo de citas"],
    ["Implementación del expediente clínico", "Implementación de signos vitales", "Implementación de diagnósticos", "Pruebas del expediente clínico"],
    ["Implementación de recetas médicas", "Implementación de órdenes de laboratorio", "Implementación de reportes médicos", "Revisión de código con el equipo"],
    ["Pruebas de integración", "Corrección de defectos", "Optimización de consultas", "Demostración del avance a la dirección"],
  ],
  [
    ["Implementación del portal del paciente", "Implementación de la consulta de resultados", "Implementación de notificaciones", "Pruebas del portal del paciente"],
    ["Implementación de la bitácora de auditoría", "Implementación de respaldos automáticos", "Pruebas de seguridad", "Corrección de vulnerabilidades"],
    ["Pruebas de aceptación con admisión", "Pruebas de aceptación con médicos", "Corrección de observaciones", "Pruebas de rendimiento"],
    ["Preparación del ambiente de producción", "Migración de datos de pacientes", "Validación de datos migrados", "Revisión final con el supervisor"],
  ],
  [
    ["Elaboración del manual de usuario", "Elaboración del manual técnico", "Capacitación al personal de admisión", "Capacitación al personal médico"],
    ["Puesta en producción piloto", "Acompañamiento a usuarios en producción", "Atención de incidencias", "Ajustes posteriores a la puesta en producción"],
    ["Evaluación del uso del sistema", "Medición de indicadores de atención", "Elaboración del informe de resultados", "Presentación de resultados a la dirección"],
    ["Transferencia de conocimiento al área de informática", "Entrega de código y documentación", "Elaboración de recomendaciones", "Cierre del proyecto"],
  ],
];

// ── Plantillas de contenido (se repiten con el nombre de cada actividad) ──

export const MARCOS: { texto: string; cita: DatosCitaApa }[] = [
  {
    texto:
      "La ingeniería de requerimientos es el proceso de descubrir, analizar, documentar y verificar los servicios y las restricciones de un sistema. Su aplicación sistemática reduce la ambigüedad y permite que el equipo construya una solución alineada con las necesidades reales de la organización.",
    cita: cita({ autores: [{ apellidos: "Sommerville", iniciales: "I." }], anio: "2016", titulo: "Ingeniería de software", edicion: "10", editorial: "Pearson Educación" }),
  },
  {
    texto:
      "La dirección de proyectos es la aplicación de conocimientos, habilidades, herramientas y técnicas a las actividades de un proyecto para cumplir con sus requisitos. La planificación, el seguimiento y el control permiten entregar resultados dentro del alcance, el tiempo y el costo acordados.",
    cita: cita({
      autorInstitucional: "Project Management Institute",
      autores: [{ apellidos: "", iniciales: "" }],
      anio: "2017",
      titulo: "Guía de los fundamentos para la dirección de proyectos (Guía del PMBOK)",
      edicion: "6",
      editorial: "Project Management Institute",
    }),
  },
  {
    texto:
      "El diseño de software traduce los requerimientos en una representación del sistema que puede evaluarse antes de construirlo. Un buen diseño establece la arquitectura, las estructuras de datos y las interfaces, y facilita la calidad, el mantenimiento y la evolución del producto.",
    cita: cita({
      autores: [
        { apellidos: "Pressman", iniciales: "R. S." },
        { apellidos: "Maxim", iniciales: "B. R." },
      ],
      anio: "2019",
      titulo: "Ingeniería de software: Un enfoque práctico",
      edicion: "9",
      editorial: "McGraw-Hill",
    }),
  },
  {
    texto:
      "Una base de datos es una colección de datos relacionados que representa un aspecto del mundo real. Su diseño mediante modelos conceptuales, lógicos y físicos garantiza la integridad de la información y el acceso eficiente a ella por parte de las aplicaciones.",
    cita: cita({
      autores: [
        { apellidos: "Elmasri", iniciales: "R." },
        { apellidos: "Navathe", iniciales: "S. B." },
      ],
      anio: "2007",
      titulo: "Fundamentos de sistemas de bases de datos",
      edicion: "5",
      editorial: "Pearson Educación",
    }),
  },
  {
    texto:
      "La usabilidad es la medida en que un sistema puede ser utilizado por usuarios específicos para alcanzar sus objetivos con eficacia, eficiencia y satisfacción. Los prototipos y las pruebas con usuarios permiten detectar problemas de interacción antes de la implementación.",
    cita: cita({ autores: [{ apellidos: "Nielsen", iniciales: "J." }], anio: "1993", titulo: "Usability engineering", editorial: "Morgan Kaufmann" }),
  },
  {
    texto:
      "Las pruebas de software son el proceso de ejecutar un programa con la intención de encontrar errores. Una estrategia de pruebas planificada, que combina pruebas unitarias, de integración y de aceptación, aumenta la confiabilidad del sistema antes de su puesta en producción.",
    cita: cita({
      autores: [
        { apellidos: "Myers", iniciales: "G. J." },
        { apellidos: "Sandler", iniciales: "C." },
        { apellidos: "Badgett", iniciales: "T." },
      ],
      anio: "2012",
      titulo: "The art of software testing",
      edicion: "3",
      editorial: "Wiley",
    }),
  },
];

/** Marcos teóricos que corresponden a cada período (análisis, diseño, desarrollo, desarrollo, pruebas e implantación). */
export const MARCOS_POR_PERIODO = [
  [0, 1],
  [2, 3, 4],
  [2, 3, 5],
  [3, 2, 5],
  [5, 1],
];

export const DESCRIPCIONES: string[][] = [
  [
    "El pasante llevó a cabo la actividad de {actividad} como parte del proyecto {proyecto}. Al iniciar, revisó con el supervisor los objetivos de la actividad, los entregables esperados y los criterios con los que se evaluaría el resultado, y organizó el trabajo en tareas diarias para cumplir con la planificación de la semana.",
    "Posteriormente reunió la información necesaria: consultó la documentación existente, revisó los registros del área involucrada y conversó con los usuarios que participan en el proceso. Con esa información identificó las condiciones que debía considerar, las restricciones técnicas del entorno de la empresa y las dependencias con otras actividades del cronograma. También elaboró una lista de preguntas para aclarar con el supervisor los puntos que no estaban documentados y registró las respuestas obtenidas en la bitácora del proyecto.",
    "A continuación ejecutó el trabajo técnico de la actividad, documentó cada decisión en la bitácora del proyecto y elaboró los artefactos correspondientes. Cuando encontró inconsistencias, las registró, propuso alternativas de solución y las discutió con el supervisor antes de aplicarlas, con el fin de evitar cambios costosos en las etapas siguientes.",
    "Finalmente revisó el resultado con el supervisor empresarial, incorporó las observaciones recibidas y dejó la versión final disponible en el repositorio del proyecto, junto con un resumen de los hallazgos y de las tareas pendientes para la siguiente semana.",
  ],
  [
    "El pasante realizó la actividad de {actividad} del proyecto {proyecto}, siguiendo el plan acordado con el supervisor al inicio de la semana. Primero definió el orden de trabajo, estimó el tiempo de cada tarea y preparó las herramientas que utilizaría, de modo que pudiera reportar avances verificables cada día.",
    "Luego analizó la situación actual del área involucrada mediante la observación del trabajo diario y la revisión de los formatos que utiliza el personal. Registró las necesidades más frecuentes, los problemas recurrentes y las reglas del negocio que el sistema deberá respetar, y las clasificó según su prioridad e impacto. Además, comparó la situación observada con las buenas prácticas estudiadas en la carrera para identificar oportunidades de mejora que pudieran incorporarse en la solución propuesta.",
    "Con base en ese análisis elaboró la propuesta técnica de la actividad, la verificó contra los requerimientos aprobados y preparó los documentos de soporte. Además, coordinó una breve sesión con dos usuarios clave para comprobar que la propuesta resolviera sus necesidades y anotó sus sugerencias de mejora.",
    "Por último presentó el resultado al supervisor, explicó las decisiones tomadas y ajustó los detalles señalados. La actividad quedó documentada en la bitácora y su resultado sirvió como insumo para las actividades programadas en la semana siguiente.",
  ],
  [
    "El pasante desarrolló la actividad de {actividad} correspondiente al proyecto {proyecto}. Antes de comenzar revisó los artefactos elaborados en las semanas anteriores, confirmó con el supervisor el alcance de la tarea y preparó una lista de verificación con los elementos que debía entregar al finalizar la semana.",
    "En la primera parte de la semana construyó la solución técnica de forma incremental, verificando cada componente antes de continuar con el siguiente. Utilizó las convenciones de código y de documentación definidas por el equipo, y registró en el control de versiones cada cambio con una descripción clara de su propósito. Cuando una decisión técnica afectaba a otros componentes, la consultó con el supervisor y documentó la alternativa elegida junto con su justificación.",
    "Después ejecutó pruebas para comprobar el funcionamiento esperado, documentó los defectos encontrados y los corrigió en orden de prioridad. También revisó el rendimiento de las operaciones más frecuentes y realizó ajustes menores para mejorar los tiempos de respuesta percibidos por los usuarios.",
    "Al cierre de la semana mostró el resultado al supervisor en el ambiente de pruebas, atendió sus preguntas y registró las observaciones para incorporarlas. Con ello la actividad quedó concluida y lista para integrarse con los demás módulos del sistema.",
  ],
  [
    "El pasante ejecutó la actividad de {actividad} dentro del proyecto {proyecto}, en coordinación con el supervisor y con el personal del área usuaria. Inició con una reunión breve para acordar los objetivos de la semana, los participantes y la forma en que se validarían los resultados obtenidos.",
    "A continuación preparó los materiales necesarios, revisó la información de las semanas anteriores y organizó las sesiones de trabajo con los usuarios. En cada sesión registró las observaciones, los tiempos empleados y las dificultades encontradas, con el fin de contar con evidencia objetiva del desempeño del sistema. Al final de cada sesión resumió los acuerdos alcanzados con los participantes y confirmó con ellos los siguientes pasos, de modo que ninguna observación quedara sin responsable asignado.",
    "Con los resultados obtenidos analizó las causas de las observaciones más relevantes, propuso soluciones concretas y priorizó su atención junto con el supervisor. Las correcciones de menor complejidad las aplicó en la misma semana y las demás quedaron programadas en el cronograma del proyecto.",
    "Finalmente elaboró un resumen de lo realizado, actualizó la documentación correspondiente y la compartió con el equipo. El supervisor validó los resultados y aprobó continuar con las actividades previstas para la semana siguiente.",
  ],
];

export const CONCLUSIONES: string[] = [
  "La actividad de {actividad} produjo un resultado verificable y alineado con los objetivos del proyecto. Las decisiones documentadas y la validación con el supervisor reducen el riesgo de cambios tardíos y aportan una base técnica confiable para las siguientes actividades del cronograma.",
  "Con la actividad de {actividad} se obtuvo un entregable validado por el supervisor y por los usuarios clave del área. El registro de los hallazgos y de las decisiones permite dar trazabilidad al proyecto y facilita la continuidad de las etapas posteriores del desarrollo.",
  "La ejecución de {actividad} permitió comprobar el funcionamiento esperado de la solución y corregir de manera oportuna los defectos encontrados. Las pruebas realizadas y la documentación generada respaldan técnicamente la calidad del componente y su integración con el resto del sistema.",
  "Los resultados de {actividad} evidencian que la solución responde a las necesidades del área usuaria. Las observaciones recibidas se atendieron o se programaron con prioridad, lo que fortalece la confiabilidad del sistema y prepara las condiciones para su uso en producción.",
];

// ── Comentarios del asesor para el decanato (cada respuesta con al menos 40 palabras) ──

export function comentariosDecanato(periodo: number, nombre: string) {
  return {
    respuestas: {
      retos: `En el período ${periodo}, ${nombre} manifiesta que lo más retador ha sido organizar su tiempo entre las actividades técnicas y las reuniones con los usuarios. También le ha exigido esfuerzo comprender con rapidez las reglas del negocio de la institución y traducirlas en requerimientos claros y verificables.`,
      mejora: `El egresado considera que debe fortalecer su comunicación oral al presentar avances ante la jefatura, así como su seguridad para plantear dudas en el momento oportuno. Reconoce que mejorar la estimación de tiempos le permitirá cumplir con mayor holgura las entregas semanales del cronograma acordado con el supervisor.`,
      ambiente: `Se siente bien integrado en la empresa, describe un ambiente laboral ordenado, respetuoso y orientado a resultados. Ha participado en reuniones del equipo de informática y en actividades de coordinación con otras áreas, lo que le ha permitido integrarse laboral y socialmente sin dificultades durante este período.`,
      supervisor: `La relación con el supervisor es cercana y profesional. El supervisor revisa sus avances cada semana, le brinda retroalimentación concreta y le orienta en la toma de decisiones técnicas, por lo que el egresado lo percibe como un verdadero mentor dentro de su proceso de formación profesional.`,
      formacion: `El egresado está aplicando conocimientos de ingeniería de requerimientos, bases de datos, programación orientada a objetos y gestión de proyectos adquiridos en la carrera. Señala que las asignaturas de análisis y diseño de sistemas le han sido especialmente útiles para documentar y modelar la solución propuesta.`,
      acciones: `Como asesor, mantendré reuniones de seguimiento semanales con el egresado, revisaré oportunamente cada semana enviada y le orientaré en la redacción técnica de sus reportes. Además, reforzaré la planificación de sus actividades para asegurar que cumpla la extensión y la calidad esperadas en cada informe.`,
    },
    general: `El desempeño del egresado durante el período ${periodo} es satisfactorio y cumple con lo planificado en su cronograma.`,
  };
}

export function notaSemanal(semana: number) {
  return {
    retos: `En la semana ${semana} comentó que le ha costado coordinar el tiempo de los usuarios para las sesiones de trabajo.`,
    supervisor: "El supervisor revisó sus avances y le dio retroalimentación puntual sobre la documentación.",
    acciones: "Le sugerí preparar una agenda previa para cada reunión con los usuarios.",
  };
}
