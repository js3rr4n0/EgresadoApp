// Ejemplos de ayuda para el registro de actividades. Cada ejemplo admite un video de apoyo (videoUrl) cuando esté disponible.

export interface EjemploCampo {
  titulo: string;
  texto: string;
  referencia?: string;
  nota?: string;
  videoUrl?: string | null;
}

export const EJEMPLOS_REGISTRO: Record<"marcoTeorico" | "descripcion" | "imagen" | "conclusion", EjemploCampo> = {
  marcoTeorico: {
    titulo: "Ejemplo de marco teórico (actividad: Elaboración de prototipos de interfaz)",
    texto:
      "Un prototipo de interfaz es una representación preliminar de las pantallas de un sistema que permite validar su diseño y su navegación antes de iniciar la programación. El prototipado de baja fidelidad se utiliza para recoger la retroalimentación del equipo de forma temprana, con un costo menor de modificación que el de un producto ya construido.",
    referencia: "Pressman, R. S. (2010). Ingeniería del software: Un enfoque práctico (7.ª ed.). McGraw-Hill.",
    nota: "El marco teórico fundamenta la actividad realizada; no describe lo que usted hizo.",
  },
  descripcion: {
    titulo: "Ejemplo de descripción (redactada en tiempo pasado)",
    texto:
      "Durante la semana, el pasante elaboró los prototipos de baja fidelidad de las pantallas de inicio de sesión y de consulta de inventario. Para ello, revisó con el supervisor los requerimientos funcionales, definió el flujo de navegación entre pantallas y dibujó cada una de ellas en Figma. Posteriormente, presentó los prototipos al equipo de desarrollo, recopiló sus observaciones y ajustó la distribución de los campos de búsqueda...",
    nota: "Redacte lo que usted, como pasante, realizó y en tiempo pasado. El texto completo debe tener entre 401 y 500 palabras.",
  },
  imagen: {
    titulo: "Ejemplo de imagen de soporte y pie de imagen",
    texto:
      "Adjunte una imagen que evidencie lo realizado, por ejemplo una captura del prototipo elaborado. La imagen se recorta a 5 x 5 cm. Pie de imagen de ejemplo: Prototipo de la pantalla de consulta de inventario.",
    nota: "Sin pie de imagen no es posible adjuntarla.",
  },
  conclusion: {
    titulo: "Ejemplo de conclusión técnica",
    texto:
      "El prototipado de baja fidelidad permitió identificar, antes de la programación, dos inconsistencias en el flujo de consulta de inventario, lo que redujo el retrabajo del equipo de desarrollo. Se concluye que validar las pantallas con el supervisor en una etapa temprana mejora la calidad de los requerimientos que se implementan.",
    nota: "Indique el resultado técnico obtenido y su fundamento. No incluya opiniones ni valoraciones personales. Máximo 200 palabras.",
  },
};
