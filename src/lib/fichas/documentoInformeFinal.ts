// Documento del informe final de investigación (entrega I5): la misma estructura para la vista de impresión (PDF) y
// el Word, con el formato del documento final de pasantía y proyecto (portada, autoridades académicas, índice,
// apartados en mayúsculas y anexos). Módulo puro.
import { columnasTabla, leerItems, type ArchivoEspacio, type EnlaceEspacio } from "./elementosRecurso";
import type { EtapaInformeFinal } from "./tipos";
import { leerApartado, leerTabla, lineas, parteVacia, textoParte, tipoApartado } from "./apartadosAcademicos";

export type BloqueDocumento =
  | { tipo: "parrafos"; parrafos: string[] }
  | { tipo: "subtitulo"; texto: string }
  /** referencias: con sangría francesa (APA 7) en lugar de viñetas. */
  | { tipo: "lista"; items: string[]; referencias?: boolean }
  | { tipo: "tabla"; columnas: string[]; filas: string[][] }
  | { tipo: "enlaces"; items: EnlaceEspacio[] }
  | { tipo: "pendiente"; texto: string };

export interface ApartadoDocumento {
  /** Número del apartado en el índice (null: bibliografía, que va sin número). */
  numero: number | null;
  titulo: string;
  bloques: BloqueDocumento[];
}

export interface AnexoDocumento {
  etiqueta: string;
  descripcion: string;
  tipo: "imagen" | "documento" | "enlace";
  url: string;
  nombre: string | null;
  /** Actividad de la que viene la evidencia (null: anexo agregado en el capítulo de anexos). */
  actividad: string | null;
  nota: string | null;
}

export interface DocumentoInformeFinal {
  portada: { encabezado: string[]; grupos: string[][] };
  autoridades: { nombre: string; cargo: string }[];
  lugarFecha: string;
  apartados: ApartadoDocumento[];
  anexos: AnexoDocumento[];
  /** Huella de la versión entregada (si ya se entregó). */
  huella: string | null;
  estado: string;
}

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export interface MetaInformeFinal {
  titulo: string;
  facultad: string | null;
  carrera: string | null;
  integrantes: { nombre: string; carnet: string | null }[];
  asesor: string | null;
  /** Fecha de entrega (ISO) o, si aún no se entrega, la actual. */
  fecha: string;
}

/** Portada con las mismas reglas que la del documento final de pasantía (grupos centrados, en mayúsculas). */
export function portadaInformeFinal(m: MetaInformeFinal) {
  const mayus = (t: string | null | undefined) => (t || "").trim().toUpperCase();
  const [anio, mes] = m.fecha.slice(0, 10).split("-").map(Number);
  const lugarFecha = `SANTA ANA, ${MESES[mes - 1]} ${anio}`;
  return {
    lugarFecha,
    portada: {
      encabezado: ["UNIVERSIDAD CATÓLICA DE EL SALVADOR", ...(m.facultad ? [mayus(m.facultad)] : [])],
      grupos: [
        ["INFORME FINAL DE INVESTIGACIÓN"],
        [mayus(m.titulo) || "—"],
        ["PRESENTADO POR:", ...m.integrantes.map((i) => `${mayus(i.nombre)}${i.carnet ? ` (${i.carnet.toUpperCase()})` : ""}`)],
        ["ASESOR:", mayus(m.asesor) || "—"],
        ["PARA OPTAR AL TÍTULO DE:", mayus(m.carrera) || "—"],
        [lugarFecha],
      ],
    },
  };
}

const parrafosDe = (t: string) => t.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
const esBibliografia = (titulo: string) => /bibliograf/i.test(titulo);

/** Apartados del documento a partir de los capítulos de la ficha y su contenido vigente. */
export function apartadosInformeFinal(etapa: EtapaInformeFinal, contenidos: Record<string, string | null | undefined>): { apartados: ApartadoDocumento[]; anexosCapitulo: ArchivoEspacio[] } {
  const apartados: ApartadoDocumento[] = [];
  let anexosCapitulo: ArchivoEspacio[] = [];
  let n = 0;
  for (const e of etapa.espacios) {
    const valor = contenidos[e.id] ?? "";
    // Los archivos de un capítulo de anexos se suman a los anexos del documento.
    if (e.elemento === "archivo") {
      anexosCapitulo = [...anexosCapitulo, ...(leerItems("archivo", valor) as ArchivoEspacio[])];
      continue;
    }
    const tipo = e.elemento === "apartado" ? tipoApartado(e) : undefined;
    const ap = tipo ? leerApartado(tipo, valor) : null;
    const vacio = tipo && ap ? tipo.partes.every((p) => parteVacia(p, ap.partes[p.id])) : !valor.trim() || valor.trim() === "[]";
    if (vacio && !e.obligatorio) continue;
    const bibliografia = (e.elemento === "lista" && esBibliografia(e.titulo)) || !!tipo?.especiales.includes("referencias");
    const numero = bibliografia ? null : ++n;
    const bloques: BloqueDocumento[] = [];
    // La bibliografía va en orden alfabético (APA 7).
    const ordenar = (items: string[]) => (bibliografia ? [...items].sort((a, b) => a.localeCompare(b, "es")) : items);
    if (vacio) bloques.push({ tipo: "pendiente", texto: `Pendiente: "${e.titulo}" todavía no tiene contenido.` });
    else if (tipo && ap) {
      // Apartado académico: cada subapartado con su subtítulo numerado (3.1, 3.2…), si el tipo tiene más de uno.
      const llenas = tipo.partes.filter((p) => !parteVacia(p, ap.partes[p.id]));
      llenas.forEach((p, k) => {
        if (tipo.partes.length > 1) bloques.push({ tipo: "subtitulo", texto: `${numero ? `${numero}.${k + 1} ` : ""}${p.titulo}` });
        const v = ap.partes[p.id] ?? "";
        if (p.formato === "lista" || p.formato === "referencias") bloques.push({ tipo: "lista", items: ordenar(lineas(v)), referencias: p.formato === "referencias" });
        else if (p.formato === "tabla") bloques.push({ tipo: "tabla", columnas: p.columnas ?? [], filas: leerTabla(v, p.columnas?.length ?? 1).filter((f) => f.some(Boolean)) });
        else bloques.push({ tipo: "parrafos", parrafos: parrafosDe(textoParte(tipo, ap, p.id)) });
      });
    } else if (e.elemento === "texto") bloques.push({ tipo: "parrafos", parrafos: parrafosDe(valor) });
    else if (e.elemento === "lista") bloques.push({ tipo: "lista", items: ordenar(leerItems("lista", valor) as string[]), referencias: bibliografia });
    else if (e.elemento === "tabla") bloques.push({ tipo: "tabla", columnas: columnasTabla(e), filas: leerItems("tabla", valor) as string[][] });
    else if (e.elemento === "enlace") bloques.push({ tipo: "enlaces", items: leerItems("enlace", valor) as EnlaceEspacio[] });
    apartados.push({ numero, titulo: e.titulo, bloques });
  }
  return { apartados, anexosCapitulo };
}
