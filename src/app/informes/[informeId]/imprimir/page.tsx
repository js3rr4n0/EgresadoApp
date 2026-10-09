import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeCompilado } from "@/app/actions/informeCompilado";
import { formatearFechaLarga, rangoFechasTexto } from "@/lib/periodosPasantia";
import type { InformeCompilado } from "@/lib/informeWord";
import { CATEGORIAS_COMENTARIO } from "@/lib/comentariosAsesor";
import PrintButton from "./PrintButton";
import { ImagenesDocumento, ParrafosCuerpo, Referencia } from "./BloquesActividad";
import DocumentoFinal from "./DocumentoFinal";

const ESTADO_INFORME: Record<string, string> = {
  redactando: "Borrador (no enviado)",
  enviado: "Enviado, en revisión del asesor",
  observado: "Devuelto con correcciones",
  aprobado: "Aprobado por el asesor",
};

export default async function InformeCompiladoPrintPage({ params }: { params: Promise<{ informeId: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) notFound();

  const res = await getInformeCompilado(id);
  if (!res.success || !res.informe || !res.secciones) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No se pudo generar el informe</h2>
        <p className="text-xs text-slate-500 font-medium">{res.error}</p>
      </div>
    );
  }

  const d = res as InformeCompilado;
  const { informe, portada, egresado, asesor, empresa, supervisor, periodo, secciones, esFinal, imagenesPorActividad } = d;

  const volverHrefPorRol: Record<string, string> = {
    egresado: "/egresado/reportes",
    asesor: `/asesor/seguimiento/${d.propuesta.id}`,
    coordinador: "/coordinador/seguimiento",
    admin: "/coordinador/seguimiento",
  };
  const volverHref = volverHrefPorRol[session.rol] || "/";


  const datosGenerales: [string, string][] = [
    ["Fecha de presentación al asesor", informe.fechaPresentacion ? formatearFechaLarga(informe.fechaPresentacion) : "Pendiente de envío"],
    [
      "Período reportado",
      periodo?.inicio && periodo.fin
        ? `Del ${formatearFechaLarga(periodo.inicio)} al ${formatearFechaLarga(periodo.fin)}`
        : `Período ${informe.numero} del cronograma`,
    ],
    ["Estudiante", egresado?.nombreCompleto || "—"],
    ["Carnet", egresado?.carnet || "—"],
    ["Asesor", asesor?.nombreCompleto || "Sin asignar"],
    ["Supervisor empresarial", supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "—"],
    ["Cargo", supervisor?.cargo || "—"],
    ["Empresa o institución", empresa?.nombre || "—"],
    [
      "Comentarios u observaciones del asesor para el decanato",
      d.comentarios.registrados
        ? "Se presentan en el apartado «Comentarios del asesor para el decanato»."
        : "Pendiente de registro por el asesor.",
    ],
  ];

  return (
    <div className="bg-white min-h-screen text-black">
      <style>{`
        @page {
          size: letter portrait;
          margin: 2.54cm 2.54cm 2.54cm 3cm;
          @bottom-right {
            content: counter(page);
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
          }
        }
        /* La portada no lleva número de página (sí cuenta en la numeración). */
        @page :first {
          @bottom-right { content: none; }
        }
        @media print {
          header, footer, nav, .no-print {
            display: none !important;
          }
        }
        .doc-body, .doc-body * {
          font-family: "Times New Roman", Times, serif;
        }
        .doc-body {
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
        }
        .doc-body p { margin: 0 0 6pt 0; }
        /* Texto de las actividades: justificado y 12 pt de espacio anterior y posterior (entre párrafos queda 12 pt, como en Word). */
        .doc-body p.doc-parrafo { margin: 12pt 0; text-align: justify; }
        .doc-titulo-seccion {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 14pt 0 6pt 0;
        }
        .doc-subtitulo-1 {
          font-size: 12pt;
          font-weight: bold;
          margin: 12pt 0 6pt 0;
        }
        .doc-subtitulo-2 {
          font-size: 12pt;
          font-weight: normal;
          margin: 10pt 0 4pt 0;
        }
        .doc-leyenda {
          font-size: 10pt;
          font-style: italic;
          text-align: center;
          margin: 2pt 0 8pt 0;
        }
        .doc-tabla {
          width: 100%;
          border-collapse: collapse;
          font-size: 12pt;
          line-height: 1.15;
        }
        .doc-tabla td, .doc-tabla th {
          border: 1px solid #000;
          padding: 3pt 5pt;
          vertical-align: middle;
        }
        /* Portada: grupos de líneas centrados y distribuidos en el alto de la hoja carta (área de texto de 22.86 cm). */
        .doc-portada {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          font-weight: bold;
          line-height: 1.15;
          min-height: 22.5cm;
          break-after: page;
        }
        .doc-portada p { margin: 0; }
        .doc-portada-logo { height: 4.2cm; width: auto; margin: 18pt auto 0 auto; display: block; }
        /* Informe final: cada apartado inicia en una hoja nueva; los títulos de los apartados van centrados. */
        .doc-salto { break-before: page; }
        .doc-capitulo { text-align: center; }
        .doc-aviso { font-family: Arial, sans-serif; font-size: 9pt; color: #64748b; margin-bottom: 8pt; }
        .doc-indice { list-style: none; padding: 0; margin: 0; }
        .doc-indice li { margin: 0 0 4pt 0; }
        .doc-indice a { color: #000; text-decoration: none; }
        .doc-indice-1 { font-weight: bold; text-transform: uppercase; }
        .doc-indice-2 { padding-left: 1.27cm; }
        .doc-indice-3 { padding-left: 2.54cm; }
        .doc-firmas { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 18pt; margin-top: 54pt; text-align: center; line-height: 1.15; break-inside: avoid; }
        .doc-firmas p { margin: 0; }
        .doc-linea-firma { border-top: 1px solid #000; margin-bottom: 4pt; }
        .doc-imagenes { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12pt; }
        .doc-nota { display: block; font-style: normal; }
        .doc-imagen {
          height: 5cm;
          width: 5cm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
      `}</style>

      <div className="no-print max-w-[820px] mx-auto px-8 pt-8">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <Link
            href={volverHref}
            className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Volver
          </Link>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/informes/${informe.id}/word`}
              className="inline-flex items-center px-6 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md transition-colors"
            >
              Descargar Word
            </a>
            <PrintButton />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 font-semibold">
          Estado del informe: {ESTADO_INFORME[informe.estado] || informe.estado}. Documento generado automáticamente a partir de las
          actividades registradas en el sistema.
        </p>
      </div>

      <div className="mx-auto bg-white p-8 print:p-0 doc-body" style={{ maxWidth: "820px" }}>
        {/* ────────────── Portada institucional ────────────── */}
        <div className="doc-portada">
          <div>
            {portada.encabezado.map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="Universidad Católica de El Salvador" className="doc-portada-logo" />
          </div>
          {portada.grupos.map((grupo, i) => (
            <div key={i}>
              {grupo.map((linea) => (
                <p key={linea}>{linea}</p>
              ))}
            </div>
          ))}
        </div>

        {esFinal ? (
          <DocumentoFinal d={d} />
        ) : (
          <>
            {/* ────────────── Datos generales ────────────── */}

            <h2 className="doc-titulo-seccion">Datos generales del informe</h2>
            <table className="doc-tabla">
              <tbody>
                {datosGenerales.map(([etiqueta, valor]) => (
                  <tr key={etiqueta}>
                    <td style={{ width: "38%", fontWeight: "bold", background: "#f2f2f2" }}>{etiqueta}</td>
                    <td>{valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Una sección por período: el informe final reúne los cinco */}
            {secciones.map((seccion) => {
              const { semanas, actividades } = seccion;
              const rangoPeriodo = seccion.inicio && seccion.fin ? rangoFechasTexto(seccion.inicio, seccion.fin) : null;
              const semanasConActividades = semanas.filter((s) => s.actividades.length > 0);
              return (
                <div key={seccion.numero}>
                {/* ────────────── Cronograma del período ────────────── */}
                {esFinal && (
                  <h2 className="doc-titulo-seccion">
                    Período {seccion.numero}
                    {rangoPeriodo ? ` (${rangoPeriodo})` : ""}
                  </h2>
                )}
                <h2 className={esFinal ? "doc-subtitulo-1" : "doc-titulo-seccion"}>Cronograma de actividades del período</h2>
                <p style={{ textAlign: "justify" }}>
                  Porción del cronograma individual correspondiente al período {seccion.numero} de la pasantía
                  {rangoPeriodo ? `, ${rangoPeriodo}` : ""}.
                </p>
                {actividades.length > 0 ? (
                  <>
                    <table className="doc-tabla" style={{ pageBreakInside: "avoid" }}>
                      <thead>
                        <tr style={{ background: "#d9d9d9" }}>
                          <th style={{ width: "12%" }}>Código</th>
                          <th style={{ textAlign: "left" }}>Actividades</th>
                          {semanas.map((s) => (
                            <th key={s.numero} style={{ width: "7%" }} title={s.inicio && s.fin ? rangoFechasTexto(s.inicio, s.fin) : undefined}>
                              S{s.numero}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {actividades.map((a) => (
                          <tr key={a.id}>
                            <td style={{ textAlign: "center" }}>{a.codigo}</td>
                            <td>{a.titulo}</td>
                            {semanas.map((s) => (
                              <td key={s.numero} style={s.numero === a.semana ? { background: "#7f7f7f" } : undefined} />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="doc-leyenda">Cronograma de actividades del período {seccion.numero}.</p>
                  </>
                ) : (
                  <p>El período no tiene actividades registradas en el cronograma.</p>
                )}

                {/* ────────────── Actividades realizadas durante el mes ────────────── */}
                <h2 className={esFinal ? "doc-subtitulo-1" : "doc-titulo-seccion"}>
                  Actividades realizadas durante el período {rangoPeriodo ?? seccion.numero}
                </h2>

                {semanasConActividades.length === 0 && <p>No hay actividades registradas para este período.</p>}

                {semanasConActividades.map((semana) => {
                  const rango = semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null;
                  return (
                    <section key={semana.numero}>
                      <h3 className="doc-subtitulo-1">
                        Semana {semana.numero}
                        {rango ? ` (${rango})` : ""}
                      </h3>
                      <p>
                        <strong>Actividades realizadas durante la semana {rango ?? semana.numero}</strong>
                      </p>

                      {/* Cada actividad reúne su marco teórico, desarrollo, elemento de soporte y conclusión técnica. */}
                      {semana.actividades.map((a) => {
                        const r = a.registro;
                        return (
                          <div key={a.id}>
                            <p style={{ margin: "6pt 0 3pt 0", breakAfter: "avoid" }}>
                              <strong>
                                {a.codigo} {a.titulo}
                                {a.registrada && r?.fecha ? ` (${formatearFechaLarga(r.fecha)})` : ""}
                              </strong>
                            </p>

                            {!a.registrada || !r ? (
                              <p>
                                <em>Actividad no registrada a la fecha de generación.</em>
                              </p>
                            ) : (
                              <>
                                {r.marcoTeorico && (
                                  <>
                                    <h4 className="doc-subtitulo-2">Marco teórico</h4>
                                    <ParrafosCuerpo texto={r.marcoTeorico} />
                                    {r.citaApa && <Referencia citaApa={r.citaApa} citaApaDatos={r.citaApaDatos} />}
                                  </>
                                )}

                                {r.descriptor && (
                                  <>
                                    <h4 className="doc-subtitulo-2">Desarrollo</h4>
                                    <ParrafosCuerpo texto={r.descriptor} />
                                  </>
                                )}

                                {(imagenesPorActividad[a.id] ?? []).length > 0 && (
                                  <>
                                    <h4 className="doc-subtitulo-2">
                                      {imagenesPorActividad[a.id].length > 1 ? "Elementos de soporte" : "Elemento de soporte"}
                                    </h4>
                                    <ImagenesDocumento imagenes={imagenesPorActividad[a.id]} codigo={a.codigo} />
                                  </>
                                )}

                                {r.conclusionTecnica && (
                                  <>
                                    <h4 className="doc-subtitulo-2">Conclusión técnica</h4>
                                    <ParrafosCuerpo texto={r.conclusionTecnica} />
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
                </div>
              );
            })}

            {/* ────────────── Visita del asesor (informe del tercer período) ────────────── */}
            {d.visita && (
              <section>
                <h2 className="doc-titulo-seccion">Visita del asesor a la empresa</h2>
                <p style={{ textAlign: "justify" }}>
                  La visita del asesor a la empresa o institución se realizó
                  {d.visita.fecha ? ` el ${formatearFechaLarga(d.visita.fecha)}` : ""}
                  {d.visita.modalidad ? ` en modalidad ${d.visita.modalidad.toLowerCase()}` : ""}.
                </p>
                {d.visita.fotos.map((f, i) => (
                  <figure key={i} style={{ margin: "6pt 0", pageBreakInside: "avoid" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.leyenda} style={{ width: "10cm", maxHeight: "8cm", objectFit: "contain", display: "block", margin: "0 auto" }} />
                    <figcaption className="doc-leyenda">
                      Fotografía {i + 1}. {f.leyenda}
                    </figcaption>
                  </figure>
                ))}
              </section>
            )}

            {/* ────────────── Comentarios del asesor para el decanato ────────────── */}
            {d.comentarios.registrados && (
              <section>
                <h2 className="doc-titulo-seccion">Comentarios del asesor para el decanato</h2>
                {CATEGORIAS_COMENTARIO.filter((c) => d.comentarios.respuestas[c.id]).map((c) => (
                  <div key={c.id}>
                    <h3 className="doc-subtitulo-1">{c.pregunta}</h3>
                    <p style={{ textAlign: "justify" }}>{d.comentarios.respuestas[c.id]}</p>
                  </div>
                ))}
                {d.comentarios.general && (
                  <div>
                    <h3 className="doc-subtitulo-1">Comentario general</h3>
                    <p style={{ textAlign: "justify" }}>{d.comentarios.general}</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
