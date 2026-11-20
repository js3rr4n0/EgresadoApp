// Documento del informe final de investigación (entrega I5): la misma estructura para la vista de impresión (PDF) y
// el Word, con el formato del documento final de pasantía y proyecto (portada, autoridades académicas, índice,
// apartados en mayúsculas y anexos). Módulo puro.
import { columnasTabla, leerItems, type ArchivoEspacio, type EnlaceEspacio } from "./elementosRecurso";
import type { EtapaInformeFinal } from "./tipos";
import { leerApartado, leerTabla, lineas, parteVacia, textoParte, tipoApartado } from "./apartadosAcademicos";
import { tituloDeCarrera } from "../tituloCarrera";
import { archivosRespuesta, bloquesRespuesta, respuestaVacia } from "./respuestasPropias";
import { claveCamposExtra, defCamposExtra, type DefinicionElementoPropio } from "./elementosPropios";

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
  /** De dónde viene: "actividad 1.1.1.1", "producto del objetivo 1.1" o null (capítulo de anexos). */
  actividad: string | null;
  nota: string | null;
}

export interface DocumentoInformeFinal {
  /** Nombre del documento (para el Word y los enlaces): "Informe final de investigación" o "Protocolo de investigación". */
  nombre?: string;
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
export function portadaInformeFinal(m: MetaInformeFinal, documento = "INFORME FINAL DE INVESTIGACIÓN") {
  const mayus = (t: string | null | undefined) => (t || "").trim().toUpperCase();
  const [anio, mes] = m.fecha.slice(0, 10).split("-").map(Number);
  const lugarFecha = `SANTA ANA, ${MESES[mes - 1]} ${anio}`;
  return {
    lugarFecha,
    portada: {
      encabezado: ["UNIVERSIDAD CATÓLICA DE EL SALVADOR", ...(m.facultad ? [mayus(m.facultad)] : [])],
      grupos: [
        [documento.toUpperCase()],
        [mayus(m.titulo) || "—"],
        ["PRESENTADO POR:", ...m.integrantes.map((i) => `${mayus(i.nombre)}${i.carnet ? ` (${i.carnet.toUpperCase()})` : ""}`)],
        ["ASESOR:", mayus(m.asesor) || "—"],
        ["PARA OPTAR AL TÍTULO DE:", mayus(tituloDeCarrera(m.carrera)) || "—"],
        [lugarFecha],
      ],
    },
  };
}

const parrafosDe = (t: string) => t.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
const esBibliografia = (titulo: string) => /bibliograf/i.test(titulo);

/**
 * Apartados del documento a partir de los espacios de la ficha (capítulos del informe final o partes del protocolo) y su
 * contenido vigente. Los elementos que genera el sistema (resultados por objetivo, recursos y presupuesto) piden sus
 * bloques a "generar"; el reporte de modificaciones va sin número. Opciones (protocolo, 19-nov-2026): referencias del
 * registro de fuentes que se suman a las del apartado de referencias, y apartados que se insertan antes de un espacio
 * (el cronograma, que sale del plan de trabajo).
 */
export function apartadosInformeFinal(
  etapa: Pick<EtapaInformeFinal, "espacios">,
  contenidos: Record<string, string | null | undefined>,
  generar: (e: EtapaInformeFinal["espacios"][number], numero: number | null) => BloqueDocumento[] = () => [],
  opciones: { referencias?: string[]; insertar?: { antesDe: string; titulo: string; bloques: (numero: number) => BloqueDocumento[] }[]; integrantes?: { id: number; nombre: string }[] } = {}
): { apartados: ApartadoDocumento[]; anexosCapitulo: ArchivoEspacio[] } {
  const apartados: ApartadoDocumento[] = [];
  let anexosCapitulo: ArchivoEspacio[] = [];
  let n = 0;
  const insertados = new Set<number>();
  const insertar = (antesDe: string | null) => {
    (opciones.insertar ?? []).forEach((x, k) => {
      if (insertados.has(k) || (antesDe !== null && x.antesDe !== antesDe)) return;
      insertados.add(k);
      const numero = ++n;
      apartados.push({ numero, titulo: x.titulo, bloques: x.bloques(numero) });
    });
  };
  // Elementos propios (C3) y campos adicionales (C4): cada campo con su etiqueta; los textos largos como párrafos y
  // los archivos a los anexos.
  const deRespuesta = (def: DefinicionElementoPropio, valor: string): BloqueDocumento[] => {
    const r: BloqueDocumento[] = [];
    for (const b of bloquesRespuesta(def, valor, opciones.integrantes ?? [])) {
      if (b.persona) r.push({ tipo: "subtitulo", texto: b.persona });
      for (const c of b.campos) {
        if (c.tipo === "texto_largo") r.push({ tipo: "subtitulo", texto: c.etiqueta }, { tipo: "parrafos", parrafos: parrafosDe(c.texto) });
        else if (c.tipo === "lista") r.push({ tipo: "subtitulo", texto: c.etiqueta }, { tipo: "lista", items: c.texto.split("\n") });
        else if (c.tipo === "archivo" || c.tipo === "imagen") r.push({ tipo: "parrafos", parrafos: [`${c.etiqueta}: ${c.texto} (en los anexos).`] });
        else r.push({ tipo: "parrafos", parrafos: [`${c.etiqueta}: ${c.texto.replace(/\n/g, "; ")}`] });
      }
    }
    anexosCapitulo = [...anexosCapitulo, ...archivosRespuesta(def, valor)];
    return r;
  };
  const extras = (e: EtapaInformeFinal["espacios"][number]): BloqueDocumento[] => {
    if (!e.camposExtra?.length) return [];
    const valor = contenidos[claveCamposExtra(e.id)] ?? "";
    const def = defCamposExtra(e);
    return respuestaVacia(def, valor) ? [] : [{ tipo: "subtitulo", texto: "Datos adicionales" }, ...deRespuesta(def, valor)];
  };
  for (const e of etapa.espacios) {
    insertar(e.id);
    const valor = contenidos[e.id] ?? "";
    if (e.elemento === "recursos_presupuesto") {
      const numero = ++n;
      apartados.push({ numero, titulo: e.titulo, bloques: [...generar(e, numero), ...extras(e)] });
      continue;
    }
    if (e.elemento === "resultados_objetivos") {
      const numero = ++n;
      apartados.push({ numero, titulo: e.titulo, bloques: generar(e, numero) });
      continue;
    }
    // El reporte de modificaciones va sin número, como la bibliografía: es un anexo del informe.
    if (e.elemento === "reporte_modificaciones") {
      apartados.push({ numero: null, titulo: e.titulo, bloques: generar(e, null) });
      continue;
    }
    // Los archivos de un capítulo de anexos se suman a los anexos del documento.
    if (e.elemento === "archivo") {
      anexosCapitulo = [...anexosCapitulo, ...(leerItems("archivo", valor) as ArchivoEspacio[])];
      continue;
    }
    const tipo = e.elemento === "apartado" ? tipoApartado(e) : undefined;
    const ap = tipo ? leerApartado(tipo, valor) : null;
    // Referencias del registro de fuentes: se suman a las escritas a mano del apartado de referencias.
    const extra = tipo?.especiales.includes("referencias") ? (opciones.referencias ?? []) : [];
    if (ap && extra.length) {
      const parte = tipo!.partes.find((p) => p.formato === "referencias");
      if (parte) ap.partes[parte.id] = [...new Set([...lineas(ap.partes[parte.id] ?? ""), ...extra])].join("\n");
    }
    const vacio = e.elemento === "propio" ? !e.propio || respuestaVacia(e.propio.definicion, valor)
      : tipo && ap ? tipo.partes.every((p) => parteVacia(p, ap.partes[p.id])) : !valor.trim() || valor.trim() === "[]";
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
    else if (e.elemento === "propio" && e.propio) bloques.push(...deRespuesta(e.propio.definicion, valor));
    bloques.push(...extras(e));
    apartados.push({ numero, titulo: e.titulo, bloques });
  }
  // Lo que se debía insertar antes de un espacio que no está: al final.
  insertar(null);
  return { apartados, anexosCapitulo };
}
