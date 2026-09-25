import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type ISectionOptions,
} from "docx";
import type { getInformeCompilado } from "@/app/actions/informeCompilado";
import { formatearFechaLarga, mesAnioTexto, rangoFechasTexto } from "@/lib/periodosPasantia";

export type InformeCompilado = Extract<Awaited<ReturnType<typeof getInformeCompilado>>, { semanas: unknown }>;

// Formato digital oficial: carta, márgenes izq. 4 cm y 2.5 cm en los demás (1 cm = 567 twips).
const PAGINA = { ancho: 12240, alto: 15840, margenIzq: 2268, margenOtros: 1418 };
const ANCHO_CONTENIDO = PAGINA.ancho - PAGINA.margenIzq - PAGINA.margenOtros;
const FUENTE = "Times New Roman";
const TAMANO_TEXTO = 24; // 12 pt (medios puntos)
const TAMANO_LEYENDA = 20; // 10 pt
const INTERLINEADO = 360; // 1.5
const LADO_IMAGEN_PX = 189; // 5 cm a 96 ppp

const borde = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

type TipoImagen = "png" | "jpg" | "gif" | "bmp";

function decodificarImagen(dataUrl: string): { datos: Buffer; tipo: TipoImagen } | null {
  const coincidencia = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!coincidencia) return null;
  const subtipo = coincidencia[1].toLowerCase();
  const tipo: TipoImagen | null =
    subtipo === "png" ? "png" : subtipo === "jpeg" || subtipo === "jpg" ? "jpg" : subtipo === "gif" ? "gif" : subtipo === "bmp" ? "bmp" : null;
  if (!tipo) return null;
  return { datos: Buffer.from(coincidencia[2], "base64"), tipo };
}

/** Dimensiones en píxeles leídas de la cabecera del archivo (PNG, JPEG, GIF, BMP). */
function dimensionesImagen(datos: Buffer, tipo: TipoImagen): { ancho: number; alto: number } | null {
  try {
    if (tipo === "png") return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
    if (tipo === "gif") return { ancho: datos.readUInt16LE(6), alto: datos.readUInt16LE(8) };
    if (tipo === "bmp") return { ancho: datos.readInt32LE(18), alto: Math.abs(datos.readInt32LE(22)) };
    let i = 2;
    while (i < datos.length) {
      if (datos[i] !== 0xff) return null;
      const marcador = datos[i + 1];
      const longitud = datos.readUInt16BE(i + 2);
      if (marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc) {
        return { alto: datos.readUInt16BE(i + 5), ancho: datos.readUInt16BE(i + 7) };
      }
      i += 2 + longitud;
    }
  } catch {
    return null;
  }
  return null;
}

/** Altura fija de 5 cm; el ancho conserva la proporción (máximo 10 cm). */
function tamanoImagen(datos: Buffer, tipo: TipoImagen) {
  const dim = dimensionesImagen(datos, tipo);
  if (!dim || dim.ancho <= 0 || dim.alto <= 0) return { width: LADO_IMAGEN_PX, height: LADO_IMAGEN_PX };
  return { width: Math.min(Math.round((LADO_IMAGEN_PX * dim.ancho) / dim.alto), LADO_IMAGEN_PX * 2), height: LADO_IMAGEN_PX };
}

function texto(contenido: string, opciones: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text: contenido, font: FUENTE, size: opciones.size ?? TAMANO_TEXTO, bold: opciones.bold, italics: opciones.italics });
}

function parrafo(runs: TextRun[] | string, opciones: { justificado?: boolean; centrado?: boolean; despues?: number } = {}) {
  return new Paragraph({
    children: typeof runs === "string" ? [texto(runs)] : runs,
    alignment: opciones.centrado ? AlignmentType.CENTER : opciones.justificado ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    spacing: { line: INTERLINEADO, after: opciones.despues ?? 120 },
  });
}

function tituloSeccion(contenido: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [texto(contenido.toUpperCase(), { bold: true })] });
}

function subtitulo1(contenido: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [texto(contenido, { bold: true })] });
}

function subtitulo2(contenido: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [texto(contenido)] });
}

function leyenda(contenido: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: INTERLINEADO, after: 160 },
    children: [texto(contenido, { italics: true, size: TAMANO_LEYENDA })],
  });
}

function celda(contenido: string, ancho: number, opciones: { bold?: boolean; sombra?: string; centrado?: boolean } = {}) {
  return new TableCell({
    borders: bordes,
    width: { size: ancho, type: WidthType.DXA },
    shading: opciones.sombra ? { fill: opciones.sombra, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opciones.centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { line: 276, after: 0 },
        children: [texto(contenido, { bold: opciones.bold })],
      }),
    ],
  });
}

