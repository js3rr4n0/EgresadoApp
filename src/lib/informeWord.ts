import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type ISectionOptions,
} from "docx";
import type { getInformeCompilado } from "@/app/actions/informeCompilado";
import { formatearFechaLarga, rangoFechasTexto, nombreInforme } from "@/lib/periodosPasantia";
import type { DatosPortada } from "@/lib/portadaInforme";
import { APARTADOS_FINAL, tituloActividadFinal } from "@/lib/informeFinal";
import { CATEGORIAS_COMENTARIO } from "@/lib/comentariosAsesor";
import { parrafosDe } from "@/lib/reglasRegistroActividad";
import { leerDatosCita, segmentosCitaApa } from "@/lib/citaApa";

export type InformeCompilado = Extract<Awaited<ReturnType<typeof getInformeCompilado>>, { secciones: unknown }>;

// Formato general de trabajos de graduación: carta, margen izquierdo 3 cm (encuadernado) y 2.54 cm (1 pulgada) en los
// demás (1 cm = 567 twips), páginas numeradas en la parte inferior derecha.
const PAGINA = { ancho: 12240, alto: 15840, margenIzq: 1701, margenOtros: 1440 };
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

/** Imagen de soporte de 5 x 5 cm (las cargadas por el sistema ya vienen recortadas a cuadrado); si no es cuadrada, conserva la proporción dentro de 5 x 5 cm. */
function tamanoImagen(datos: Buffer, tipo: TipoImagen) {
  const dim = dimensionesImagen(datos, tipo);
  if (!dim || dim.ancho <= 0 || dim.alto <= 0) return { width: LADO_IMAGEN_PX, height: LADO_IMAGEN_PX };
  const factor = LADO_IMAGEN_PX / Math.max(dim.ancho, dim.alto);
  return { width: Math.round(dim.ancho * factor), height: Math.round(dim.alto * factor) };
}

/** Fotografía de la visita: hasta 10 x 8 cm conservando la proporción. */
function tamanoFoto(datos: Buffer, tipo: TipoImagen) {
  const dim = dimensionesImagen(datos, tipo);
  const maxAncho = LADO_IMAGEN_PX * 2;
  const maxAlto = Math.round(LADO_IMAGEN_PX * 1.6);
  if (!dim || dim.ancho <= 0 || dim.alto <= 0) return { width: maxAncho, height: maxAlto };
  const factor = Math.min(maxAncho / dim.ancho, maxAlto / dim.alto);
  return { width: Math.round(dim.ancho * factor), height: Math.round(dim.alto * factor) };
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

// Texto de las actividades: justificado, interlineado 1.5 y 12 pt de espacio anterior y posterior; un párrafo por línea.
const ESPACIO_CUERPO = 240;

function parrafosCuerpo(contenido: string) {
  return parrafosDe(contenido).map(
    (p) =>
      new Paragraph({
        children: [texto(p)],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: INTERLINEADO, before: ESPACIO_CUERPO, after: ESPACIO_CUERPO },
      })
  );
}

/** Referencia APA 7: con los campos registrados conserva las cursivas; si es de texto libre se usa tal cual. */
function parrafoReferencia(citaApa: string, citaApaDatos: unknown) {
  const datos = leerDatosCita(citaApaDatos);
  const runs = datos ? segmentosCitaApa(datos).map((s) => texto(s.texto, { italics: s.cursiva })) : [texto(citaApa)];
  return new Paragraph({
    children: [texto("Referencia: ", { bold: true }), ...runs],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: INTERLINEADO, before: ESPACIO_CUERPO, after: ESPACIO_CUERPO },
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

const sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const sinBordes = { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde };

type ImagenInforme = InformeCompilado["imagenesPorActividad"][number][number] & { codigo?: string };

/** Imagen de soporte con su pie ("Imagen N. ...") y la nota de su origen (APA 7), centrados. */
function bloqueImagen(img: ImagenInforme, codigoActividad?: string) {
  const codigo = img.codigo ?? codigoActividad ?? "";
  const imagen = decodificarImagen(img.url);
  const pie = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 240, after: img.nota.length ? 0 : 120 },
    children: [texto(`Imagen ${img.numero}. ${img.leyenda} (actividad ${codigo}).`, { italics: true, size: TAMANO_LEYENDA })],
  });
  const nota = img.nota.length
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 240, after: 120 },
          children: img.nota.map((s) => texto(s.texto, { italics: s.cursiva, size: TAMANO_LEYENDA })),
        }),
      ]
    : [];
  if (!imagen) {
    return [parrafo([texto(`Imagen ${img.numero} de la actividad ${codigo}: formato no compatible con Word.`, { italics: true })]), ...nota];
  }
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      // Interlineado sencillo: con 1.5 Word agranda el espacio de la imagen en línea.
      spacing: { line: 240, after: 60 },
      children: [new ImageRun({ type: imagen.tipo, data: imagen.datos, transformation: tamanoImagen(imagen.datos, imagen.tipo) })],
    }),
    pie,
    ...nota,
  ];
}

