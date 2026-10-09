// Ejemplos de ayuda para el registro de actividades. Cada ejemplo admite un video de apoyo (videoUrl) cuando esté disponible.
// Más adelante los ejemplos se categorizarán por carrera.
import {
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
} from "@/lib/reglasRegistroActividad";

export interface EjemploCampo {
  /** Indicación que se muestra antes del ejemplo. */
  introduccion?: string;
  titulo: string;
  /** Un párrafo por línea. */
  texto: string;
  referencia?: string;
  nota?: string;
  videoUrl?: string | null;
}

export const AVISO_EJEMPLOS = "Aviso: estos ejemplos más adelante se mostrarán categorizados por carrera.";

export const EJEMPLOS_REGISTRO: Record<"marcoTeorico" | "descripcion" | "imagen" | "conclusion", EjemploCampo> = {
  marcoTeorico: {
    introduccion: "El marco teórico fundamenta la actividad realizada; no describe lo que usted hizo.",
    titulo: "Título de actividad: Elaboración de prototipos de interfaz",
    texto:
      "Un prototipo de interfaz es una representación preliminar de las pantallas de un sistema que permite validar su diseño y su navegación antes de iniciar la programación. El prototipado de baja fidelidad se utiliza para recoger la retroalimentación del equipo de forma temprana, con un costo menor de modificación que el de un producto ya construido.",
    referencia: "Pressman, R. S. (2010). Ingeniería del software: Un enfoque práctico (7.ª ed.). McGraw-Hill.",
  },
  descripcion: {
    titulo: "Título de actividad: Elaboración de prototipos de interfaz",
    texto: [
      "El pasante elaboró los prototipos de baja fidelidad de las pantallas de inicio de sesión y de consulta de inventario del sistema de control de bodega. Para ello revisó con el supervisor los requerimientos funcionales aprobados, identificó los datos que debía mostrar cada pantalla y definió el flujo de navegación entre ellas.",
      "Con esa información dibujó cada pantalla en Figma, ubicó los campos de búsqueda, los filtros por categoría y la tabla de resultados, y agregó los mensajes de validación para los campos obligatorios. También preparó una versión navegable que permitió recorrer el flujo completo desde el inicio de sesión hasta la consulta de un producto. Además, verificó que los textos y botones respetaran la guía de estilo de la empresa.",
      "Posteriormente presentó los prototipos al equipo de desarrollo y al supervisor en una reunión de revisión. Registró once observaciones, entre ellas la necesidad de mostrar la existencia mínima de cada producto y de simplificar el filtro por fecha de ingreso. Clasificó las observaciones por prioridad y ajustó la distribución de la pantalla de consulta; las observaciones restantes quedaron programadas para la siguiente iteración del diseño.",
      "Finalmente actualizó la versión navegable, documentó los cambios en la bitácora del proyecto y entregó al equipo de desarrollo los prototipos aprobados, junto con la lista de componentes reutilizables que se emplearán en la programación de la interfaz.",
    ].join("\n"),
    nota: `Redacte lo que usted, como pasante, realizó y en tiempo pasado. Evite muletillas como "Durante". El texto debe tener entre ${DESCRIPTOR_MIN_PALABRAS} y ${DESCRIPTOR_MAX_PALABRAS} palabras y terminar con punto.`,
  },
  imagen: {
    titulo: "Ejemplo de imagen de soporte y pie de imagen",
    texto: [
      "Adjunte una imagen que evidencie lo realizado, por ejemplo una captura del prototipo elaborado. La imagen se recorta a 5 x 5 cm.",
      "Pie de imagen de ejemplo: Prototipo de la pantalla de consulta de inventario.",
      "Si la imagen es suya, elija Autoría propia: bajo la imagen aparecerá «Nota. Elaboración propia.». Si la obtuvo de internet o de otra fuente, elija Fuente externa e indique el autor, el año, el título y el sitio: bajo la imagen aparecerá, por ejemplo, «Nota. Tomado de Guía de diseño de formularios, por Microsoft, 2023, Microsoft Learn (https://learn.microsoft.com).»",
    ].join("\n"),
    nota: "Sin pie de imagen y sin indicar su origen no es posible adjuntarla.",
  },
  conclusion: {
    titulo: "Título de actividad: Elaboración de prototipos de interfaz",
    texto:
      "El prototipado de baja fidelidad permitió identificar, antes de la programación, dos inconsistencias en el flujo de consulta de inventario y corregirlas sin costo de desarrollo. Validar las pantallas con el supervisor en una etapa temprana mejoró la precisión de los requerimientos que se implementarán.",
    nota: `Indique el resultado técnico obtenido y su fundamento, entre ${CONCLUSION_MIN_PALABRAS} y ${CONCLUSION_MAX_PALABRAS} palabras. No incluya opiniones ni valoraciones personales.`,
  },
};
