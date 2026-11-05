// Datos de diseño de las partes de la ficha que todavía no tienen funcionamiento (entregas posteriores).
// Sirven para mostrar en el constructor cómo se configurarán; no se guardan en la definición de la ficha.
// Cuando una parte se implemente, sus datos pasan al formato de la definición (tipos.ts) y salen de aquí.
import type { ClaveElemento } from "./tipos";

export interface CampoElemento {
  nombre: string;
  tipo: "texto" | "texto largo" | "fecha" | "archivo" | "imagen" | "mapa" | "lista" | "selección";
  obligatorio: boolean;
}

/** Campos que pide hoy cada elemento en el asistente (columnas de la fase 1). */
export const CAMPOS_ELEMENTO: Record<ClaveElemento, CampoElemento[]> = {
  portada: [
    { nombre: "Título del trabajo", tipo: "texto", obligatorio: true },
    { nombre: "Nombres y apellidos", tipo: "texto", obligatorio: true },
    { nombre: "Número de carnet", tipo: "texto", obligatorio: true },
    { nombre: "Título al que se opta", tipo: "texto", obligatorio: true },
    { nombre: "Mes de envío", tipo: "fecha", obligatorio: true },
  ],
  empresa: [
    { nombre: "Nombre de la empresa o institución", tipo: "texto", obligatorio: true },
    { nombre: "Área de la empresa", tipo: "texto", obligatorio: true },
    { nombre: "Descripción de la empresa", tipo: "texto largo", obligatorio: true },
    { nombre: "Antecedentes de la institución", tipo: "texto largo", obligatorio: true },
    { nombre: "Dirección de la empresa o sucursal", tipo: "texto", obligatorio: true },
    { nombre: "Organigrama", tipo: "imagen", obligatorio: true },
    { nombre: "Mapa de ubicación", tipo: "mapa", obligatorio: true },
  ],
  supervisor: [
    { nombre: "Título académico", tipo: "texto", obligatorio: false },
    { nombre: "Nombres y apellidos", tipo: "texto", obligatorio: true },
    { nombre: "Especialidad", tipo: "texto", obligatorio: false },
    { nombre: "Cargo", tipo: "texto", obligatorio: true },
    { nombre: "Teléfono", tipo: "texto", obligatorio: true },
    { nombre: "Correo", tipo: "texto", obligatorio: true },
    { nombre: "Firma", tipo: "imagen", obligatorio: false },
  ],
  carta: [
    { nombre: "PDF de la carta", tipo: "archivo", obligatorio: true },
    { nombre: "Fecha de emisión", tipo: "fecha", obligatorio: true },
    { nombre: "Fecha de inicio", tipo: "fecha", obligatorio: true },
    { nombre: "Fecha de fin", tipo: "fecha", obligatorio: true },
    { nombre: "Nombre y cargo del emisor", tipo: "texto", obligatorio: true },
    { nombre: "Firma digital del emisor", tipo: "imagen", obligatorio: true },
  ],
  cronograma: [
    { nombre: "Subperíodo", tipo: "selección", obligatorio: true },
    { nombre: "Título de la actividad", tipo: "texto", obligatorio: true },
    { nombre: "Descripción de la actividad", tipo: "texto largo", obligatorio: true },
  ],
  texto: [{ nombre: "Texto", tipo: "texto largo", obligatorio: true }],
  actores: [
    { nombre: "Patrocinador", tipo: "texto largo", obligatorio: true },
    { nombre: "Beneficiario", tipo: "texto largo", obligatorio: true },
    { nombre: "Ejecutor", tipo: "texto largo", obligatorio: true },
    { nombre: "Financista", tipo: "texto largo", obligatorio: true },
  ],
  objetivos: [
    { nombre: "Objetivo general", tipo: "texto largo", obligatorio: true },
    { nombre: "Objetivos específicos (título y descripción)", tipo: "lista", obligatorio: true },
  ],
  documentos: [{ nombre: "Un archivo PDF por documento", tipo: "archivo", obligatorio: true }],
};

/** Apartados del informe final como los arma hoy el sistema (src/lib/informeFinal.ts). */
export const APARTADOS_INFORME_FINAL: { nombre: string; origen: "sistema" | "egresado"; nota: string }[] = [
  { nombre: "Portada", origen: "sistema", nota: "Datos del trabajo, del egresado y de la institución." },
  { nombre: "Autoridades académicas", origen: "sistema", nota: "Rector, decano y demás autoridades." },
  { nombre: "Agradecimientos", origen: "egresado", nota: "Opcional: hasta 4 párrafos, 350 palabras." },
  { nombre: "Índice de contenidos", origen: "sistema", nota: "Se genera con los apartados." },
  { nombre: "Índice de imágenes", origen: "sistema", nota: "Se genera con las imágenes de las actividades." },
  { nombre: "Introducción", origen: "egresado", nota: "4 párrafos de 20 a 70 palabras." },
  { nombre: "Descripción de la empresa", origen: "sistema", nota: "Sale de los datos empresariales de la propuesta." },
  { nombre: "Actividades realizadas", origen: "sistema", nota: "Todas las actividades aprobadas, por período." },
  { nombre: "Conclusiones", origen: "sistema", nota: "Conclusiones técnicas de las actividades." },
  { nombre: "Glosario de términos", origen: "egresado", nota: "Opcional: hasta 40 términos." },
  { nombre: "Carta de finalización satisfactoria", origen: "egresado", nota: "Imagen de la carta emitida por la empresa." },
  { nombre: "Anexos", origen: "sistema", nota: "Cronograma e imágenes adicionales." },
];