/** Las imágenes de soporte de una actividad van de dos en dos por fila (5 x 5 cm cada una). */
function imagenesSoporte(imagenes: ImagenInforme[], codigo?: string): (Paragraph | Table)[] {
  if (imagenes.length === 1) return bloqueImagen(imagenes[0], codigo);
  const anchoCelda = Math.floor(ANCHO_CONTENIDO / 2);
  const filas: TableRow[] = [];
  for (let i = 0; i < imagenes.length; i += 2) {
    filas.push(
      new TableRow({
        cantSplit: true,
        children: [imagenes[i], imagenes[i + 1]].map(
          (img) =>
            new TableCell({
              borders: sinBordes,
              width: { size: anchoCelda, type: WidthType.DXA },
              children: img ? bloqueImagen(img, codigo) : [new Paragraph({ children: [] })],
            })
        ),
      })
    );
  }
  return [
    new Table({ width: { size: anchoCelda * 2, type: WidthType.DXA }, columnWidths: [anchoCelda, anchoCelda], borders: sinBordes, rows: filas }),
  ];
}

function leyenda(contenido: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: INTERLINEADO, after: 160 },
    children: [texto(contenido, { italics: true, size: TAMANO_LEYENDA })],
  });
}

function celda(
  contenido: string,
  ancho: number,
  opciones: { bold?: boolean; sombra?: string; centrado?: boolean; size?: number; italics?: boolean; justificado?: boolean } = {}
) {
  return new TableCell({
    borders: bordes,
    width: { size: ancho, type: WidthType.DXA },
    shading: opciones.sombra ? { fill: opciones.sombra, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opciones.centrado ? AlignmentType.CENTER : opciones.justificado ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { line: 276, after: 0 },
        children: [texto(contenido, { bold: opciones.bold, size: opciones.size, italics: opciones.italics })],
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
      : `Período ${d.informe.numero} del cronograma`;

  const filas: [string, string][] = [
    ["Fecha de presentación al asesor", d.informe.fechaPresentacion ? formatearFechaLarga(d.informe.fechaPresentacion) : "Pendiente de envío"],
    ["Período reportado", periodo],
    ["Estudiante", d.egresado?.nombreCompleto || "—"],
    ["Carnet", d.egresado?.carnet || "—"],
    ["Asesor", d.asesor?.nombreCompleto || "Sin asignar"],
    ["Supervisor empresarial", supervisorNombre],
    ["Cargo", d.supervisor?.cargo || "—"],
    ["Empresa o institución", d.empresa?.nombre || "—"],
    [
      "Comentarios u observaciones del asesor para el decanato",
      d.comentarios.registrados
        ? "Se presentan en el apartado «Comentarios del asesor para el decanato»."
        : "Pendiente de registro por el asesor.",
    ],
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

type SeccionInforme = InformeCompilado["secciones"][number];

function tablaCronograma(d: SeccionInforme) {
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

async function cargarLogo(alto: number): Promise<ImageRun | null> {
  try {
    const datos = await readFile(path.join(process.cwd(), "public", "unicaes-logo.png"));
    const dim = dimensionesImagen(datos, "png");
    const ancho = dim ? Math.round((alto * dim.ancho) / dim.alto) : alto;
    return new ImageRun({ type: "png", data: datos, transformation: { width: ancho, height: alto } });
  } catch {
    return null;
  }
}

// Portada: interlineado sencillo y los grupos de líneas distribuidos en la hoja (área de texto de 9 pulgadas).
const ESPACIO_GRUPO_PORTADA = 800; // 40 pt

function portadaWord(p: DatosPortada, logo: ImageRun | null): Paragraph[] {
  const linea = (contenido: string, antes = 0) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, before: antes, after: 0 },
      children: [texto(contenido, { bold: true })],
    });
  return [
    ...p.encabezado.map((l) => linea(l)),
    ...(logo ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360, after: 0 }, children: [logo] })] : []),
    ...p.grupos.flatMap((grupo) => grupo.map((l, i) => linea(l, i === 0 ? ESPACIO_GRUPO_PORTADA : 0))),
  ];
}

