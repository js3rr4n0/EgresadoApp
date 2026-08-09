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
    if (estado === "aprobada" || estado === "primer_contacto_completado") return "FAVORABLE (APROBADA)";
    if (estado === "enviada" || estado === "en_revision_asesor" || estado === "coordinador_asignado") return "EN REVISIÓN";
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

  // Always 3 rows for students table
  const rows = Array.from({ length: 3 }, (_, i) => students[i] || null);

  return (
    <>
      <style>{`
        :root {
          --line: #000;
          --ink: #000;
          --pad: 5px 7px;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #e9e9e9; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: var(--ink);
          font-size: 10.5pt;
        }
        .hoja {
          width: 216mm;
          min-height: 279mm;
          margin: 16px auto;
          background: #fff;
          padding: 12mm 12mm 10mm 12mm;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        /* Encabezado */
        .encabezado {
          display: grid;
          grid-template-columns: 85px 1fr 85px;
          align-items: center;
          margin-bottom: 8px;
        }
        .logo-box {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          border: 1px solid #999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 7pt;
          text-align: center;
          color: #999;
          overflow: hidden;
          margin: 0 auto;
        }
        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .titulos {
          text-align: center;
          font-weight: bold;
          font-size: 11.5pt;
          line-height: 1.5;
        }

        .id-doc {
          text-align: right;
          font-size: 10.5pt;
          font-weight: bold;
          margin-bottom: 4px;
          padding-right: 2px;
        }

        /* Tablas / bloques */
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5pt;
        }
        .marco { border: 1px solid var(--line); }
        td, th {
          border: 0;
          padding: var(--pad);
          vertical-align: middle;
          font-weight: normal;
          text-align: left;
        }
        .bloque { margin-bottom: 10px; }
        .etq { font-weight: bold; }
        .sep-v { border-right: 1px solid var(--line); }
        .sep-h { border-bottom: 1px solid var(--line); }
        .fila-vacia td { height: 24px; }

        /* Tabla de estudiantes */
        .t-estudiantes .cab td {
          border-bottom: 1px solid var(--line);
          font-weight: bold;
          vertical-align: bottom;
        }
        .t-estudiantes .col-carrera { border-left: 1px solid var(--line); }
        .t-estudiantes .col-ciclo { border-left: 1px solid var(--line); text-align: center; }
        .cab .col-ciclo { line-height: 1.2; }

        /* Bloques con caja de escritura */
        .caja-alta td { height: 85px; vertical-align: top; }

        .linea-encabezado {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 4px 6px;
        }

        /* Firma decano */
        .firma-larga {
          border-top: 1px solid var(--line);
          width: 58%;
          margin: 45px auto 0;
          text-align: center;
          padding-top: 4px;
          line-height: 1.4;
          font-size: 10.5pt;
        }

        /* Pie */
        .pie {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 16px;
          font-size: 10pt;
        }

        .campo { display: inline-block; min-width: 110px; }

        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .hoja {
            margin: 0 auto !important;
            width: 100% !important;
            min-height: 100vh !important;
            padding: 8mm 10mm !important;
            box-shadow: none !important;
          }
          @page { size: letter; margin: 10mm; }
        }
      `}</style>

      {/* Action Header Bar for Screen */}
      <div className="no-print bg-slate-900 text-white p-4 max-w-[216mm] mx-auto my-4 rounded-2xl flex items-center justify-between shadow-xl border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <h3 className="text-sm font-extrabold text-white">
              Dictamen de Plan de Trabajo — Propuesta #{propuesta.numero || propuesta.id}
            </h3>
            <p className="text-[11px] text-slate-300">
              Formato oficial UNICAES listo para impresión o descarga en PDF.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🖨️ Imprimir / Guardar PDF</span>
        </button>
      </div>

      <div className="hoja">
        {/* Encabezado */}
        <div className="encabezado">
          <div className="logo-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="UNICAES" />
          </div>
          <div className="titulos">
            UNIVERSIDAD CATÓLICA DE EL SALVADOR<br />
            DICTAMEN DE PLAN DE TRABAJO
          </div>
          <div></div>
        </div>

        <div className="id-doc">Id: {propuesta.id}</div>

        {/* Estudiantes */}
        <div className="bloque">
          <table className="marco t-estudiantes">
            <colgroup>
              <col style={{ width: "44%" }} />
              <col style={{ width: "42%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <tbody>
              <tr className="cab">
                <td className="etq">Estudiante</td>
                <td className="etq col-carrera">Carrera</td>
                <td className="etq col-ciclo">
                  Ciclo
                  <br />
                  egreso
                </td>
              </tr>
              {rows.map((st, idx) => (
                <tr key={idx} className={st ? "" : "fila-vacia"}>
                  <td className="font-bold">{st?.nombreCompleto || "\u00A0"}</td>
                  <td className="col-carrera">{st?.carrera || "\u00A0"}</td>
                  <td className="col-ciclo">{st?.cohorte || "\u00A0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tipo de trabajo */}
        <div className="bloque">
          <table className="marco">
            <colgroup>
              <col style={{ width: "27%" }} />
              <col />
            </colgroup>
            <tbody>
              <tr className="fila-vacia">
                <td>Tipo de trabajo de graduación:</td>
                <td style={{ borderLeft: "1px solid var(--line)", fontWeight: "bold" }}>
                  {getTipoLabel(propuesta.tipo)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Título del plan */}
        <div className="bloque">
          <table className="marco">
            <tbody>
              <tr>
                <td className="sep-h">
                  <div className="linea-encabezado" style={{ padding: 0 }}>
                    <span>Título del plan de trabajo o protocolo:</span>
                    <span>
                      Fecha de presentación al asesor:
                      <span className="campo" style={{ fontWeight: "bold", marginLeft: "6px" }}>
                        {fechaPresentacion}
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
              <tr className="caja-alta">
                <td style={{ fontWeight: "bold", fontSize: "10.5pt", lineHeight: "1.4" }}>
                  {propuesta.titulo || propuesta.descripcion || "\u00A0"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dictamen */}
        <div className="bloque">
          <table className="marco">
            <colgroup>
              <col style={{ width: "17%" }} />
              <col />
            </colgroup>
            <tbody>
              <tr className="fila-vacia">
                <td>Dictamen:</td>
                <td style={{ borderLeft: "1px solid var(--line)", fontWeight: "bold" }}>
                  {getDictamenLabel(propuesta.estado)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recomendaciones */}
        <div className="bloque">
          <table className="marco">
            <tbody>
              <tr>
                <td className="sep-h">Recomendaciones:</td>
              </tr>
              <tr className="caja-alta">
                <td style={{ fontSize: "10.5pt", lineHeight: "1.4" }}>
                  {propuesta.observaciones || "\u00A0"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Revisión */}
        <div className="bloque">
          <table className="marco">
            <colgroup>
              <col style={{ width: "60%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="sep-h">
                  Plan de trabajo o protocolo revisado por:{" "}
                  <strong style={{ marginLeft: "4px" }}>{asesorNombre}</strong>
                </td>
                <td className="sep-h">
                  Fecha de revisión:
                  <span className="campo" style={{ fontWeight: "bold", marginLeft: "6px" }}>
                    {fechaRevision}
                  </span>
                </td>
              </tr>
              <tr style={{ height: "36px" }}>
                <td>&nbsp;</td>
                <td style={{ borderLeft: "1px solid var(--line)" }}>Firma:</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recepción de dictamen */}
        <div className="bloque">
          <div className="linea-encabezado" style={{ padding: "0 8px 4px" }}>
            <span>Recepción de dictamen:</span>
            <span style={{ flex: 1 }}>
              Fecha de notificación:
              <span className="campo" style={{ marginLeft: "6px" }}>{fechaRevision}</span>
            </span>
          </div>
          <table className="marco t-estudiantes">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "53%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <tbody>
              <tr className="cab">
                <td>Carnet</td>
                <td className="col-carrera">Estudiante</td>
                <td className="col-ciclo">Firma</td>
              </tr>
              {rows.map((st, idx) => (
                <tr key={idx} className={st ? "" : "fila-vacia"}>
                  <td style={{ fontFamily: "monospace" }}>{st?.carnet || "\u00A0"}</td>
                  <td className="col-carrera">{st?.nombreCompleto || "\u00A0"}</td>
                  <td className="col-ciclo">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Firma decano */}
        <div className="firma-larga">
          <div style={{ fontWeight: "bold" }}>{decanoNombre || "\u00A0"}</div>
          <div>Decano de la Facultad</div>
        </div>

        {/* Pie */}
        <div className="pie">
          <span>Página 1 de 1</span>
          <span>
            Fecha de impresión:
            <span className="campo" style={{ fontWeight: "bold", marginLeft: "6px" }}>
              {fechaImpresion}
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