/** Documentos con portada propia: cada uno podrá tener su logotipo y sus textos fijos. */
export const PORTADAS = [
  { documento: "Propuesta", logotipo: "Logotipo institucional", textos: ["Universidad", "Facultad", "Título", "Modalidad", "Fecha"] },
  { documento: "Informe de período", logotipo: "Logotipo institucional", textos: ["Universidad", "Facultad", "Número de informe", "Empresa", "Período"] },
  { documento: "Informe final", logotipo: "Logotipo de la facultad", textos: ["Universidad", "Facultad", "Título", "Empresa", "Asesor", "Fecha"] },
];

export const ROLES_FICHA = [
  { clave: "super", nombre: "Superadministrador" },
  { clave: "admin_dec", nombre: "Admin. de decanato" },
  { clave: "coord", nombre: "Coordinador" },
  { clave: "asesor", nombre: "Asesor" },
] as const;

/** Quién realiza cada acción del proceso hoy (fase 1). */
export const ACCIONES_PROCESO: { clave: string; nombre: string; etapa: string; rol: (typeof ROLES_FICHA)[number]["clave"] }[] = [
  { clave: "empresa", nombre: "Aprobar empresa nueva o datos modificados", etapa: "Propuesta", rol: "admin_dec" },
  { clave: "asignar_coord", nombre: "Asignar la propuesta a un coordinador", etapa: "Propuesta", rol: "admin_dec" },
  { clave: "asignar", nombre: "Asignar asesor", etapa: "Propuesta", rol: "coord" },
  { clave: "dictamen", nombre: "Revisar y aprobar la propuesta", etapa: "Propuesta", rol: "asesor" },
  { clave: "inicio", nombre: "Subir dictámenes y dar inicio al plan de trabajo", etapa: "Ejecución", rol: "coord" },
  { clave: "contacto", nombre: "Informe de primer contacto", etapa: "Ejecución", rol: "asesor" },
  { clave: "revision", nombre: "Revisar los subperíodos", etapa: "Ejecución", rol: "asesor" },
  { clave: "cambios", nombre: "Autorizar cambios al cronograma", etapa: "Ejecución", rol: "asesor" },
  { clave: "informe", nombre: "Aprobar el informe de período", etapa: "Ejecución", rol: "asesor" },
  { clave: "comentarios", nombre: "Recibir los comentarios del asesor", etapa: "Ejecución", rol: "admin_dec" },
  { clave: "final", nombre: "Aprobar el informe final", etapa: "Cierre", rol: "asesor" },
];

export interface DisenoPresentacion {
  requisitos: string[];
  documentos: string[];
  participantes: string[];
  duracionMinutos: number;
  evaluacion: string;
}

/** Punto de partida por modalidad para las presentaciones; cada ficha podrá ajustarlo. */
export function presentacionPorDefecto(tipo: "revision" | "publica", modalidad: string): DisenoPresentacion {
  const pasantia = modalidad === "pasantia";
  if (tipo === "revision") {
    return {
      requisitos: ["Informe final aprobado por el asesor", pasantia ? "Carta de finalización verificada" : "Producto o resultados entregados"],
      documentos: ["Informe final en PDF", "Presentación (diapositivas)"],
      participantes: ["Egresado", "Asesor", "Coordinador"],
      duracionMinutos: 30,
      evaluacion: "Observaciones del asesor y del coordinador; si las hay, se corrigen antes de la presentación pública.",
    };
  }
  return {
    requisitos: ["Presentación de revisión aprobada", "Pago de derechos de graduación"],
    documentos: ["Informe final corregido", pasantia ? "Constancia de la empresa" : "Manual o documentación del producto"],
    participantes: ["Egresado", "Jurado evaluador (3)", "Asesor", "Público"],
    duracionMinutos: 45,
    evaluacion: "Rúbrica del jurado; nota mínima de aprobación 7.0.",
  };
}

/** Partes del informe de período de un proyecto (documento "Ejemplo para plantilla proyecto"). Redacción por revisar. */
export const APARTADOS_INFORME_PERIODO_PROYECTO: { nombre: string; detalle: string }[] = [
  { nombre: "Portada", detalle: "la de pasantía, con los datos del proyecto" },
  { nombre: "Generalidades de la empresa o institución", detalle: "" },
  { nombre: "Cronograma y presupuesto del período", detalle: "la parte del plan individual que cae en el período; montos solo en lo ejecutado" },
  { nombre: "Informe de avances", detalle: "por objetivo, macroactividad y actividad: avance (%), fecha esperada y resultados" },
  { nombre: "Resultados obtenidos", detalle: "estado de cada nivel y porcentaje concluido y pendiente" },
  { nombre: "Resultados por actividad", detalle: "cada uno con su anexo" },
  { nombre: "Anexos", detalle: "evidencias, en las páginas que hagan falta" },
];