export async function generarInformeWord(d: InformeCompilado): Promise<Buffer> {
  const contenido: (Paragraph | Table)[] = [];
  const portada = portadaWord(d.portada, await cargarLogo(160));

  // El informe final sigue la estructura oficial: hojas preliminares sin número (portada y autoridades) y sus apartados.
  if (d.esFinal && d.documentoFinal) {
    return empaquetar(d, [...portada, ...autoridadesWord(d.documentoFinal)], contenidoFinal(d, d.documentoFinal));
  }

  // ── Datos generales ──
  contenido.push(tituloSeccion("Datos generales del informe"));
  contenido.push(tablaDatosGenerales(d));

  // ── Cronograma y actividades de cada período (el informe final reúne los cinco) ──
  for (const seccion of d.secciones) {
    const rangoSeccion = seccion.inicio && seccion.fin ? rangoFechasTexto(seccion.inicio, seccion.fin) : null;
    if (d.esFinal) contenido.push(tituloSeccion(`Período ${seccion.numero}${rangoSeccion ? ` (${rangoSeccion})` : ""}`));
    contenido.push(d.esFinal ? subtitulo1("Cronograma de actividades del período") : tituloSeccion("Cronograma de actividades del período"));
    contenido.push(
      parrafo(
        `Porción del cronograma individual correspondiente al período ${seccion.numero} de la pasantía${rangoSeccion ? `, ${rangoSeccion}` : ""}.`,
        { justificado: true }
      )
    );
    if (seccion.actividades.length > 0) {
      contenido.push(tablaCronograma(seccion));
      contenido.push(leyenda(`Cronograma de actividades del período ${seccion.numero}.`));
    } else {
      contenido.push(parrafo("El período no tiene actividades registradas en el cronograma."));
    }

    // ── Actividades realizadas durante el período ──
    const tituloActividades = `Actividades realizadas durante el período ${rangoSeccion ?? seccion.numero}`;
    contenido.push(d.esFinal ? subtitulo1(tituloActividades) : tituloSeccion(tituloActividades));

    const semanasConActividades = seccion.semanas.filter((s) => s.actividades.length > 0);
    for (const semana of semanasConActividades) {
      const rango = semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null;
      contenido.push(subtitulo1(`Semana ${semana.numero}${rango ? ` (${rango})` : ""}`));
      contenido.push(parrafo([texto(`Actividades realizadas durante la semana${rango ? ` ${rango}` : ` ${semana.numero}`}`, { bold: true })]));

      // Cada actividad reúne su marco teórico, desarrollo, elemento de soporte y conclusión técnica (sin repetir el código).
      for (const a of semana.actividades) {
        const r = a.registro;
        const fecha = a.registrada && r?.fecha ? ` (${formatearFechaLarga(r.fecha)})` : "";
        contenido.push(
          new Paragraph({
            keepNext: true,
            spacing: { line: INTERLINEADO, before: 120, after: 60 },
            children: [texto(`${a.codigo} ${a.titulo}${fecha}`, { bold: true })],
          })
        );

        if (!a.registrada || !r) {
          contenido.push(parrafo([texto("Actividad no registrada a la fecha de generación.", { italics: true })]));
          continue;
        }

        if (r.marcoTeorico) {
          contenido.push(subtitulo2("Marco teórico"));
          contenido.push(...parrafosCuerpo(r.marcoTeorico));
          if (r.citaApa) contenido.push(parrafoReferencia(r.citaApa, r.citaApaDatos));
        }

        if (r.descriptor) {
          contenido.push(subtitulo2("Desarrollo"));
          contenido.push(...parrafosCuerpo(r.descriptor));
        }

        const imagenes = d.imagenesPorActividad[a.id] ?? [];
        if (imagenes.length > 0) {
          contenido.push(subtitulo2(imagenes.length > 1 ? "Elementos de soporte" : "Elemento de soporte"));
          contenido.push(...imagenesSoporte(imagenes, a.codigo));
        }

        if (r.conclusionTecnica) {
          contenido.push(subtitulo2("Conclusión técnica"));
          contenido.push(...parrafosCuerpo(r.conclusionTecnica));
        }
      }
    }

    if (semanasConActividades.length === 0) {
      contenido.push(parrafo("No hay actividades registradas para este período."));
    }
  }

  // ── Visita del asesor (informe del tercer período) ──
  if (d.visita) {
    contenido.push(tituloSeccion("Visita del asesor a la empresa"));
    contenido.push(
      parrafo(
        `La visita del asesor a la empresa o institución se realizó${d.visita.fecha ? ` el ${formatearFechaLarga(d.visita.fecha)}` : ""}${
          d.visita.modalidad ? ` en modalidad ${d.visita.modalidad.toLowerCase()}` : ""
        }.`,
        { justificado: true }
      )
    );
    d.visita.fotos.forEach((f, i) => {
      const imagen = decodificarImagen(f.url);
      if (!imagen) return;
      contenido.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          keepNext: true,
          spacing: { line: 240, after: 60 },
          children: [new ImageRun({ type: imagen.tipo, data: imagen.datos, transformation: tamanoFoto(imagen.datos, imagen.tipo) })],
        })
      );
      contenido.push(leyenda(`Fotografía ${i + 1}. ${f.leyenda}`));
    });
  }

  // ── Comentarios del asesor para el decanato ──
  if (d.comentarios.registrados) {
    contenido.push(tituloSeccion("Comentarios del asesor para el decanato"));
    for (const cat of CATEGORIAS_COMENTARIO) {
      const respuesta = d.comentarios.respuestas[cat.id];
      if (!respuesta) continue;
      contenido.push(subtitulo1(cat.pregunta));
      contenido.push(parrafo(respuesta, { justificado: true }));
    }
    if (d.comentarios.general) {
      contenido.push(subtitulo1("Comentario general"));
      contenido.push(parrafo(d.comentarios.general, { justificado: true }));
    }
  }

  return empaquetar(d, portada, contenido);
}

