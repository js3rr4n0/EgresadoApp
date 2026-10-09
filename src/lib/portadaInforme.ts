// Portada institucional de los informes de pasantía (formato "PORTADA INFORME FINAL"): la misma para el informe de cada
// período y para el informe final, ajustando el título, el período de realización y la fecha. Módulo puro: la usan la vista
// de impresión y el documento Word para que ambos coincidan.
import { tituloDocumentoInforme } from "@/lib/periodosPasantia";

const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

const CIUDAD = "SANTA ANA";

/** "20 DE ENERO DEL 2026" (fecha ISO). */
function fechaPortada(iso: string) {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return `${dia} DE ${MESES[mes - 1]} DEL ${anio}`;
}

export interface DatosPortada {
  /** Grupos de líneas de la portada en orden; entre grupos va un espacio. El logo va después del primer grupo. */
  encabezado: string[];
  grupos: string[][];
}

export interface EntradaPortada {
  numeroInforme: number;
  facultad: string | null | undefined;
  carrera: string | null | undefined;
  empresa: string | null | undefined;
  estudiante: string | null | undefined;
  carnet: string | null | undefined;
  /** Rango del período de realización (fechas ISO): la pasantía completa en el informe final, el período en los demás. */
  desde: string | null | undefined;
  hasta: string | null | undefined;
  /** Fecha de presentación (ISO) o, si aún no se presenta, la fecha actual. */
  fecha: string;
}

export function datosPortada(e: EntradaPortada): DatosPortada {
  const mayus = (t: string | null | undefined) => (t || "").trim().toUpperCase();
  const [anio, mes] = e.fecha.slice(0, 10).split("-").map(Number);
  return {
    encabezado: ["UNIVERSIDAD CATÓLICA DE EL SALVADOR", ...(e.facultad ? [mayus(e.facultad)] : [])],
    grupos: [
      [tituloDocumentoInforme(e.numeroInforme)],
      ["REALIZADA EN:", mayus(e.empresa) || "—"],
      ["PERÍODO DE REALIZACIÓN:", e.desde && e.hasta ? `DEL ${fechaPortada(e.desde)} AL ${fechaPortada(e.hasta)}` : "—"],
      ["PRESENTADO POR:", mayus(e.estudiante) || "—", ...(e.carnet ? [e.carnet.toUpperCase()] : [])],
      // El título académico que otorga cada carrera aún no está registrado en el sistema; mientras tanto se muestra la carrera.
      ["PARA OPTAR AL TÍTULO DE:", mayus(e.carrera) || "—"],
      [`${CIUDAD}, ${MESES[mes - 1]} ${anio}`],
    ],
  };
}
