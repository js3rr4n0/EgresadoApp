// Métrica de extensión del informe: estimación de páginas del documento (formato oficial) y ritmo esperado.
// Módulo puro: se usa en servidor y en cliente.
import { contarPalabras, parrafosDe } from "@/lib/reglasRegistroActividad";

/** Mínimo de páginas por informe (marco teórico, desarrollo, imagen de soporte y conclusión técnica; sin portada ni extras). */
export const PAGINAS_MINIMAS_INFORME = 20;

// Hoja carta, margen izquierdo 3 cm y 2.54 cm en los demás, Times New Roman 12, interlineado 1.5 (calibrado con Word).
const LINEAS_POR_PAGINA = 31;
const PALABRAS_POR_LINEA = 14;
// Cada párrafo lleva 12 pt de espacio anterior y posterior; entre párrafos Word deja 12 pt (no los suma), poco más de
// media línea de 1.5 (20.7 pt). Verificado con Word: 4 actividades sin imagen = 4.96 páginas.
const LINEAS_ESPACIO_PARRAFO = 0.58;
const LINEAS_ENCABEZADO_ACTIVIDAD = 2;
const LINEAS_SUBTITULO = 2;
const LINEAS_FILA_IMAGENES = 9; // fila de imágenes de 5 cm (dos por fila) con su pie y la nota de origen

export interface ContenidoEstimable {
  marcoTeorico?: string | null;
  citaApa?: string | null;
  descriptor?: string | null;
  conclusionTecnica?: string | null;
  imagenUrl?: string | null;
  /** Imágenes de soporte adicionales a la principal (los anexos no cuentan). */
  imagenesAdicionales?: number;
}

function lineasTexto(texto: string | null | undefined) {
  return parrafosDe(texto).reduce((t, p) => t + Math.ceil(contarPalabras(p) / PALABRAS_POR_LINEA) + LINEAS_ESPACIO_PARRAFO, 0);
}

/** Líneas que ocupa una actividad en el documento: encabezado, marco teórico, desarrollo, soporte y conclusión. */
export function lineasActividad(r: ContenidoEstimable) {
  return (
    LINEAS_ENCABEZADO_ACTIVIDAD +
    LINEAS_SUBTITULO * 4 +
    lineasTexto(r.marcoTeorico) +
    lineasTexto(r.citaApa) +
    lineasTexto(r.descriptor) +
    (r.imagenUrl ? LINEAS_SUBTITULO + Math.ceil((1 + (r.imagenesAdicionales ?? 0)) / 2) * LINEAS_FILA_IMAGENES : 0) +
    lineasTexto(r.conclusionTecnica)
  );
}

export function estimarPaginas(registros: ContenidoEstimable[]) {
  const lineas = registros.reduce((total, r) => total + lineasActividad(r), 0);
  return Math.round((lineas / LINEAS_POR_PAGINA) * 10) / 10;
}

export type NivelRitmo = "adecuado" | "atencion" | "critico";

/** Compara las páginas logradas con las esperadas a la fecha según el tiempo transcurrido de la pasantía. */
export function nivelRitmo(paginas: number, esperadas: number): NivelRitmo {
  if (esperadas <= 0 || paginas >= esperadas) return "adecuado";
  return paginas >= esperadas * 0.75 ? "atencion" : "critico";
}