// Título de cada actividad en el informe final: estilo propio (negrita) para que el índice no copie el formato.
const ESTILO_ACTIVIDAD = "TituloActividad";

/** Entradas del índice de contenidos: interlineado sencillo y sangría por nivel. */
function estiloIndice(id: string, name: string, sangria: number, bold: boolean) {
  return {
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    run: { font: FUENTE, size: TAMANO_TEXTO, bold },
    paragraph: { spacing: { before: bold ? 120 : 0, after: 60, line: 240 }, indent: { left: sangria } },
  };
}

/** Arma el documento: hojas preliminares en una sección sin número de página y el contenido numerado al pie, a la derecha. */
function empaquetar(d: InformeCompilado, preliminares: Paragraph[], contenido: (Paragraph | Table | TableOfContents)[]) {
  const pagina = {
    size: { width: PAGINA.ancho, height: PAGINA.alto },
    margin: { top: PAGINA.margenOtros, right: PAGINA.margenOtros, bottom: PAGINA.margenOtros, left: PAGINA.margenIzq },
  };
  // La portada (y en el informe final, las autoridades) no lleva número de página, pero sí cuenta en la numeración.
  const seccionPreliminar: ISectionOptions = { properties: { page: pagina }, children: preliminares };
  const seccion: ISectionOptions = {
    properties: { page: pagina },
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: TAMANO_TEXTO })] })],
      }),
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
    title: nombreInforme(d.informe.numero),
    // El índice de contenidos es un campo: Word lo actualiza (con sus números de página) al abrir el documento.
    features: { updateFields: true },
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
        estiloTitulo(ESTILO_ACTIVIDAD, "Titulo actividad", true, 2),
        estiloIndice("TOC1", "toc 1", 0, true),
        estiloIndice("TOC2", "toc 2", 360, false),
        estiloIndice("TOC3", "toc 3", 720, false),
      ],
    },
    sections: [seccionPreliminar, seccion],
  });

  return Packer.toBuffer(documento);
}

