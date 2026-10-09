// Reglas de contenido de una actividad registrada. Módulo puro: se usa en servidor y en cliente.
import { leerDatosCita, validarCitaApa } from "@/lib/citaApa";
import { validarOrigenImagen } from "@/lib/fuenteImagen";

// 20 páginas por informe en 30 días equivalen a unas 0.66 páginas diarias (alrededor de 250 palabras con el formato oficial).
export const DESCRIPTOR_MIN_PALABRAS = 200;
export const DESCRIPTOR_MAX_PALABRAS = 300;
export const CONCLUSION_MIN_PALABRAS = 40;
export const CONCLUSION_MAX_PALABRAS = 60;

export function contarPalabras(texto: string): number {
  return texto
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/** Sin espacios dobles ni líneas en blanco: los párrafos se separan con un solo salto de línea. */
export function normalizarTexto(texto: string) {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Párrafos de un texto registrado (uno por línea). */
export function parrafosDe(texto: string | null | undefined) {
  return (texto || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** La descripción debe nombrar al pasante como sujeto de ejecución (por ejemplo: «El pasante elaboró...»). */
export function mencionaPasante(descriptor: string | null | undefined) {
  return /\b(el|la)\s+pasante\b/i.test(descriptor || "");
}

export function terminaEnPunto(texto: string) {
  return /\.["”»)]?$/.test(texto.trim());
}

export interface ContenidoRegistro {
  marcoTeorico?: string | null;
  citaApa?: string | null;
  citaApaDatos?: unknown;
  descriptor?: string | null;
  conclusionTecnica?: string | null;
  imagenUrl?: string | null;
  leyendaImagen?: string | null;
  imagenOrigen?: string | null;
  imagenFuente?: unknown;
}

/** Reglas de contenido obligatorio de una actividad; devuelve la lista de problemas (vacía si es válida). */
export function validarContenidoRegistro(r: ContenidoRegistro): string[] {
  const problemas: string[] = [];
  if (!r.marcoTeorico || r.marcoTeorico.trim().length < 10) {
    problemas.push("Debe redactar el marco teórico correspondiente a la actividad realizada.");
  } else if (!terminaEnPunto(r.marcoTeorico)) {
    problemas.push("El marco teórico debe terminar con punto.");
  }

  const datosCita = leerDatosCita(r.citaApaDatos);
  if (datosCita) {
    const problemasCita = validarCitaApa(datosCita);
    if (problemasCita.length > 0) problemas.push(`Referencia APA 7: ${problemasCita[0]}`);
  } else if (!r.citaApa || r.citaApa.trim().length < 5) {
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
    } else if (!terminaEnPunto(r.descriptor)) {
      problemas.push("La descripción debe terminar con punto.");
    }
  }
  // Toda actividad lleva su imagen de soporte principal, con pie de imagen y origen (propia o con la fuente citada).
  if (!r.imagenUrl) {
    problemas.push("Debe adjuntar la imagen de soporte principal.");
  } else {
    if (!r.leyendaImagen || r.leyendaImagen.trim().length < 3) problemas.push("La imagen de soporte debe llevar su pie de imagen.");
    const problemasOrigen = validarOrigenImagen(r.imagenOrigen, r.imagenFuente);
    if (problemasOrigen.length > 0) problemas.push(`Imagen de soporte principal: ${problemasOrigen[0]}`);
  }
  if (!r.conclusionTecnica) {
    problemas.push("Debe redactar la conclusión técnica de la actividad.");
  } else {
    const n = contarPalabras(r.conclusionTecnica);
    if (n < CONCLUSION_MIN_PALABRAS || n > CONCLUSION_MAX_PALABRAS) {
      problemas.push(
        `La conclusión técnica debe tener entre ${CONCLUSION_MIN_PALABRAS} y ${CONCLUSION_MAX_PALABRAS} palabras (actualmente tiene ${n}).`
      );
    } else if (!terminaEnPunto(r.conclusionTecnica)) {
      problemas.push("La conclusión técnica debe terminar con punto.");
    }
  }
  return problemas;
}
