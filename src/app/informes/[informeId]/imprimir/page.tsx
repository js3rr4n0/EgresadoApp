import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeCompilado } from "@/app/actions/informeCompilado";
import { formatearFechaLarga, mesAnioTexto, rangoFechasTexto } from "@/lib/periodosPasantia";
import type { InformeCompilado } from "@/lib/informeWord";
import PrintButton from "./PrintButton";

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
  if (!res.success || !res.informe || !res.semanas) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No se pudo generar el informe</h2>
        <p className="text-xs text-slate-500 font-medium">{res.error}</p>
      </div>
    );
  }

  const d = res as InformeCompilado;
  const { informe, egresado, asesor, empresa, supervisor, periodo, semanas, actividades, numeroImagenPorActividad } = d;

  const volverHrefPorRol: Record<string, string> = {
    egresado: "/egresado/reportes",
    asesor: `/asesor/seguimiento/${d.propuesta.id}`,
    coordinador: "/coordinador/seguimiento",
    admin: "/coordinador/seguimiento",
  };
  const volverHref = volverHrefPorRol[session.rol] || "/";

  const mesTexto = periodo?.inicio ? mesAnioTexto(periodo.inicio) : `Mes ${informe.numero}`;
  const semanasConActividades = semanas.filter((s) => s.actividades.length > 0);

  const datosGenerales: [string, string][] = [
    ["Fecha de presentación al asesor", informe.fechaPresentacion ? formatearFechaLarga(informe.fechaPresentacion) : "Pendiente de envío"],
    [
      "Período reportado",
      periodo?.inicio && periodo.fin
        ? `Del ${formatearFechaLarga(periodo.inicio)} al ${formatearFechaLarga(periodo.fin)}`
        : `Mes ${informe.numero} del cronograma`,
    ],
    ["Estudiante", egresado?.nombreCompleto || "—"],
    ["Carnet", egresado?.carnet || "—"],
    ["Asesor", asesor?.nombreCompleto || "Sin asignar"],
    ["Supervisor empresarial", supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "—"],
    ["Cargo", supervisor?.cargo || "—"],
    ["Empresa o institución", empresa?.nombre || "—"],
    ["Comentarios u observaciones del asesor para el decanato", "Pendiente de definición."],
  ];

  return (
    <div className="bg-white min-h-screen text-black">
      <style>{`
        @page {
          size: letter portrait;
          margin: 2.5cm 2.5cm 2.5cm 4cm;
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
        .doc-imagen {
          height: 5cm;
          width: auto;
          max-width: 10cm;
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
        {/* ────────────── Datos generales ────────────── */}
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unicaes-logo.png" alt="Universidad Católica de El Salvador" className="w-28 h-28 object-contain mx-auto mb-2" />
          <p className="font-bold">UNIVERSIDAD CATÓLICA DE EL SALVADOR</p>
          <p className="font-bold">INFORME MENSUAL DE PASANTÍAS COMO TRABAJO DE GRADUACIÓN No. {informe.numero}</p>
        </div>

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

        {/* ────────────── Cronograma del período ────────────── */}
        <h2 className="doc-titulo-seccion">Cronograma de actividades del período</h2>
        <p style={{ textAlign: "justify" }}>
          Porción del cronograma individual correspondiente al período reportado: {mesTexto}
          {periodo?.inicio && periodo.fin ? ` (${rangoFechasTexto(periodo.inicio, periodo.fin)})` : ""}.
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
            <p className="doc-leyenda">Cronograma de actividades de {mesTexto.toLowerCase()}.</p>
          </>
        ) : (
          <p>El período no tiene actividades registradas en el cronograma.</p>
        )}

        {/* ────────────── Actividades realizadas durante el mes ────────────── */}
        <h2 className="doc-titulo-seccion">Actividades realizadas durante el mes de {mesTexto}</h2>

        {semanasConActividades.length === 0 && <p>No hay actividades registradas para este período.</p>}

        {semanasConActividades.map((semana) => {
          const rango = semana.inicio && semana.fin ? rangoFechasTexto(semana.inicio, semana.fin) : null;
          const conImagen = semana.actividades.filter((a) => a.registrada && a.registro?.imagenUrl);
          return (
            <section key={semana.numero}>
              <h3 className="doc-subtitulo-1">
                Semana {semana.numero}
                {rango ? ` (${rango})` : ""}
              </h3>

              <h4 className="doc-subtitulo-2">A. Marco teórico de las actividades de la semana</h4>
              {semana.actividades.map((a) =>
                a.registrada && a.registro?.marcoTeorico ? (
                  <div key={a.id}>
                    <p style={{ textAlign: "justify" }}>
                      <strong>
                        {a.codigo} {a.titulo}:
                      </strong>{" "}
                      {a.registro.marcoTeorico}
                    </p>
                    {a.registro.citaApa && (
                      <p style={{ textAlign: "justify" }}>
                        <strong>Referencia:</strong> {a.registro.citaApa}
                      </p>
                    )}
                  </div>
                ) : (
                  <p key={a.id}>
                    <strong>
                      {a.codigo} {a.titulo}:
                    </strong>{" "}
                    <em>actividad no registrada a la fecha de generación.</em>
                  </p>
                )
              )}

              <h4 className="doc-subtitulo-2">B. Desarrollo de actividades</h4>
              <p>
                <strong>Actividades realizadas durante la semana {rango ?? semana.numero}</strong>
              </p>
              {semana.actividades.map((a) => (
                <div key={a.id}>
                  <p>
                    <strong>
                      {a.codigo} {a.titulo}
                      {a.registrada && a.registro?.fecha ? ` (${formatearFechaLarga(a.registro.fecha)})` : ""}:
                    </strong>
                  </p>
                  {a.registrada && a.registro?.descriptor ? (
                    <p style={{ textAlign: "justify" }}>{a.registro.descriptor}</p>
                  ) : (
                    <p>
                      <em>Actividad no registrada a la fecha de generación.</em>
                    </p>
                  )}
                </div>
              ))}

              <h4 className="doc-subtitulo-2">C. Elementos de soporte de las actividades realizadas</h4>
              {conImagen.length === 0 ? (
                <p>
                  <em>No se adjuntaron elementos de soporte para las actividades de esta semana.</em>
                </p>
              ) : (
                conImagen.map((a) => (
                  <figure key={a.id} style={{ margin: "6pt 0", pageBreakInside: "avoid" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.registro!.imagenUrl!} alt={a.registro!.leyendaImagen || `Evidencia de la actividad ${a.codigo}`} className="doc-imagen" />
                    <figcaption className="doc-leyenda">
                      Imagen {numeroImagenPorActividad[a.id]}. {a.registro!.leyendaImagen || "Evidencia de la actividad"} (actividad {a.codigo}).
                    </figcaption>
                  </figure>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