// ─────────────────────────── Informe final ───────────────────────────

type DocumentoFinal = NonNullable<InformeCompilado["documentoFinal"]>;

/** Título de un apartado del informe final: en hoja nueva, centrado y en mayúsculas (nivel 1 del índice). */
function apartadoFinal(contenido: string, nuevaHoja = true) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    pageBreakBefore: nuevaHoja,
    children: [texto(contenido.toUpperCase(), { bold: true })],
  });
}

/** Etiqueta dentro de una actividad (marco teórico, descripción, imágenes): no forma parte del índice. */
function etiquetaFinal(contenido: string) {
  return new Paragraph({ keepNext: true, spacing: { line: INTERLINEADO, before: 120, after: 0 }, children: [texto(contenido, { bold: true })] });
}

function tituloPeriodoFinal(s: SeccionInforme) {
  return `Período ${s.numero}${s.inicio && s.fin ? ` (${rangoFechasTexto(s.inicio, s.fin)})` : ""}`;
}

/** Hoja de autoridades académicas: misma distribución que la portada. */
function autoridadesWord(f: DocumentoFinal): Paragraph[] {
  const linea = (contenido: string, antes = 0, nuevaHoja = false) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore: nuevaHoja,
      spacing: { line: 240, before: antes, after: 0 },
      children: [texto(contenido, { bold: true })],
    });
  return [
    ...f.encabezado.map((l, i) => linea(l, 0, i === 0)),
    linea(APARTADOS_FINAL.autoridades, 360),
    ...f.autoridades.flatMap((a) => [linea(a.nombre, 1100), linea(a.cargo)]),
    linea(f.lugarFecha, 1100),
  ];
}

function tablaCronogramaReal(p: DocumentoFinal["cronograma"][number]) {
  const tam = TAMANO_LEYENDA;
  const anchoCodigo = 900;
  const anchoEstado = 2000;
  const anchoSemana = 450;
  const anchoActividad = ANCHO_CONTENIDO - anchoCodigo - anchoEstado - anchoSemana * p.semanas;
  const columnas = [anchoCodigo, anchoActividad, ...Array.from({ length: p.semanas }, () => anchoSemana), anchoEstado];
  const encabezado = new TableRow({
    tableHeader: true,
    children: [
      celda("Código", anchoCodigo, { bold: true, sombra: "D9D9D9", centrado: true, size: tam }),
      celda(`Actividades del período ${p.numero}`, anchoActividad, { bold: true, sombra: "D9D9D9", size: tam }),
      ...Array.from({ length: p.semanas }, (_, i) => celda(`S${i + 1}`, anchoSemana, { bold: true, sombra: "D9D9D9", centrado: true, size: tam })),
      celda("Estado", anchoEstado, { bold: true, sombra: "D9D9D9", centrado: true, size: tam }),
    ],
  });
  const filas = p.filas.map(
    (fila) =>
      new TableRow({
        cantSplit: true,
        children: [
          celda(fila.codigo, anchoCodigo, { centrado: true, size: tam, italics: fila.eliminada }),
          celda(fila.titulo, anchoActividad, { size: tam, italics: fila.eliminada }),
          ...Array.from({ length: p.semanas }, (_, i) =>
            celda("", anchoSemana, { sombra: i + 1 === fila.semana ? (fila.eliminada ? "BFBFBF" : "7F7F7F") : undefined, size: tam })
          ),
          celda(fila.estado, anchoEstado, { size: tam, italics: fila.eliminada }),
        ],
      })
  );
  return new Table({ width: { size: ANCHO_CONTENIDO, type: WidthType.DXA }, columnWidths: columnas, rows: [encabezado, ...filas] });
}

