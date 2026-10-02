// Métrica de extensión del informe: estimación de páginas del documento (formato oficial) y ritmo esperado.
// Módulo puro: se usa en servidor y en cliente.
import { contarPalabras } from "@/lib/reglasRegistroActividad";

/** Mínimo de páginas por informe (marco teórico, desarrollo, imagen de soporte y conclusión técnica; sin portada ni extras). */
export const PAGINAS_MINIMAS_INFORME = 20;

// Hoja carta, margen izquierdo 3 cm y 2.54 cm en los demás, Times New Roman 12, interlineado 1.5 (calibrado con Word).
const LINEAS_POR_PAGINA = 31;
const PALABRAS_POR_LINEA = 14;
const LINEAS_ENCABEZADO_ACTIVIDAD = 2;
const LINEAS_SUBTITULO = 2;
const LINEAS_IMAGEN = 10; // título del apartado, imagen de 5 cm y pie de imagen

export interface ContenidoEstimable {
  marcoTeorico?: string | null;
  citaApa?: string | null;
  descriptor?: string | null;
  conclusionTecnica?: string | null;
  imagenUrl?: string | null;
}

function lineasTexto(texto: string | null | undefined) {
  if (!texto || !texto.trim()) return 0;
  return Math.ceil(contarPalabras(texto) / PALABRAS_POR_LINEA) + 0.3;
}

/** Líneas que ocupa una actividad en el documento: encabezado, marco teórico, desarrollo, soporte y conclusión. */
export function lineasActividad(r: ContenidoEstimable) {
  return (
    LINEAS_ENCABEZADO_ACTIVIDAD +
    LINEAS_SUBTITULO * 4 +
    lineasTexto(r.marcoTeorico) +
    lineasTexto(r.citaApa) +
    lineasTexto(r.descriptor) +
    (r.imagenUrl ? LINEAS_IMAGEN : 0) +
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