function tablaDatosGenerales(d: InformeCompilado) {
  const anchoEtiqueta = 3300;
  const anchoValor = ANCHO_CONTENIDO - anchoEtiqueta;
  const supervisorNombre = d.supervisor ? `${d.supervisor.nombres} ${d.supervisor.apellidos}` : "—";
  const periodo =
    d.periodo?.inicio && d.periodo.fin
      ? `Del ${formatearFechaLarga(d.periodo.inicio)} al ${formatearFechaLarga(d.periodo.fin)}`
      : `Mes ${d.informe.numero} del cronograma`;

  const filas: [string, string][] = [
    ["Fecha de presentación al asesor", d.informe.fechaPresentacion ? formatearFechaLarga(d.informe.fechaPresentacion) : "Pendiente de envío"],
    ["Período reportado", periodo],
    ["Estudiante", d.egresado?.nombreCompleto || "—"],
    ["Carnet", d.egresado?.carnet || "—"],
    ["Asesor", d.asesor?.nombreCompleto || "Sin asignar"],
    ["Supervisor empresarial", supervisorNombre],
    ["Cargo", d.supervisor?.cargo || "—"],
    ["Empresa o institución", d.empresa?.nombre || "—"],
    ["Comentarios u observaciones del asesor para el decanato", "Pendiente de definición."],
  ];

  return new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths: [anchoEtiqueta, anchoValor],
    rows: filas.map(
      ([etiqueta, valor]) =>
        new TableRow({ children: [celda(etiqueta, anchoEtiqueta, { bold: true, sombra: "F2F2F2" }), celda(valor, anchoValor)] })
    ),
  });
}

function tablaCronograma(d: InformeCompilado) {
  const anchoCodigo = 1000;
  const anchoSemanas = Math.min(3600, 700 * Math.max(d.semanas.length, 1));
  const anchoActividad = ANCHO_CONTENIDO - anchoCodigo - anchoSemanas;
  const anchoSemana = Math.floor(anchoSemanas / Math.max(d.semanas.length, 1));
  const columnas = [anchoCodigo, anchoActividad, ...d.semanas.map(() => anchoSemana)];

  const encabezado = new TableRow({
    tableHeader: true,
    children: [
      celda("Código", anchoCodigo, { bold: true, sombra: "D9D9D9", centrado: true }),
      celda("Actividades", anchoActividad, { bold: true, sombra: "D9D9D9" }),
      ...d.semanas.map((s) => celda(`S${s.numero}`, anchoSemana, { bold: true, sombra: "D9D9D9", centrado: true })),
    ],
  });

  const filas = d.actividades.map(
    (a) =>
      new TableRow({
        children: [
          celda(a.codigo, anchoCodigo, { centrado: true }),
          celda(a.titulo, anchoActividad),
          ...d.semanas.map((s) => celda("", anchoSemana, { sombra: s.numero === a.semana ? "7F7F7F" : undefined })),
        ],
      })
  );

  return new Table({
    width: { size: columnas.reduce((t, c) => t + c, 0), type: WidthType.DXA },
    columnWidths: columnas,
    rows: [encabezado, ...filas],
  });
}

async function cargarLogo(): Promise<ImageRun | null> {
  try {
    const datos = await readFile(path.join(process.cwd(), "public", "unicaes-logo.png"));
    const dim = dimensionesImagen(datos, "png");
    const alto = 110;
    const ancho = dim ? Math.round((alto * dim.ancho) / dim.alto) : alto;
    return new ImageRun({ type: "png", data: datos, transformation: { width: ancho, height: alto } });
  } catch {
    return null;
  }
}

