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
import PdfToImagesViewer from "@/components/PdfToImagesViewer";
import MediaZoomViewer from "@/components/MediaZoomViewer";
import HistorialProyectoAccordion from "@/components/HistorialProyectoAccordion";

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
  const isProyecto = propuesta.tipo === "proyecto";
  const isInvestigacion = propuesta.tipo === "investigacion";
  const isMultiUserFlow = isProyecto || isInvestigacion;

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
      .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));
  }

  const displayMembers =
    teamMembers.length > 0
      ? teamMembers
      : [
          {
            id: estudiante?.id || 0,
            carnet: estudiante?.carnet,
            nombreCompleto: estudiante?.nombreCompleto,
            correo: estudiante?.correo,
          },
        ];

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const docs = propuesta.egresadoId
    ? await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId))
    : [];

  const historialList = await db
    .select({
      historial: historialEstados,
      usuario: usuarios,
    })
    .from(historialEstados)
    .leftJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
    .where(eq(historialEstados.propuestaId, propuesta.id))
    .orderBy(asc(historialEstados.creadoEn));

  const coordRes = await getCoordinadoresConEstadisticas(propuesta.empresaId);
  const coordinadoresList = coordRes.success ? coordRes.data : [];

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formattedDate = `SANTA ANA, ${today.toLocaleDateString("es-SV", options).toUpperCase()}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/propuestas"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            ← Volver al Panel Principal
          </Link>
          <span className="text-xs font-bold text-slate-400">|</span>
          <span className="text-xs font-bold text-slate-700">
            Propuesta #{propuesta.numero} - <span className="uppercase text-indigo-700">{propuesta.tipo}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/admin/propuestas/${propuesta.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Reporte
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Document View */}
        <div className="lg:col-span-8 space-y-8">
          {/* SHEET PAPER CONTAINER */}
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 p-6 sm:p-12 space-y-10 text-slate-900 mx-auto max-w-[850px]">
            {/* PORTADA - UNIVERSIDAD CATÓLICA DE EL SALVADOR */}
            <div className="flex flex-col items-center justify-center text-center space-y-6 border-b-2 border-slate-200 pb-10">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-900">
                UNIVERSIDAD CATÓLICA DE EL SALVADOR
              </h1>

              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/unicaes-logo.png"
                  alt="UNICAES"
                  className="w-44 h-44 sm:w-52 sm:h-52 object-contain mx-auto filter drop-shadow-sm"
                />
                <p className="text-xs font-bold text-slate-700 italic mt-2">&ldquo;La Ciencia sin Moral es Vana&rdquo;</p>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900">
                  FACULTAD DE INGENIERÍA Y ARQUITECTURA
                </h2>
                <h3 className="text-base font-extrabold uppercase text-slate-800 tracking-wider">
                  DECANATO
                </h3>
              </div>

              <div className="pt-4 space-y-2 max-w-2xl">
                <h4 className="text-sm font-bold uppercase text-slate-600 tracking-wide">
                  HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN
                </h4>
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  CICLO I-{today.getFullYear()}
                </p>
                <div className="pt-2">
                  <span className="inline-block bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-indigo-900">
                    MODALIDAD: {propuesta.tipo}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: DATOS GENERALES */}
            <div className="space-y-4">
              <h2 className="text-base font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-wider">
                1. DATOS DEL O LOS ESTUDIANTES
              </h2>

              {isMultiUserFlow ? (
                <div className="space-y-4">
                  {displayMembers.map((member, idx) => {
                    const nombre = member.nombreCompleto || member.usuario?.nombreCompleto || "N/A";
                    const carnet = member.carnet || member.usuario?.carnet || "N/A";
                    const correo = member.correo || member.usuario?.correo || "N/A";
                    return (
                      <div key={member.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold border-b border-slate-200 pb-2">
                          <span className="text-indigo-900 font-black">ESTUDIANTE #{idx + 1}</span>
                          <span className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">{carnet}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <p><strong className="text-slate-700">Nombre:</strong> {nombre}</p>
                          <p><strong className="text-slate-700">Correo:</strong> {correo}</p>
                          <p><strong className="text-slate-700">Carrera:</strong> {carreraNombre}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p><strong className="text-slate-700">Nombre:</strong> {estudiante?.nombreCompleto}</p>
                  <p><strong className="text-slate-700">Carnet:</strong> {estudiante?.carnet}</p>
                  <p><strong className="text-slate-700">Carrera:</strong> {carreraNombre}</p>
                  <p><strong className="text-slate-700">Correo:</strong> {estudiante?.correo}</p>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: TÍTULO Y DETALLES DEL TRABAJO */}
            <div className="space-y-4">
              <h2 className="text-base font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-wider">
                2. TÍTULO Y DETALLES DEL TRABAJO DE GRADUACIÓN
              </h2>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div>
                  <strong className="text-slate-700 block uppercase font-bold text-[11px] mb-1">Título de la Propuesta:</strong>
                  <p className="font-extrabold text-slate-900 text-sm leading-relaxed">{propuesta.titulo || "Sín Título"}</p>
                </div>

                {isMultiUserFlow && detallesProj && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div>
                      <strong className="text-slate-700 block font-bold text-[11px]">Objetivo General:</strong>
                      <p className="text-slate-800 mt-0.5">{detallesProj.objetivoGeneral || "N/A"}</p>
                    </div>

                    <div>
                      <strong className="text-slate-700 block font-bold text-[11px]">Objetivos Específicos:</strong>
                      {Array.isArray(detallesProj.objetivosEspecificos) ? (
                        <ul className="list-disc pl-4 space-y-1 text-slate-800 mt-1">
                          {detallesProj.objetivosEspecificos.map((obj: any, idx: number) => (
                            <li key={idx}>
                              {typeof obj === "object" && obj !== null ? (
                                <span>
                                  {obj.titulo && <strong>{obj.titulo}: </strong>}
                                  {obj.descripcion || JSON.stringify(obj)}
                                </span>
                              ) : (
                                String(obj)
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : typeof detallesProj.objetivosEspecificos === "object" && detallesProj.objetivosEspecificos !== null ? (
                        <p className="text-slate-800 mt-0.5">{JSON.stringify(detallesProj.objetivosEspecificos)}</p>
                      ) : (
                        <p className="text-slate-800 whitespace-pre-line mt-0.5">{String(detallesProj.objetivosEspecificos || "N/A")}</p>
                      )}
                    </div>

                    {detallesProj.alcance && (
                      <div>
                        <strong className="text-slate-700 block font-bold text-[11px]">Alcance:</strong>
                        <p className="text-slate-800 mt-0.5">{detallesProj.alcance}</p>
                      </div>
                    )}
                    {detallesProj.limitaciones && (
                      <div>
                        <strong className="text-slate-700 block font-bold text-[11px]">Limitaciones:</strong>
                        <p className="text-slate-800 mt-0.5">{detallesProj.limitaciones}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: DATOS DE LA EMPRESA / INSTITUCIÓN (PASANTÍAS) */}
            {!isMultiUserFlow && empresa && (
              <div className="space-y-4">
                <h2 className="text-base font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-wider">
                  3. INSTITUCIÓN O EMPRESA RECEPTORA
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <p><strong className="text-slate-700">Nombre Empresa:</strong> {empresa.nombre}</p>
                  <p><strong className="text-slate-700">Rubro:</strong> {empresa.rubro || "N/A"}</p>
                  {sucursal && <p><strong className="text-slate-700">Sucursal/Dirección:</strong> {sucursal.direccion}</p>}
                  {supervisor && <p><strong className="text-slate-700">Supervisor Asignado:</strong> {supervisor.nombreCompleto} ({supervisor.cargo})</p>}
                </div>
              </div>
            )}

            {/* SECCIÓN 4: CRONOGRAMA DE ACTIVIDADES */}
            {actividadesList.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-wider">
                  4. PLANIFICACIÓN DE ACTIVIDADES Y DIAGRAMA DE GANTT
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-300">
                    <thead className="bg-slate-100 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-2 border border-slate-300">N°</th>
                        <th className="p-2 border border-slate-300">Mes / Período</th>
                        <th className="p-2 border border-slate-300">Semana</th>
                        <th className="p-2 border border-slate-300">Descripción de la Actividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividadesList.map((act, i) => (
                        <tr key={act.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300 font-bold">{i + 1}</td>
                          <td className="p-2 border border-slate-300 font-medium">{act.periodo}</td>
                          <td className="p-2 border border-slate-300">{act.semana}</td>
                          <td className="p-2 border border-slate-300">{act.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* DIAGRAMA DE GANTT EXECUTIVE */}
                <div className="pt-3">
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-md bg-white">
                    {/* Header Title Bar */}
                    <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider">
                          Diagrama de Gantt - Cronograma de Ejecución
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1.5 font-medium bg-red-700/60 px-2.5 py-1 rounded-full border border-red-500/40">
                          <span className="w-2 h-2 rounded-full bg-red-300"></span>
                          Semana Programada
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider">
                            <th className="py-2 px-2 text-center w-16 border-r border-slate-700">Cód.</th>
                            <th className="py-2 px-3 text-left border-r border-slate-700">Actividad</th>
                            {Array.from(new Set(actividadesList.map((a) => a.periodo))).map((pNum) => (
                              <th key={pNum} colSpan={4} className="py-2 text-center border-r border-slate-700 bg-slate-900">
                                <span className="text-red-200 font-bold">MES {pNum}</span>
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-100 font-bold text-slate-600 text-[10px] border-b border-slate-300">
                            <th className="py-1 px-2 border-r border-slate-300" colSpan={2}>Semanas</th>
                            {Array.from(new Set(actividadesList.map((a) => a.periodo))).flatMap((pNum) =>
                              [1, 2, 3, 4].map((sNum) => (
                                <th key={`${pNum}-${sNum}`} className="py-1 text-center font-mono border-r border-slate-200 bg-slate-50 w-7">
                                  S{sNum}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {actividadesList.map((a, idx) => {
                            const allPeriods = Array.from(new Set(actividadesList.map((act) => act.periodo)));
                            const isEven = idx % 2 === 0;
                            return (
                              <tr key={a.id} className={`${isEven ? "bg-white" : "bg-slate-50/70"} hover:bg-slate-100/50`}>
                                <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono font-bold text-[10px]">
                                  <span className="inline-block bg-slate-100 text-red-900 border border-slate-300 px-1.5 py-0.5 rounded font-black">
                                    {a.periodo}.{a.semana}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 border-r border-slate-200" title={a.titulo || a.descripcion}>
                                  <span className="font-bold text-slate-800 text-xs block leading-tight">
                                    {a.titulo || a.descripcion}
                                  </span>
                                </td>
                                {allPeriods.flatMap((pNum) =>
                                  [1, 2, 3, 4].map((sNum) => {
                                    const active = a.periodo === pNum && a.semana === sNum;
                                    return (
                                      <td
                                        key={`${a.id}-${pNum}-${sNum}`}
                                        className="p-0 text-center border-r border-slate-200/50 h-7 align-middle"
                                      >
                                        {active ? (
                                          <div className="mx-1 my-0.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-[9px] rounded py-1 shadow-2xs flex items-center justify-center border border-red-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                          </div>
                                        ) : null}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>Total Actividades: <strong>{actividadesList.length}</strong></span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-gradient-to-r from-red-600 to-red-700 border border-red-500 inline-block"></span>
                          Ejecución Programada
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300 inline-block"></span>
                          Sin Actividad
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 5: DOCUMENTOS Y CERTIFICACIONES ADJUNTAS */}
            <div className="space-y-6">
              <h2 className="text-base font-black uppercase border-b-2 border-slate-900 pb-1 text-slate-900 tracking-wider">
                5. DOCUMENTOS Y CONSTANCIAS ADJUNTAS
              </h2>

              {carta?.archivoUrl && (
                <PdfToImagesViewer url={carta.archivoUrl} title="CARTA DE ACEPTACIÓN DE LA EMPRESA" />
              )}

              {docs.map((doc) => {
                if (!doc?.archivoUrl) return null;
                return (
                  <PdfToImagesViewer
                    key={doc.id}
                    url={doc.archivoUrl}
                    title={doc.tipo ? doc.tipo.toUpperCase() : "DOCUMENTO ADJUNTO"}
                  />
                );
              })}
            </div>

            {/* SECCIÓN 6: FIRMAS Y FECHA */}
            <div className="pt-8 border-t-2 border-slate-900 space-y-6">
              <p className="text-xs font-bold text-center text-slate-700">{formattedDate}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="h-24 w-full flex items-center justify-center border-b border-slate-400">
                    {(estudiante as any)?.firmaUrl ? (
                      <MediaZoomViewer url={(estudiante as any).firmaUrl} alt="Firma Estudiante" isSignature />
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin firma cargada</span>
                    )}
                  </div>
                  <p className="text-xs font-bold uppercase">{estudiante?.nombreCompleto}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">FIRMA DEL ESTUDIANTE</p>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="h-24 w-full flex items-center justify-center border-b border-slate-400">
                    <span className="text-xs text-slate-400 italic">Sello y Firma Decanato</span>
                  </div>
                  <p className="text-xs font-bold uppercase">DECANATO DE INGENIERÍA Y ARQUITECTURA</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">UNICAES</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Review Form & Collapsible History */}
        <div className="lg:col-span-4 space-y-6">
          <ReviewForm
            propuestaId={propuesta.id}
            estadoActual={propuesta.estado}
            coordinadores={coordinadoresList}
            initialCoordinadorId={propuesta.coordinadorId}
            initialObservaciones={propuesta.observaciones}
          />

          {/* HISTORIAL DE ACCIONES Y CAMBIOS DEL PROYECTO (ACORDEÓN COLAPSABLE) */}
          <HistorialProyectoAccordion
            historial={historialList.map((h) => ({
              id: h.historial.id,
              usuarioNombre: h.usuario ? `${h.usuario.nombreCompleto} (${h.usuario.rol})` : "Sistema",
              de: h.historial.de,
              a: h.historial.a,
              fechaStr: new Date(h.historial.creadoEn || "").toLocaleString("es-SV", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
