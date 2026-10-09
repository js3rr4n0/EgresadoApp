import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeVisita } from "@/app/actions/informeVisita";
import { formatearFechaLarga, formatearFechaHoraElSalvador } from "@/lib/periodosPasantia";
import { SECCIONES_VISITA, preguntaVisible, seccionVisible, respuestaTexto, visitaRealizada, esVisitaVirtual } from "@/lib/formularioVisita";
import PrintButton from "@/app/informes/[informeId]/imprimir/PrintButton";

export default async function InformeVisitaDocumentoPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) notFound();

  const res = await getInformeVisita(id);
  if (!res.success || !res.visita || !res.datos) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No se pudo mostrar el informe de visita</h2>
        <p className="text-xs text-slate-500 font-medium">{res.error}</p>
      </div>
    );
  }

  const { datos, visita } = res;
  const r = visita.respuestas;
  const volverHref = session.rol === "asesor" ? `/asesor/seguimiento/${id}` : "/coordinador/seguimiento";

  return (
    <div className="bg-white min-h-screen text-black">
      <style>{`
        @page { size: letter portrait; margin: 2.54cm 2.54cm 2.54cm 3cm; @bottom-right { content: counter(page); font-family: "Times New Roman", Times, serif; font-size: 12pt; } }
        @media print { header, footer, nav, .no-print { display: none !important; } }
        .doc-body, .doc-body * { font-family: "Times New Roman", Times, serif; }
        .doc-body { font-size: 12pt; line-height: 1.5; color: #000; }
        .doc-titulo-seccion { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 14pt 0 6pt 0; }
        .doc-tabla { width: 100%; border-collapse: collapse; font-size: 11pt; line-height: 1.2; }
        .doc-tabla td { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; }
        .doc-leyenda { font-size: 10pt; font-style: italic; text-align: center; margin: 2pt 0 8pt 0; }
      `}</style>

      <div className="no-print max-w-[820px] mx-auto px-8 pt-8 flex flex-wrap justify-between items-center gap-3">
        <Link
          href={volverHref}
          className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
        >
          Volver
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto bg-white p-8 print:p-0 doc-body" style={{ maxWidth: "820px" }}>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unicaes-logo.png" alt="Universidad Católica de El Salvador" className="w-24 h-24 object-contain mx-auto mb-2" />
          <p className="font-bold">UNIVERSIDAD CATÓLICA DE EL SALVADOR</p>
          <p className="font-bold">INFORME DE VISITA DEL ASESOR A TRABAJOS DE GRADUACIÓN</p>
          <p className="no-print text-[11px] text-slate-500 font-sans">
            Estado: {visita.estado === "completado" ? `completado el ${formatearFechaHoraElSalvador(visita.completadoEn)}` : "borrador"}
          </p>
        </div>

        <h2 className="doc-titulo-seccion">Datos del trabajo de graduación</h2>
        <table className="doc-tabla">
          <tbody>
            {[
              ["Tipo de trabajo", datos.tipoTrabajo],
              ["Egresado", datos.egresado],
              ["Carnet", datos.carnet],
              ["Asesor", datos.asesor],
              ["Empresa o institución", datos.empresa],
              ["Supervisor empresarial o institucional", datos.supervisor],
              ["Cargo del supervisor", datos.cargoSupervisor],
            ].map(([etiqueta, valor]) => (
              <tr key={etiqueta}>
                <td style={{ width: "40%", fontWeight: "bold", background: "#f2f2f2" }}>{etiqueta}</td>
                <td>{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {SECCIONES_VISITA.filter((s) => seccionVisible(s, r)).map((s) => (
          <section key={s.titulo}>
            <h2 className="doc-titulo-seccion">{s.titulo}</h2>
            <table className="doc-tabla">
              <tbody>
                {s.preguntas
                  .filter((p) => preguntaVisible(p, r))
                  .map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: "55%" }}>{p.texto}</td>
                      <td>{(p.tipo === "fecha" && r[p.id] ? formatearFechaLarga(r[p.id] as string) : respuestaTexto(p, r)) || "—"}</td>
                    </tr>
                  ))}
                {s.preguntas.some((p) => p.id === "modalidad") && esVisitaVirtual(r) && (
                  <tr>
                    <td style={{ width: "55%" }}>Correo de autorización del decanato para la visita virtual</td>
                    <td>{res.autorizacion ? `Adjunto (${res.autorizacion.nombre})` : "No adjunto"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}

        {visitaRealizada(r) && visita.fotos.length > 0 && (
          <section>
            <h2 className="doc-titulo-seccion">Fotografías de la visita</h2>
            {visita.fotos.map((f, i) => (
              <figure key={i} style={{ margin: "8pt 0", pageBreakInside: "avoid" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.leyenda} style={{ width: "10cm", maxHeight: "8cm", objectFit: "contain", display: "block", margin: "0 auto" }} />
                <figcaption className="doc-leyenda">
                  Fotografía {i + 1}. {f.leyenda}
                </figcaption>
              </figure>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