export async function generarInformeWord(d: InformeCompilado): Promise<Buffer> {
  const contenido: (Paragraph | Table)[] = [];
  const mesTexto = d.periodo?.inicio ? mesAnioTexto(d.periodo.inicio) : `Mes ${d.informe.numero}`;

  // ── Datos generales ──
  const logo = await cargarLogo();
  if (logo) contenido.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [logo] }));
  contenido.push(parrafo([texto("UNIVERSIDAD CATÓLICA DE EL SALVADOR", { bold: true })], { centrado: true, despues: 60 }));
  contenido.push(
    parrafo([texto(`INFORME MENSUAL DE PASANTÍAS COMO TRABAJO DE GRADUACIÓN No. ${d.informe.numero}`, { bold: true })], {
      centrado: true,
      despues: 240,
    })
  );
  contenido.push(tituloSeccion("Datos generales del informe"));
  contenido.push(tablaDatosGenerales(d));

  // ── Cronograma del período ──
  contenido.push(tituloSeccion("Cronograma de actividades del período"));
  contenido.push(
    parrafo(
      `Porción del cronograma individual correspondiente al período reportado: ${mesTexto}${
        d.periodo?.inicio && d.periodo.fin ? ` (${rangoFechasTexto(d.periodo.inicio, d.periodo.fin)})` : ""
      }.`,
      { justificado: true }
    )
  );
  if (d.actividades.length > 0) {
    contenido.push(tablaCronograma(d));
    contenido.push(leyenda(`Cronograma de actividades de ${mesTexto.toLowerCase()}.`));
  } else {
    contenido.push(parrafo("El período no tiene actividades registradas en el cronograma."));
  }

  // ── Actividades realizadas durante el mes ──
  contenido.push(tituloSeccion(`Actividades realizadas durante el mes de ${mesTexto}`));

  const semanasConActividades = d.semanas.filter((s) => s.actividades.length > 0);
  for (const semana of semanasConActividades) {
    const rango = semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null;
    contenido.push(subtitulo1(`Semana ${semana.numero}${rango ? ` (${rango})` : ""}`));

    // A. Marco teórico
    contenido.push(subtitulo2("A. Marco teórico de las actividades de la semana"));
    for (const a of semana.actividades) {
      const r = a.registro;
      if (!a.registrada || !r?.marcoTeorico) {
        contenido.push(
          parrafo([texto(`${a.codigo} ${a.titulo}: `, { bold: true }), texto("actividad no registrada a la fecha de generación.", { italics: true })])
        );
        continue;
      }
      contenido.push(parrafo([texto(`${a.codigo} ${a.titulo}: `, { bold: true }), texto(r.marcoTeorico)], { justificado: true, despues: 60 }));
      if (r.citaApa) contenido.push(parrafo([texto("Referencia: ", { bold: true }), texto(r.citaApa)], { justificado: true }));
    }

    // B. Desarrollo
    contenido.push(subtitulo2("B. Desarrollo de actividades"));
    contenido.push(parrafo([texto(`Actividades realizadas durante la semana${rango ? ` ${rango}` : ` ${semana.numero}`}`, { bold: true })]));
    for (const a of semana.actividades) {
      const r = a.registro;
      const fecha = a.registrada && r?.fecha ? ` (${formatearFechaLarga(r.fecha)})` : "";
      contenido.push(parrafo([texto(`${a.codigo} ${a.titulo}${fecha}:`, { bold: true })], { despues: 60 }));
      contenido.push(
        a.registrada && r?.descriptor
          ? parrafo(r.descriptor, { justificado: true })
          : parrafo([texto("Actividad no registrada a la fecha de generación.", { italics: true })])
      );
    }

    // C. Elementos de soporte
    contenido.push(subtitulo2("C. Elementos de soporte de las actividades realizadas"));
    let imagenesSemana = 0;
    for (const a of semana.actividades) {
      const r = a.registro;
      if (!a.registrada || !r?.imagenUrl) continue;
      const imagen = decodificarImagen(r.imagenUrl);
      const numero = d.numeroImagenPorActividad[a.id];
      if (!imagen) {
        contenido.push(parrafo([texto(`Imagen ${numero} de la actividad ${a.codigo}: formato no compatible con Word.`, { italics: true })]));
        continue;
      }
      imagenesSemana++;
      contenido.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new ImageRun({ type: imagen.tipo, data: imagen.datos, transformation: tamanoImagen(imagen.datos, imagen.tipo) })],
        })
      );
      contenido.push(leyenda(`Imagen ${numero}. ${r.leyendaImagen || "Evidencia de la actividad"} (actividad ${a.codigo}).`));
    }
    if (imagenesSemana === 0) {
      contenido.push(parrafo([texto("No se adjuntaron elementos de soporte para las actividades de esta semana.", { italics: true })]));
    }
  }

  if (semanasConActividades.length === 0) {
    contenido.push(parrafo("No hay actividades registradas para este período."));
  }

  const seccion: ISectionOptions = {
    properties: {
      page: {
        size: { width: PAGINA.ancho, height: PAGINA.alto },
        margin: { top: PAGINA.margenOtros, right: PAGINA.margenOtros, bottom: PAGINA.margenOtros, left: PAGINA.margenIzq },
      },
    },
    children: contenido,
  };

  const estiloTitulo = (id: string, name: string, bold: boolean, nivel: number) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: { font: FUENTE, size: TAMANO_TEXTO, bold, color: "000000" },
    paragraph: { spacing: { before: 240, after: 120, line: INTERLINEADO }, outlineLevel: nivel, keepNext: true },
  });

  const documento = new Document({
    creator: "Sistema de Procesos de Graduación - UNICAES",
    title: `Informe Mensual No. ${d.informe.numero}`,
    styles: {
      default: {
        document: {
          run: { font: FUENTE, size: TAMANO_TEXTO },
          paragraph: { spacing: { line: INTERLINEADO } },
        },
      },
      paragraphStyles: [
        estiloTitulo("Heading1", "Heading 1", true, 0),
        estiloTitulo("Heading2", "Heading 2", true, 1),
        estiloTitulo("Heading3", "Heading 3", false, 2),
      ],
    },
    sections: [seccion],
  });

  return Packer.toBuffer(documento);
}
