import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { propuestas, empresas, supervisores, documentosPropuesta, historialEstados, usuarios } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";
import Link from "next/link";

function formatFechaHoraSV(dateInput: Date | string | null) {
  if (!dateInput) return { fecha: "N/A", hora: "N/A" };
  const d = new Date(dateInput);

  const fecha = d.toLocaleDateString("es-SV", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hora = d.toLocaleTimeString("es-SV", {
    timeZone: "America/El_Salvador",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { fecha, hora };
}

export default async function HistorialPropuestaPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // 1. Fetch student proposals
  const userPropuestas = await db
    .select()
    .from(propuestas)
    .where(eq(propuestas.egresadoId, session.userId))
    .orderBy(asc(propuestas.id));

  if (userPropuestas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">No hay propuestas registradas</h2>
        <p className="text-xs text-slate-500">
          Aún no has creado ni enviado ninguna propuesta para generar un historial.
        </p>
        <Link
          href="/egresado"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs"
        >
          Volver a Mis Propuestas
        </Link>
      </div>
    );
  }

  // Fetch company/supervisor info and document snapshots for proposals
  const propsWithDetails = await Promise.all(
    userPropuestas.map(async (p) => {
      let empresa = null;
      let supervisor = null;

      if (p.empresaId) {
        const [emp] = await db.select().from(empresas).where(eq(empresas.id, p.empresaId)).limit(1);
        empresa = emp || null;
      }

      if (p.supervisorId) {
        const [sup] = await db.select().from(supervisores).where(eq(supervisores.id, p.supervisorId)).limit(1);
        supervisor = sup || null;
      }

      const pdfDocs = await db
        .select()
        .from(documentosPropuesta)
        .where(eq(documentosPropuesta.propuestaId, p.id))
        .orderBy(desc(documentosPropuesta.subidoEn));

      const historial = await db
        .select({
          id: historialEstados.id,
          de: historialEstados.de,
          a: historialEstados.a,
          creadoEn: historialEstados.creadoEn,
          usuarioNombre: usuarios.nombreCompleto,
        })
        .from(historialEstados)
        .leftJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
        .where(eq(historialEstados.propuestaId, p.id))
        .orderBy(desc(historialEstados.creadoEn));

      return {
        ...p,
        empresa,
        supervisor,
        pdfDocs,
        historial,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Historial y Versiones de la Propuesta</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Registro inalterable de versiones PDF generadas al momento de enviar y la trazabilidad completa del proceso.
        </p>
      </div>

      {propsWithDetails.map((p) => {
        const isSubmitted = p.estado === "enviada" || p.estado === "coordinador_asignado" || p.estado === "aprobada";
        const { fecha: fechaEnvio, hora: horaEnvio } = formatFechaHoraSV(p.enviadaEn || null);

        return (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Propuesta #{p.numero} ({p.tipo.toUpperCase()})
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    p.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-800' :
                    p.estado === 'coordinador_asignado' ? 'bg-blue-100 text-blue-800' :
                    p.estado === 'enviada' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {p.titulo || "Sin título definido"}
                </p>
              </div>

              {isSubmitted && (
                <a
                  href={`/egresado/redactar/imprimir?id=${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>📄 Abrir PDF Oficial No Editable</span>
                </a>
              )}
            </div>

            {/* Document Snapshots Saved in DB */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span>📁</span> Documentos PDF Oficiales Guardados en DB
              </h3>

              {p.pdfDocs.length > 0 || isSubmitted ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Default snapshot card if submitted */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-brand-red flex items-center justify-center font-bold text-lg shrink-0">
                        📄
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-slate-800 text-xs">
                          {`Propuesta_Oficial_${p.numero}.pdf`}
                        </h4>
                        <p className="text-[11px] text-brand-red font-bold">
                          🗓️ Fecha: {fechaEnvio}
                        </p>
                        <p className="text-[11px] text-slate-600 font-bold">
                          ⏰ Hora (El Salvador): {horaEnvio}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/egresado/redactar/imprimir?id=${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs transition-colors shrink-0"
                    >
                      Ver PDF
                    </a>
                  </div>

                  {p.pdfDocs.map((doc) => {
                    const { fecha: docFecha, hora: docHora } = formatFechaHoraSV(doc.subidoEn);
                    return (
                      <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                            📑
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-slate-800 text-xs">
                              {doc.nombreArchivo || `PDF_Snapshot_${doc.id}.pdf`}
                            </h4>
                            <p className="text-[11px] text-slate-600 font-medium">
                              🗓️ {docFecha} | ⏰ {docHora}
                            </p>
                          </div>
                        </div>

                        <a
                          href={doc.archivoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs transition-colors shrink-0"
                        >
                          Descargar
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  La propuesta se encuentra en borrador. Al ser enviada a revisión, el sistema guardará automáticamente el snapshot PDF correspondiente en la base de datos.
                </div>
              )}
            </div>

            {/* State Audit History */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span>⏱️</span> Registro Trazabilidad de Estados
              </h3>

              {p.historial.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {p.historial.map((h) => {
                    const { fecha: hFecha, hora: hHora } = formatFechaHoraSV(h.creadoEn);
                    return (
                      <div key={h.id} className="p-3.5 bg-slate-50/50 flex items-center justify-between text-xs gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          <div>
                            <span className="font-bold text-slate-800">
                              Cambio de estado: <span className="text-slate-500 font-normal">{h.de}</span> → <strong className="text-brand-red">{h.a}</strong>
                            </span>
                            {h.usuarioNombre && (
                              <span className="text-slate-500 block text-[11px]">
                                Por: {h.usuarioNombre}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium text-right shrink-0">
                          <div>🗓️ {hFecha}</div>
                          <div>⏰ {hHora}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">Sin cambios de estado registrados en el historial.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