/** Firmas del cronograma real: pasante, supervisor empresarial y asesor designado (se imprime y se firma a mano). */
function firmasCronograma(d: InformeCompilado) {
  const ancho = Math.floor(ANCHO_CONTENIDO / 3);
  const firmas = [
    { nombre: d.egresado?.nombreCompleto ?? "", cargo: "Pasante" },
    { nombre: d.supervisor ? `${d.supervisor.nombres} ${d.supervisor.apellidos}` : "", cargo: "Supervisor empresarial" },
    { nombre: d.asesor?.nombreCompleto ?? "", cargo: "Asesor designado" },
  ];
  return new Table({
    width: { size: ancho * 3, type: WidthType.DXA },
    columnWidths: [ancho, ancho, ancho],
    borders: sinBordes,
    rows: [
      new TableRow({
        cantSplit: true,
        children: firmas.map(
          (f) =>
            new TableCell({
              borders: sinBordes,
              width: { size: ancho, type: WidthType.DXA },
              margins: { left: 150, right: 150 },
              children: [
                new Paragraph({
                  spacing: { before: 1100, after: 0, line: 240 },
                  border: { top: borde },
                  alignment: AlignmentType.CENTER,
                  children: [texto(f.nombre)],
                }),
                new Paragraph({ spacing: { after: 0, line: 240 }, alignment: AlignmentType.CENTER, children: [texto(f.cargo, { bold: true })] }),
              ],
            })
        ),
      }),
    ],
  });
}

function tablaModificaciones(f: DocumentoFinal) {
  const tam = TAMANO_LEYENDA;
  const columnas = [1300, 1300, 2000, 2399, 2100];
  const titulos = ["Fecha", "Modificación", "Actividad", "Justificación", "Validación"];
  return new Table({
    width: { size: columnas.reduce((t, c) => t + c, 0), type: WidthType.DXA },
    columnWidths: columnas,
    rows: [
      new TableRow({ tableHeader: true, children: titulos.map((t, i) => celda(t, columnas[i], { bold: true, sombra: "D9D9D9", centrado: true, size: tam })) }),
      ...f.modificaciones.map(
        (m) =>
          new TableRow({
            cantSplit: true,
            children: [
              celda(m.fecha ? formatearFechaLarga(m.fecha) : "—", columnas[0], { size: tam }),
              celda(m.tipo, columnas[1], { size: tam }),
              celda(m.actividad, columnas[2], { size: tam }),
              celda(m.justificacion, columnas[3], { size: tam, justificado: true }),
              celda(m.validacion, columnas[4], { size: tam }),
            ],
          })
      ),
    ],
  });
}

/** Carta de finalización: ocupa el ancho del área de texto, hasta 21 cm de alto. */
function imagenCarta(url: string) {
  const imagen = decodificarImagen(url);
  if (!imagen) return parrafo([texto("La carta adjunta no tiene un formato de imagen compatible con Word.", { italics: true })]);
  const dim = dimensionesImagen(imagen.datos, imagen.tipo);
  const maxAncho = Math.round((ANCHO_CONTENIDO / 1440) * 96);
  const maxAlto = Math.round((21 / 2.54) * 96);
  const factor = dim ? Math.min(maxAncho / dim.ancho, maxAlto / dim.alto) : 1;
  const tam = dim ? { width: Math.round(dim.ancho * factor), height: Math.round(dim.alto * factor) } : { width: maxAncho, height: maxAlto };
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 240 },
    children: [new ImageRun({ type: imagen.tipo, data: imagen.datos, transformation: tam })],
  });
}

