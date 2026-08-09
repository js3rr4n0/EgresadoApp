"use client";

interface Props {
  propuesta: any;
  students: Array<{
    carnet: string;
    nombreCompleto: string;
    carrera: string;
    cohorte?: string;
  }>;
  asesorNombre: string;
  decanoNombre?: string;
}

export default function DictamenPropuestaClient({
  propuesta,
  students,
  asesorNombre,
  decanoNombre,
}: Props) {
  const getTipoLabel = (tipo?: string) => {
    if (tipo === "pasantia") return "Pasantía";
    if (tipo === "proyecto") return "Proyecto Específico";
    if (tipo === "investigacion") return "Investigación";
    return "Trabajo de Graduación";
  };

  const getDictamenLabel = (estado?: string) => {
    if (estado === "aprobada") return "FAVORABLE (APROBADA)";
    if (estado === "en_revision_asesor" || estado === "coordinador_asignado") return "EN REVISIÓN";
    if (estado === "rechazada" || estado === "anulada") return "NO FAVORABLE";
    return "FAVORABLE";
  };

  const fechaPresentacion = propuesta?.enviadaEn
    ? new Date(propuesta.enviadaEn).toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/El_Salvador",
      })
    : "";

  const fechaRevision = propuesta?.fechaAprobacion
    ? new Date(propuesta.fechaAprobacion).toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/El_Salvador",
      })
    : new Date().toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/El_Salvador",
      });

  const fechaImpresion = new Date().toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/El_Salvador",
  });

  // Render 2 rows if 1-2 students, or 3 rows if 3+ students (filled or blank for manual entries)
  const maxRows = Math.min(3, Math.max(2, students.length));
  const rows = Array.from({ length: maxRows }, (_, i) => students[i] || null);

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 0; }

        :root{
          --ink:#000;
          --line:1px solid #000;
          --pad:4px 6px;
        }

        html,body{ margin:0; padding:0; background:#8a8a8a; }

        body{
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          color:var(--ink);
          -webkit-font-smoothing:antialiased;
        }

        .page{
          width:8.5in;
          min-height:11in;
          max-height:11in;
          margin:24px auto;
          background:#fff;
          box-sizing:border-box;
          padding:0.4in 0.45in 0.35in 0.45in;
          position:relative;
          box-shadow:0 2px 18px rgba(0,0,0,.35);
          display:flex;
          flex-direction:column;
          overflow:hidden;
        }

        /* ---------- Encabezado ---------- */
        .header{
          display:flex;
          align-items:flex-start;
          gap:14px;
          margin-bottom:10px;
        }
        .logo{
          width:80px;
          flex:0 0 80px;
          text-align:center;
          padding-top:2px;
        }
        .logo .seal{
          width:68px; height:68px;
          border:1.5px solid #7a1f1f;
          border-radius:50%;
          margin:0 auto;
          overflow:hidden;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .logo .seal img {
          max-width:100%;
          max-height:100%;
          object-fit:contain;
        }
        .logo .lema{
          font-size:6.5px;
          font-style:italic;
          margin-top:4px;
          color:#333;
        }
        .titles{
          flex:1;
          text-align:center;
          padding-top:10px;
        }
        .titles h1{
          font-size:14px;
          font-weight:bold;
          margin:0 0 4px 0;
          letter-spacing:.2px;
        }
        .titles h2{
          font-size:13px;
          font-weight:bold;
          margin:0;
        }
        .spacer-logo{ flex:0 0 80px; }

        .id-line{
          text-align:right;
          font-size:11.5px;
          font-weight:bold;
          margin:0 0 6px 0;
        }
        .id-line .fill{
          display:inline-block;
          min-width:100px;
          border-bottom:var(--line);
          padding-left:4px;
          text-align:center;
        }

        /* ---------- Tablas base ---------- */
        table{
          width:100%;
          border-collapse:collapse;
          font-size:11.5px;
        }
        td, th{
          border:var(--line);
          padding:var(--pad);
          vertical-align:middle;
        }
        .no-border td{ border:none; }

        .blk{ margin-bottom:9px; }

        th{
          font-weight:bold;
          text-align:left;
        }

        .th-center{ text-align:center; }

        /* filas vacías para llenar a mano */
        .row-fill td{ height:22px; }

        .label{ font-weight:normal; }

        /* ---------- Bloques específicos ---------- */
        .col-carrera{ width:47%; }
        .col-ciclo{ width:13%; text-align:center; }

        .tipo-label{ width:32%; }

        .titulo-box td{ height:75px; vertical-align:top; }

        .recom-box td{ height:65px; vertical-align:top; }

        .firma-cell{ height:36px; }

        .col-carnet{ width:26%; }
        .col-firma{ width:26%; }

        /* ---------- Decano ---------- */
        .decano{
          margin-top:24px;
          text-align:left;
          padding-left:20px;
          font-size:11.5px;
        }
        .decano .rule{
          width:320px;
          border-top:var(--line);
          margin-bottom:3px;
        }
        .decano .cargo{
          padding-left:100px;
        }

        /* ---------- Pie ---------- */
        .footer{
          margin-top:auto;
          padding-top:12px;
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          font-size:11.5px;
        }
        .footer .fill{
          display:inline-block;
          min-width:160px;
          border-bottom:var(--line);
          padding-left:4px;
        }

        @media print{
          html, body{
            background:#fff !important;
            margin:0 !important;
            padding:0 !important;
            height:100% !important;
            overflow:hidden !important;
          }
          header, footer, nav, .no-print{
            display:none !important;
            height:0 !important;
            margin:0 !important;
            padding:0 !important;
            visibility:hidden !important;
          }
          .page{
            margin:0 !important;
            box-shadow:none !important;
            width:8.5in !important;
            height:11in !important;
            max-height:11in !important;
            box-sizing:border-box !important;
            padding:0.35in 0.4in 0.3in 0.4in !important;
            page-break-after:avoid !important;
            page-break-before:avoid !important;
            page-break-inside:avoid !important;
            break-after:avoid !important;
            break-inside:avoid !important;
            overflow:hidden !important;
          }
        }
      `}</style>

      {/* Screen Controls Bar */}
      <div className="no-print bg-slate-900 text-white p-4 max-w-[8.5in] mx-auto my-4 rounded-2xl flex items-center justify-between shadow-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 transition-colors cursor-pointer"
          >
            ← Regresar
          </button>
          <div>
            <h3 className="text-sm font-extrabold text-amber-400">
              Dictamen de Propuesta — #{propuesta.numero}
            </h3>
            <p className="text-[11px] text-slate-300">
              Documento oficial listo para impresión o exportación a PDF.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🖨️ Imprimir / Guardar en PDF</span>
        </button>
      </div>

      <div className="page">
        {/* Encabezado */}
        <div className="header">
          <div className="logo">
            <div className="seal">
              <img src="/unicaes-logo.png" alt="UNICAES" />
            </div>
            <div className="lema">"La Ciencia sin Moral es Vana"</div>
          </div>
          <div className="titles">
            <h1>UNIVERSIDAD CATÓLICA DE EL SALVADOR</h1>
            <h2>DICTAMEN DE PROPUESTA</h2>
          </div>
          <div className="spacer-logo"></div>
        </div>

        <div className="id-line">
          Id:<span className="fill">{propuesta.numero || propuesta.id}</span>
        </div>

        {/* Estudiantes */}
        <table className="blk">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th className="col-carrera">Carrera</th>
              <th className="col-ciclo">Ciclo<br />egreso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((st, idx) => (
              <tr key={idx} className={st ? "" : "row-fill"}>
                <td>{st?.nombreCompleto || ""}</td>
                <td>{st?.carrera || ""}</td>
                <td style={{ textAlign: "center" }}>{st?.cohorte || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tipo de trabajo */}
        <table className="blk">
          <tbody>
            <tr>
              <td className="tipo-label">Tipo de trabajo de graduación:</td>
              <td style={{ fontWeight: "bold" }}>{getTipoLabel(propuesta.tipo)}</td>
            </tr>
          </tbody>
        </table>

        {/* Título de la propuesta */}
        <table className="blk">
          <tbody>
            <tr>
              <td style={{ width: "50%" }}>Título de la propuesta:</td>
              <td style={{ width: "28%", textAlign: "right", borderLeft: "none" }}>Fecha de presentación al asesor:</td>
              <td style={{ width: "22%", borderLeft: "none", fontWeight: "bold" }}>{fechaPresentacion}</td>
            </tr>
            <tr className="titulo-box">
              <td colSpan={3} style={{ fontWeight: "bold", fontSize: "12px", lineHeight: "1.4" }}>
                {propuesta.titulo || propuesta.descripcion || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Dictamen */}
        <table className="blk">
          <tbody>
            <tr>
              <td style={{ width: "18%" }}>Dictamen:</td>
              <td style={{ fontWeight: "bold" }}>{getDictamenLabel(propuesta.estado)}</td>
            </tr>
          </tbody>
        </table>

        {/* Recomendaciones */}
        <table className="blk">
          <tbody>
            <tr>
              <td>Recomendaciones:</td>
            </tr>
            <tr className="recom-box">
              <td style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                {propuesta.observaciones || ""}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Revisión */}
        <table className="blk">
          <tbody>
            <tr>
              <td style={{ width: "62%" }}>
                Propuesta revisada por: <span style={{ fontWeight: "bold" }}>{asesorNombre || ""}</span>
              </td>
              <td style={{ width: "20%", borderRight: "none" }}>Fecha de revisión:</td>
              <td style={{ width: "18%", borderLeft: "none", fontWeight: "bold" }}>{fechaRevision}</td>
            </tr>
            <tr className="firma-cell">
              <td></td>
              <td style={{ borderRight: "none" }}>Firma:</td>
              <td style={{ borderLeft: "none" }}></td>
            </tr>
          </tbody>
        </table>

        {/* Recepción de dictamen */}
        <table className="no-border" style={{ marginBottom: "4px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "0 0 4px 8px", width: "32%" }}>Recepción de dictamen:</td>
              <td style={{ padding: "0 0 4px 0" }}>Fecha de notificación:</td>
            </tr>
          </tbody>
        </table>

        <table className="blk">
          <thead>
            <tr>
              <th className="col-carnet">Carnet</th>
              <th>Estudiante</th>
              <th className="col-firma th-center">Firma</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((st, idx) => (
              <tr key={idx} className={st ? "" : "row-fill"}>
                <td style={{ fontFamily: "monospace" }}>{st?.carnet || ""}</td>
                <td>{st?.nombreCompleto || ""}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Decano */}
        <div className="decano">
          <div className="rule"></div>
          <div className="cargo">
            {decanoNombre ? `Decano: ${decanoNombre}` : "Decano de la Facultad"}
          </div>
        </div>

        {/* Pie de página */}
        <div className="footer">
          <div>Página 1 de 1</div>
          <div>Fecha de impresión:<span className="fill">{fechaImpresion}</span></div>
        </div>
      </div>
    </>
  );
}
