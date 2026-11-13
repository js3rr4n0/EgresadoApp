// Vista de impresión del informe final de investigación (entrega I5): con "Imprimir / PDF" se guarda como PDF. Usa la
// misma estructura que el Word (lib/fichas/documentoInformeFinal.ts) y el formato del documento final: carta, Times New
// Roman 12, interlineado 1.5, portada y autoridades sin número, apartados en hoja nueva y en mayúsculas.
import Link from "next/link";
import type { DocumentoInformeFinal } from "@/lib/fichas/documentoInformeFinal";
import BotonImprimir from "./BotonImprimir";

const hoja = "break-before-page";

export default function DocumentoInformeFinalVista({ doc, volver, word }: { doc: DocumentoInformeFinal; volver: string; word: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={volver} className="text-sm text-gray-500 hover:text-brand-red">← Volver al informe final</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {doc.estado === "redactando" ? "Vista previa: todavía no entregado" : `Versión ${doc.estado === "aprobado" ? "aprobada" : "entregada"}${doc.huella ? ` · huella ${doc.huella.slice(0, 12)}…` : ""}`}
          </span>
          <a href={word} className="px-3.5 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50">Descargar Word</a>
          <BotonImprimir />
        </div>
      </div>

      <article className="bg-white border border-border rounded-xl shadow-xs px-10 py-12 text-[12pt] leading-[1.5] text-black print:border-0 print:shadow-none print:p-0"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        {/* Portada */}
        <section className="text-center font-bold space-y-0 min-h-[60vh] flex flex-col">
          {doc.portada.encabezado.map((l) => <p key={l}>{l}</p>)}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unicaes-logo.png" alt="" className="h-28 mx-auto my-6" />
          {doc.portada.grupos.map((g, i) => (
            <div key={i} className="mt-8">{g.map((l, k) => <p key={k}>{l}</p>)}</div>
          ))}
        </section>

        {/* Autoridades académicas */}
        <section className={`${hoja} text-center font-bold pt-10 print:pt-0`}>
          {doc.portada.encabezado.map((l) => <p key={l}>{l}</p>)}
          <p className="mt-6">AUTORIDADES ACADÉMICAS</p>
          {doc.autoridades.map((a) => (
            <div key={a.cargo} className="mt-10"><p>{a.nombre}</p><p>{a.cargo}</p></div>
          ))}
          <p className="mt-10">{doc.lugarFecha}</p>
        </section>

        {/* Índice */}
        <section className={`${hoja} pt-10 print:pt-0`}>
          <h2 className="text-center font-bold mb-4">ÍNDICE</h2>
          <ol className="space-y-1">
            {doc.apartados.map((a) => (
              <li key={a.titulo}>
                {a.numero ? `${a.numero}. ` : ""}{a.titulo.toUpperCase()}
                {/* Subapartados de los apartados académicos, como en el índice de Word. */}
                {a.bloques.some((b) => b.tipo === "subtitulo") && (
                  <ol className="pl-6">{a.bloques.flatMap((b, k) => (b.tipo === "subtitulo" ? [<li key={k}>{b.texto}</li>] : []))}</ol>
                )}
              </li>
            ))}
            {doc.anexos.length > 0 && <li>ANEXOS</li>}
          </ol>
        </section>

        {doc.apartados.map((a) => (
          <section key={a.titulo} className={`${hoja} pt-10 print:pt-0`}>
            <h2 className="text-center font-bold mb-4">{a.numero ? `${a.numero}. ` : ""}{a.titulo.toUpperCase()}</h2>
            {a.bloques.map((b, i) => {
              if (b.tipo === "pendiente") return <p key={i} className="italic text-gray-500">{b.texto}</p>;
              if (b.tipo === "subtitulo") return <h3 key={i} className="font-bold mt-6 mb-2">{b.texto}</h3>;
              if (b.tipo === "parrafos") return b.parrafos.map((p, k) => <p key={`${i}-${k}`} className="text-justify my-3">{p}</p>);
              if (b.tipo === "lista") {
                return b.referencias || /bibliograf/i.test(a.titulo)
                  ? b.items.map((t, k) => <p key={`${i}-${k}`} className="pl-[1.27cm] -indent-[1.27cm] my-2">{t}</p>)
                  : <ul key={i} className="list-disc pl-8 my-3">{b.items.map((t, k) => <li key={k}>{t}</li>)}</ul>;
              }
              if (b.tipo === "enlaces") return <ul key={i} className="list-disc pl-8 my-3">{b.items.map((x, k) => <li key={k}>{x.descripcion}: {x.url}</li>)}</ul>;
              return (
                <table key={i} className="w-full border border-black text-[11pt] my-4 border-collapse">
                  <thead><tr>{b.columnas.map((c) => <th key={c} className="border border-black px-2 py-1 bg-gray-200 text-left">{c}</th>)}</tr></thead>
                  <tbody>{b.filas.map((f, k) => <tr key={k}>{b.columnas.map((c, j) => <td key={c} className="border border-black px-2 py-1 align-top">{f[j]}</td>)}</tr>)}</tbody>
                </table>
              );
            })}
          </section>
        ))}

        {doc.anexos.length > 0 && (
          <section className={`${hoja} pt-10 print:pt-0`}>
            <h2 className="text-center font-bold mb-4">ANEXOS</h2>
            {doc.anexos.map((x) => (
              <figure key={x.etiqueta} className="my-6" style={{ breakInside: "avoid" }}>
                <p className="font-bold">{x.etiqueta}. {x.descripcion}{x.actividad ? ` (actividad ${x.actividad})` : ""}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.tipo === "imagen" && <img src={x.url} alt={x.descripcion} className="max-h-80 mx-auto my-2 border border-gray-300" />}
                {x.tipo === "documento" && <p className="text-sm">Documento adjunto: {x.nombre ?? x.descripcion}</p>}
                {x.tipo === "enlace" && <p className="text-sm break-all">Enlace: {x.url}</p>}
                {x.nota && <figcaption className="text-[10pt] italic text-center">{x.nota}</figcaption>}
              </figure>
            ))}
          </section>
        )}
      </article>
    </div>
  );
}