function contenidoFinal(d: InformeCompilado, f: DocumentoFinal): (Paragraph | Table | TableOfContents)[] {
  const contenido: (Paragraph | Table | TableOfContents)[] = [];
  const actividades = d.secciones.flatMap((s) =>
    s.semanas.flatMap((semana) =>
      semana.actividades.map((a) => ({
        ...a,
        encabezado: tituloActividadFinal(a.codigo, a.titulo, semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null),
      }))
    )
  );

  // ── Agradecimientos (opcional) ──
  if (f.agradecimientos.length) {
    contenido.push(apartadoFinal(APARTADOS_FINAL.agradecimientos, false));
    contenido.push(...parrafosCuerpo(f.agradecimientos.join("\n")));
  }

  // ── Índice de contenidos ──
  contenido.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      pageBreakBefore: f.agradecimientos.length > 0,
      spacing: { line: INTERLINEADO, after: 240 },
      children: [texto(APARTADOS_FINAL.indice, { bold: true })],
    })
  );
  contenido.push(
    new TableOfContents(APARTADOS_FINAL.indice, {
      hyperlink: true,
      headingStyleRange: "1-3",
      // Las actividades entran por su nivel de esquema (3): no depende del separador de listas de la configuración regional de Word.
      useAppliedParagraphOutlineLevel: true,
    })
  );

  // ── Descripción de la empresa ──
  contenido.push(apartadoFinal(APARTADOS_FINAL.empresa));
  if (f.empresa.nombre) {
    contenido.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: INTERLINEADO, before: ESPACIO_CUERPO, after: ESPACIO_CUERPO },
        children: [
          texto(f.empresa.nombre, { bold: true }),
          texto(`${f.empresa.area ? `, ${f.empresa.area}.` : "."}${f.empresa.direccion ? ` Dirección: ${f.empresa.direccion}` : ""}`),
        ],
      })
    );
  }
  if (f.empresa.parrafos.length) contenido.push(...parrafosCuerpo(f.empresa.parrafos.join("\n")));
  else contenido.push(parrafo([texto("La empresa no tiene descripción registrada en el sistema.", { italics: true })]));

  // ── Actividades realizadas, en orden cronológico ──
  contenido.push(apartadoFinal(APARTADOS_FINAL.actividades));
  for (const s of d.secciones) {
    contenido.push(subtitulo1(tituloPeriodoFinal(s)));
    for (const a of actividades.filter((x) => x.periodo === s.numero)) {
      contenido.push(new Paragraph({ style: ESTILO_ACTIVIDAD, children: [texto(a.encabezado)] }));
      const r = a.registro;
      if (!a.registrada || !r) {
        contenido.push(parrafo([texto("Actividad no registrada a la fecha de generación.", { italics: true })]));
        continue;
      }
      if (r.marcoTeorico) {
        contenido.push(etiquetaFinal("Marco teórico"));
        contenido.push(...parrafosCuerpo(r.marcoTeorico));
        if (r.citaApa) contenido.push(parrafoReferencia(r.citaApa, r.citaApaDatos));
      }
      if (r.descriptor) {
        contenido.push(etiquetaFinal("Descripción"));
        contenido.push(...parrafosCuerpo(r.descriptor));
      }
      const imagenes = d.imagenesPorActividad[a.id] ?? [];
      if (imagenes.length) {
        contenido.push(etiquetaFinal(imagenes.length > 1 ? "Imágenes" : "Imagen"));
        contenido.push(...imagenesSoporte(imagenes, a.codigo));
      }
    }
  }

  // ── Conclusiones: la registrada en cada actividad ──
  contenido.push(apartadoFinal(APARTADOS_FINAL.conclusiones));
  for (const a of actividades.filter((x) => x.registrada && x.registro?.conclusionTecnica)) {
    contenido.push(etiquetaFinal(`Actividad ${a.codigo}. ${a.titulo}`));
    contenido.push(...parrafosCuerpo(a.registro!.conclusionTecnica!));
  }

  // ── Anexos ──
  contenido.push(apartadoFinal(APARTADOS_FINAL.anexos));
  contenido.push(subtitulo1(APARTADOS_FINAL.cronograma));
  contenido.push(
    parrafo(
      "Cronograma de las actividades desarrolladas durante la pasantía, con los cambios aprobados al cronograma original (actividades agregadas, modificadas, pospuestas, reubicadas y eliminadas).",
      { justificado: true }
    )
  );
  for (const p of f.cronograma) {
    contenido.push(tablaCronogramaReal(p));
    contenido.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }
  contenido.push(firmasCronograma(d));

  const anexo = (titulo: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: true, children: [texto(titulo, { bold: true })] });

  contenido.push(anexo(APARTADOS_FINAL.modificaciones));
  if (f.modificaciones.length) contenido.push(tablaModificaciones(f));
  else contenido.push(parrafo("El cronograma original no tuvo modificaciones durante la pasantía."));

  contenido.push(anexo(APARTADOS_FINAL.adicional));
  if (f.anexos.length) contenido.push(...imagenesSoporte(f.anexos));
  else contenido.push(parrafo("No se adjuntó contenido adicional."));

  contenido.push(anexo(APARTADOS_FINAL.carta));
  contenido.push(
    f.carta
      ? imagenCarta(f.carta.url)
      : parrafo([texto("Pendiente: el egresado debe adjuntar la carta de finalización satisfactoria emitida por la empresa.", { italics: true })])
  );

  return contenido;
}
