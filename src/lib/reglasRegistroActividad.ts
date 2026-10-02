// Reglas de contenido de una actividad registrada. Módulo puro: se usa en servidor y en cliente.

export const DESCRIPTOR_MIN_PALABRAS = 401;
export const DESCRIPTOR_MAX_PALABRAS = 500;
export const CONCLUSION_MIN_PALABRAS = 15;
export const CONCLUSION_MAX_PALABRAS = 200;

export function contarPalabras(texto: string): number {
  return texto
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export interface ContenidoRegistro {
  marcoTeorico?: string | null;
  citaApa?: string | null;
  descriptor?: string | null;
  conclusionTecnica?: string | null;
  imagenUrl?: string | null;
  leyendaImagen?: string | null;
}

/** Reglas de contenido obligatorio de una actividad; devuelve la lista de problemas (vacía si es válida). */
export function validarContenidoRegistro(r: ContenidoRegistro): string[] {
  const problemas: string[] = [];
  if (!r.marcoTeorico || r.marcoTeorico.trim().length < 10) {
    problemas.push("Debe redactar el marco teórico correspondiente a la actividad realizada.");
  }
  if (!r.citaApa || r.citaApa.trim().length < 5) {
    problemas.push("Debe incluir la cita/referencia en formato APA 7.");
  }
  if (!r.descriptor) {
    problemas.push("Debe describir la actividad realizada por el pasante.");
  } else {
    const n = contarPalabras(r.descriptor);
    if (n < DESCRIPTOR_MIN_PALABRAS || n > DESCRIPTOR_MAX_PALABRAS) {
      problemas.push(
        `La descripción debe tener entre ${DESCRIPTOR_MIN_PALABRAS} y ${DESCRIPTOR_MAX_PALABRAS} palabras (actualmente tiene ${n}).`
      );
    }
  }
  if (r.imagenUrl && (!r.leyendaImagen || r.leyendaImagen.trim().length < 3)) {
    problemas.push("La imagen de soporte debe llevar su pie de imagen.");
  }
  if (!r.conclusionTecnica) {
    problemas.push("Debe redactar la conclusión técnica de la actividad.");
  } else {
    const n = contarPalabras(r.conclusionTecnica);
    if (n < CONCLUSION_MIN_PALABRAS || n > CONCLUSION_MAX_PALABRAS) {
      problemas.push(
        `La conclusión técnica debe tener entre ${CONCLUSION_MIN_PALABRAS} y ${CONCLUSION_MAX_PALABRAS} palabras (actualmente tiene ${n}).`
      );
    }
  }
  return problemas;
}
