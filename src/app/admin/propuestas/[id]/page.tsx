import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  empresas,
  sucursales,
  supervisores,
  cartasAceptacion,
  actividades,
  documentosEgresado,
  carreras,
  historialEstados,
} from "@/lib/schema";
import { getEquipoProyecto, getDetallesProyecto } from "@/app/actions/proyecto";
import { getCoordinadoresConEstadisticas } from "@/app/actions/adminPropuestas";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReviewForm from "./ReviewForm";
import MediaZoomViewer from "@/components/MediaZoomViewer";

export default async function AdminPropuestaReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const pId = parseInt(p.id, 10);
  if (isNaN(pId)) redirect("/admin/propuestas");

  const [propuestaInfo] = await db
    .select({
      propuesta: propuestas,
      estudiante: usuarios,
      carreraNombre: carreras.nombre,
    })
    .from(propuestas)
    .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(propuestas.id, pId))
    .limit(1);

  if (!propuestaInfo) redirect("/admin/propuestas");

  const { propuesta, estudiante, carreraNombre } = propuestaInfo;
  const isMultiUserFlow = propuesta.tipo === "proyecto" || propuesta.tipo === "investigacion";
  const isInvestigacion = propuesta.tipo === "investigacion";

  let teamMembers: any[] = [];
  let detallesProj: any = null;
  let empresa: any = null;
  let sucursal: any = null;
  let supervisor: any = null;
  let actividadesList: any[] = [];

  if (isMultiUserFlow) {
    teamMembers = await getEquipoProyecto(propuesta.id);
    detallesProj = await getDetallesProyecto(propuesta.id);
  } else {
    if (propuesta.empresaId) {
      const res = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId)).limit(1);
      empresa = res[0];
    }

    if (propuesta.sucursalId) {
      const res = await db.select().from(sucursales).where(eq(sucursales.id, propuesta.sucursalId)).limit(1);
      sucursal = res[0];
    }

    if (propuesta.supervisorId) {
      const res = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId)).limit(1);
      supervisor = res[0];
    }

    actividadesList = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuesta.id))
      .orderBy(asc(actividades.periodo), asc(actividades.numero));
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));

  const historialList = await db
    .select({
      historial: historialEstados,
      usuario: usuarios,
    })
    .from(historialEstados)
    .leftJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
    .where(eq(historialEstados.propuestaId, propuesta.id))
    .orderBy(asc(historialEstados.creadoEn));

  const coordRes = await getCoordinadoresConEstadisticas();
  const coordinadoresList = coordRes.success ? coordRes.data : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/admin/propuestas"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 mb-2"
          >
            ← Volver a Gestión de Propuestas
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Revisión de Propuesta #{propuesta.numero}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Modalidad: <span className="font-bold uppercase text-indigo-700">{propuesta.tipo}</span> • Estudiante: <span className="font-bold text-slate-800">{estudiante?.nombreCompleto}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Estado:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
            propuesta.estado === "coordinador_asignado"
              ? "bg-indigo-100 text-indigo-800 border-indigo-300"
              : propuesta.estado === "aprobada"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : propuesta.estado === "rechazada"
              ? "bg-rose-100 text-rose-800 border-rose-300"
              : "bg-amber-100 text-amber-800 border-amber-300"
          }`}>
            {propuesta.estado === "coordinador_asignado"
              ? "Coordinador Asignado"
              : propuesta.estado === "aprobada"
              ? "Aceptada por Coordinador"
              : propuesta.estado === "rechazada"
              ? "Rechazada"
              : "Pendiente de Revisión"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complete Full Proposal View (Portada + Sections) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10 space-y-8">
            {/* OFFICIAL UNICAES PORTADA HEADER */}
            <div className="text-center border-b-2 border-indigo-900 pb-8 space-y-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-2xl">🏛️</span>
                <h2 className="text-lg sm:text-xl font-black text-indigo-950 uppercase tracking-widest">
                  UNIVERSIDAD CATÓLICA DE EL SALVADOR
                </h2>
              </div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {carreraNombre || "FACULTAD DE INGENIERÍA Y ARQUITECTURA"}
              </p>
              <div className="py-4 my-2 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-widest block mb-1">
                  PROPUESTA DE TRABAJO DE GRADUACIÓN
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 px-4 max-w-xl mx-auto leading-tight">
                  &ldquo;{propuesta.titulo || `Propuesta #${propuesta.numero}`}&rdquo;
                </h3>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p><strong className="text-slate-800">Presentado por:</strong> {estudiante?.nombreCompleto} ({estudiante?.carnet || "N/A"})</p>
                <p><strong className="text-slate-800">Fecha de envío:</strong> {propuesta.enviadaEn ? new Date(propuesta.enviadaEn).toLocaleDateString("es-SV", { day: "2-digit", month: "long", year: "numeric" }) : "N/A"}</p>
              </div>
            </div>

            {/* SECCIONES DE LA PROPUESTA */}
            <div className="space-y-8">
              {isMultiUserFlow ? (
                /* PROYECTO / INVESTIGACIÓN DETAILS */
                <>
                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      1. Integrantes del Equipo
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <p className="font-extrabold text-slate-900">
                        {isInvestigacion ? "Investigador Principal: " : "Líder de Proyecto: "}
                        {estudiante?.nombreCompleto} ({estudiante?.carnet || "N/A"})
                      </p>
                      {teamMembers.length > 0 ? (
                        <div className="space-y-1 pt-2 border-t border-slate-200">
                          {teamMembers.map((m) => (
                            <p key={m.id} className="text-slate-700">
                              • <strong>{m.nombreCompleto}</strong> ({m.carnet || "Sin carnet"}) - <span className="font-bold text-emerald-700 capitalize">{m.estado}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="italic text-slate-400">Sin otros integrantes en el equipo.</p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      2. Actores Intervinientes
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="font-bold block text-slate-900 mb-1">Patrocinador:</span>
                        <p className="text-slate-600 whitespace-pre-wrap">{detallesProj?.actorPatrocinador || "N/A"}</p>
                      </div>
                      <div>
                        <span className="font-bold block text-slate-900 mb-1">{isInvestigacion ? "Investigador:" : "Beneficiario:"}</span>
                        <p className="text-slate-600 whitespace-pre-wrap">{detallesProj?.actorBeneficiario || "N/A"}</p>
                      </div>
                      {!isInvestigacion && (
                        <div>
                          <span className="font-bold block text-slate-900 mb-1">Ejecutor:</span>
                          <p className="text-slate-600 whitespace-pre-wrap">{detallesProj?.actorEjecutor || "N/A"}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-bold block text-slate-900 mb-1">Financista:</span>
                        <p className="text-slate-600 whitespace-pre-wrap">{detallesProj?.actorFinancista || "N/A"}</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      3. Descripción del Problema / Oportunidad
                    </h4>
                    <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-slate-800">
                      {detallesProj?.descripcionProblema || "N/A"}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      4. Justificación del Proyecto
                    </h4>
                    <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-slate-800">
                      {detallesProj?.justificacion || "N/A"}
                    </div>
                  </section>

                  {!isInvestigacion && (
                    <section className="space-y-3">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                        5. Alcance del Proyecto
                      </h4>
                      <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-slate-800">
                        {detallesProj?.alcance || "N/A"}
                      </div>
                    </section>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      6. Objetivos del Proyecto
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="font-bold block text-slate-900 mb-1">Objetivo General:</span>
                        <p className="text-slate-700 leading-relaxed">{detallesProj?.objetivoGeneral || "N/A"}</p>
                      </div>

                      {Array.isArray(detallesProj?.objetivosEspecificos) && detallesProj.objetivosEspecificos.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                              <tr>
                                <th className="px-4 py-2.5 w-10 text-center">#</th>
                                <th className="px-4 py-2.5 w-1/3">Objetivo Específico</th>
                                <th className="px-4 py-2.5">Descripción / Alcance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {detallesProj.objetivosEspecificos.map((obj: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2.5 text-center font-bold text-slate-800">{idx + 1}</td>
                                  <td className="px-4 py-2.5 font-semibold text-slate-900">{obj.titulo}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{obj.descripcion}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              ) : (
                /* PASANTÍA DETAILS */
                <>
                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      1. Datos de la Empresa y Sucursal
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p><span className="font-bold text-slate-900">Empresa:</span> {empresa?.nombre || "N/A"}</p>
                      <p><span className="font-bold text-slate-900">Área:</span> {empresa?.area || "N/A"}</p>
                      <p className="col-span-2"><span className="font-bold text-slate-900">Sucursal:</span> {sucursal ? `${sucursal.nombre} (${sucursal.direccion})` : "Matriz"}</p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      2. Supervisor Asignado y Firma
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <p><span className="font-bold text-slate-900">Nombre:</span> {supervisor?.nombres} {supervisor?.apellidos}</p>
                        <p><span className="font-bold text-slate-900">Cargo:</span> {supervisor?.cargo || "N/A"}</p>
                        <p><span className="font-bold text-slate-900">Teléfono:</span> {supervisor?.telefono || "N/A"}</p>
                        <p><span className="font-bold text-slate-900">Correo:</span> {supervisor?.correo || "N/A"}</p>
                      </div>

                      {supervisor?.firmaUrl && (
                        <div className="sm:col-span-1">
                          <p className="font-bold text-slate-900 mb-2">Firma del Supervisor:</p>
                          <MediaZoomViewer
                            url={supervisor.firmaUrl}
                            title={`Firma - ${supervisor.nombres} ${supervisor.apellidos}`}
                            isSignature={true}
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      3. Carta de Aceptación Institucional
                    </h4>
                    <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="font-bold text-slate-900">Emisión:</span> {carta?.fechaEmision || "N/A"}</p>
                        <p><span className="font-bold text-slate-900">Período:</span> {carta?.fechaInicio} al {carta?.fechaFin}</p>
                        <p><span className="font-bold text-slate-900">Emisor:</span> {carta?.emisorNombre || "N/A"}</p>
                        <p><span className="font-bold text-slate-900">Cargo:</span> {carta?.emisorCargo || "N/A"}</p>
                      </div>

                      {carta?.emisorFirmaUrl && (
                        <div className="pt-3 border-t border-slate-200">
                          <p className="font-bold text-slate-900 mb-2">Firma Autorizada de la Carta:</p>
                          <MediaZoomViewer
                            url={carta.emisorFirmaUrl}
                            title="Firma Autorizada Carta de Aceptación"
                            isSignature={true}
                          />
                        </div>
                      )}

                      {carta?.archivoUrl && (
                        <div className="pt-3 border-t border-slate-200">
                          <p className="font-bold text-slate-900 mb-2">Documento de la Carta de Aceptación:</p>
                          <MediaZoomViewer
                            url={carta.archivoUrl}
                            title="Carta de Aceptación"
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      4. Justificación del Proceso
                    </h4>
                    <div className="text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap text-slate-800">
                      {propuesta.justificacionProceso || "Sin justificación adicional registrada."}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                      5. Plan de Actividades (Cronograma)
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 font-bold text-slate-800">
                            <th className="py-2 w-20">Mes</th>
                            <th className="py-2 w-24">Semana</th>
                            <th className="py-2">Descripción de la Actividad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {Array.from(new Set(actividadesList.map((a) => a.periodo))).map((mes) => {
                            const actsMes = actividadesList.filter((a) => a.periodo === mes);
                            return actsMes.map((a, index) => (
                              <tr key={a.id}>
                                {index === 0 && (
                                  <td className="py-2 font-bold bg-white align-top" rowSpan={actsMes.length}>
                                    Mes {mes}
                                  </td>
                                )}
                                <td className="py-2 font-semibold">Semana {a.semana}</td>
                                <td className="py-2 text-slate-700">{a.descripcion}</td>
                              </tr>
                            ));
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {/* DOCUMENTOS ANEXOS DEL ESTUDIANTE CON ZOOM VIEWER */}
              <section className="space-y-4">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider border-b border-slate-200 pb-1">
                  Documentos Anexos del Estudiante
                </h4>
                {docs.length > 0 ? (
                  <div className="space-y-4">
                    {docs.map((d) => (
                      <div key={d.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase text-slate-900">
                            📄 {d.tipo.replace("_", " ")}
                          </span>
                        </div>
                        <MediaZoomViewer
                          url={d.archivoUrl}
                          title={d.tipo.toUpperCase().replace("_", " ")}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No hay documentos anexos subidos por el estudiante.</p>
                )}
              </section>

              {/* HISTORIAL DE CAMBIOS Y ASIGNACIONES */}
              <section className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial de Cambios y Respuestas de Asignación
                </h4>

                {historialList.length > 0 ? (
                  <div className="space-y-2.5">
                    {historialList.map((h) => {
                      const fechaStr = new Date(h.historial.creadoEn || "").toLocaleString("es-SV", {
                        dateStyle: "short",
                        timeStyle: "short",
                      });
                      const usuarioNombre = h.usuario ? `${h.usuario.nombreCompleto} (${h.usuario.rol})` : "Sistema";

                      return (
                        <div key={h.historial.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{usuarioNombre}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                                {h.historial.de || "inicio"} ➔ {h.historial.a}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{fechaStr}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No hay registros aún en el historial.</p>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Right Column: Review & Assignment Form */}
        <div className="lg:col-span-1">
          <ReviewForm
            propuestaId={propuesta.id}
            estadoActual={propuesta.estado}
            coordinadores={coordinadoresList}
            initialCoordinadorId={propuesta.coordinadorId}
            initialObservaciones={propuesta.observaciones}
          />
        </div>
      </div>
    </div>
  );
}
