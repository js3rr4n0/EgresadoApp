import "server-only";
// Word del informe final de investigación (entrega I5) con el formato del documento final de pasantía y proyecto:
// carta, márgenes de 3 cm (izquierdo) y 2.54 cm, Times New Roman 12, interlineado 1.5, portada y autoridades sin número,
// índice de contenidos (Word lo actualiza al abrir), apartados en hoja nueva y en mayúsculas, y anexos numerados.
import {
  AlignmentType, Document, Footer, ImageRun, Packer, PageNumber, Paragraph, Table, TableOfContents, TableRow, TextRun, WidthType,
  type ISectionOptions,
} from "docx";
import {
  ANCHO_CONTENIDO, apartadoFinal, cargarLogo, celda, decodificarImagen, estiloIndice, FUENTE, INTERLINEADO, PAGINA, parrafo, parrafosCuerpo,
  portadaWord, subtitulo1, tamanoImagen, TAMANO_LEYENDA, TAMANO_TEXTO, texto, tituloAnexo,
} from "@/lib/informeWord";
import type { DocumentoInformeFinal } from "@/lib/fichas/documentoInformeFinal";

function autoridades(doc: DocumentoInformeFinal): Paragraph[] {
  const linea = (contenido: string, antes = 0, nuevaHoja = false) =>
    new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore: nuevaHoja, spacing: { line: 240, before: antes, after: 0 }, children: [texto(contenido, { bold: true })] });
  return [
    ...doc.portada.encabezado.map((l, i) => linea(l, 0, i === 0)),
    linea("AUTORIDADES ACADÉMICAS", 360),
    ...doc.autoridades.flatMap((a) => [linea(a.nombre, 1100), linea(a.cargo)]),
    linea(doc.lugarFecha, 1100),
  ];
}

function tabla(columnas: string[], filas: string[][]) {
  const ancho = Math.floor(ANCHO_CONTENIDO / Math.max(columnas.length, 1));
  return new Table({
    width: { size: ANCHO_CONTENIDO, type: WidthType.DXA },
    columnWidths: columnas.map(() => ancho),
    rows: [
      new TableRow({ tableHeader: true, children: columnas.map((c) => celda(c, ancho, { bold: true, sombra: "D9D9D9", size: TAMANO_LEYENDA })) }),
      ...filas.map((f) => new TableRow({ children: columnas.map((_, j) => celda(f[j] ?? "", ancho, { size: TAMANO_LEYENDA })) })),
    ],
  });
}

export async function generarInformeFinalFichaWord(doc: DocumentoInformeFinal): Promise<Buffer> {
  const contenido: (Paragraph | Table | TableOfContents)[] = [];
  contenido.push(apartadoFinal("Índice", false, false));
  contenido.push(new TableOfContents("Índice", { hyperlink: true, headingStyleRange: "1-2" }));

  for (const a of doc.apartados) {
    contenido.push(apartadoFinal(`${a.numero ? `${a.numero}. ` : ""}${a.titulo}`));
    for (const b of a.bloques) {
      if (b.tipo === "pendiente") contenido.push(parrafo([texto(b.texto, { italics: true })]));
      else if (b.tipo === "subtitulo") contenido.push(subtitulo1(b.texto));
      else if (b.tipo === "parrafos") contenido.push(...parrafosCuerpo(b.parrafos.join("\n")));
      else if (b.tipo === "lista") {
        // Bibliografía y referencias: sangría francesa de 1.27 cm (APA 7). Otras listas: viñetas.
        const bibliografia = b.referencias || /bibliograf/i.test(a.titulo);
        contenido.push(...b.items.map((t) => new Paragraph({
          children: [texto(bibliografia ? t : `• ${t}`)],
          indent: bibliografia ? { left: 720, hanging: 720 } : { left: 360 },
          spacing: { line: INTERLINEADO, after: 120 },
        })));
      } else if (b.tipo === "enlaces") contenido.push(...b.items.map((x) => parrafo(`${x.descripcion}: ${x.url}`)));
      else contenido.push(tabla(b.columnas, b.filas), parrafo(""));
    }
  }

  if (doc.anexos.length > 0) {
    contenido.push(apartadoFinal("Anexos"));
    doc.anexos.forEach((x, i) => {
      contenido.push(tituloAnexo(`${x.etiqueta}. ${x.descripcion}${x.actividad ? ` (${x.actividad})` : ""}`, i > 0));
      if (x.tipo === "imagen") {
        const img = decodificarImagen(x.url);
        if (img) {
          const t = tamanoImagen(img.datos, img.tipo);
          contenido.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240, after: 60 }, children: [new ImageRun({ type: img.tipo, data: img.datos, transformation: { width: t.width * 2, height: t.height * 2 } })] }));
        } else contenido.push(parrafo([texto("Imagen en un formato no compatible con Word.", { italics: true })]));
        if (x.nota) contenido.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240, after: 120 }, children: [texto(x.nota, { italics: true, size: TAMANO_LEYENDA })] }));
      } else if (x.tipo === "documento") contenido.push(parrafo(`Documento adjunto: ${x.nombre ?? x.descripcion}.`));
      else contenido.push(parrafo(`Enlace: ${x.url}`));
    });
  }

  const pagina = {
    size: { width: PAGINA.ancho, height: PAGINA.alto },
    margin: { top: PAGINA.margenOtros, right: PAGINA.margenOtros, bottom: PAGINA.margenOtros, left: PAGINA.margenIzq },
  };
  const preliminares: ISectionOptions = { properties: { page: pagina }, children: [...portadaWord(doc.portada, await cargarLogo(160)), ...autoridades(doc)] };
  const cuerpo: ISectionOptions = {
    properties: { page: pagina },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FUENTE, size: TAMANO_TEXTO })] })] }) },
    children: contenido,
  };
  const estiloTitulo = (id: string, name: string, nivel: number) => ({
    id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
    run: { font: FUENTE, size: TAMANO_TEXTO, bold: true, color: "000000" },
    paragraph: { spacing: { before: 240, after: 120, line: INTERLINEADO }, outlineLevel: nivel, keepNext: true },
  });
  const documento = new Document({
    creator: "Sistema de Procesos de Graduación - UNICAES",
    title: "Informe final de investigación",
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FUENTE, size: TAMANO_TEXTO }, paragraph: { spacing: { line: INTERLINEADO } } } },
      paragraphStyles: [estiloTitulo("Heading1", "Heading 1", 0), estiloTitulo("Heading2", "Heading 2", 1), estiloIndice("TOC1", "toc 1", 0, true), estiloIndice("TOC2", "toc 2", 360, false)],
    },
    sections: [preliminares, cuerpo],
  });
  return Packer.toBuffer(documento);
}
