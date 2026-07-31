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

  const dateForMonth = propuesta.enviadaEn ? new Date(propuesta.enviadaEn) : new Date();
  const mesEnvioStr = new Intl.DateTimeFormat("es-SV", { month: "long" }).format(dateForMonth).toUpperCase();
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
        {/* Left Column: Exact Generated Document View (Formato Hoja de Impresión / PDF Foto) */}
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
                  HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN
                </h2>
                <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest">
                  MODALIDAD: {propuesta.tipo.toUpperCase()} (PROPUESTA #{propuesta.numero})
                </p>
              </div>

              {/* TÍTULO DE LA PROPUESTA BOX */}
              <div className="w-full max-w-xl mx-auto p-4 bg-slate-50 border border-slate-300 rounded-xl text-center space-y-1 shadow-2xs">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
                  TÍTULO DE LA PROPUESTA:
                </p>
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase leading-snug">
                  {propuesta.titulo || `TÍTULO DE PRUEBA - PROPUESTA #${propuesta.numero}`}
                </h3>
              </div>

              {/* DATOS ESTUDIANTE Y CARRERA */}
              <div className="space-y-2 text-sm sm:text-base font-bold text-slate-900">
                <p>
                  {isMultiUserFlow
                    ? isInvestigacion
                      ? "INVESTIGADOR PRINCIPAL: "
                      : "LÍDER DE PROYECTO: "
                    : "ESTUDIANTE: "}
                  <span className="uppercase font-black text-indigo-950">{estudiante?.nombreCompleto} ({estudiante?.carnet || "N/A"})</span>
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase">
                  <strong>TÍTULO AL QUE SE OPTA / CARRERA:</strong> {carreraNombre || "INGENIERÍA EN SISTEMAS"}
                </p>
                <p className="text-xs font-bold text-slate-600 uppercase">
                  <strong>MES DE ENVÍO:</strong> {mesEnvioStr}
                </p>
                {empresa && (
                  <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase">
                    <strong>EMPRESA:</strong> {empresa.nombre}
                  </p>
                )}
              </div>

              <div className="pt-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <p>FECHA DE PRESENTACIÓN:</p>
                <p className="text-slate-900 font-extrabold mt-0.5">{formattedDate}</p>
              </div>
            </div>

            {/* SECCIÓN DATOS EMPRESARIALES / DETALLES DE PROYECTO */}
            <div className="space-y-8 pt-4">
              <h2 className="text-lg font-black uppercase text-rose-700 border-b-2 border-rose-600 pb-2 tracking-wider">
                {isMultiUserFlow ? "DETALLES DEL PROYECTO E INVESTIGACIÓN" : "DATOS EMPRESARIALES"}
              </h2>

              {!isMultiUserFlow ? (
                /* PASANTÍA */
                <div className="space-y-6">
                  {/* 1. INFORMACIÓN DE LA EMPRESA */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      1. INFORMACIÓN DE LA EMPRESA
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <p><strong className="text-slate-900">Razón Social:</strong> {empresa?.nombre || "N/A"}</p>
                      <p><strong className="text-slate-900">Área:</strong> {empresa?.area || "N/A"}</p>
                      <p className="sm:col-span-2"><strong className="text-slate-900">Descripción:</strong> {empresa?.descripcion || "N/A"}</p>
                    </div>
                  </div>

                  {/* 2. UBICACIÓN Y SUCURSAL */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      2. UBICACIÓN Y SUCURSAL
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <p><strong className="text-slate-900">Sucursal:</strong> {sucursal?.nombre || "Matriz / Sede Central"}</p>
                      <p><strong className="text-slate-900">Teléfono:</strong> {sucursal?.telefono || "No especificado"}</p>
                      <p className="sm:col-span-2"><strong className="text-slate-900">Dirección:</strong> {sucursal?.direccion || "No especificada"}</p>
                    </div>
                  </div>

                  {/* 3. SUPERVISOR ASIGNADO */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      3. SUPERVISOR ASIGNADO
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <p><strong className="text-slate-900">Nombre:</strong> {supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "N/A"}</p>
                      <p><strong className="text-slate-900">Cargo:</strong> {supervisor?.cargo || "N/A"}</p>
                      <p><strong className="text-slate-900">Email:</strong> {supervisor?.correo || "N/A"}</p>
                      <p><strong className="text-slate-900">Teléfono:</strong> {supervisor?.telefono || "N/A"}</p>
                    </div>
                  </div>

                  {/* 4. CARTA DE ACEPTACIÓN */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      4. CARTA DE ACEPTACIÓN
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <p><strong className="text-slate-900">Fecha de Emisión:</strong> {carta?.fechaEmision || "N/A"}</p>
                      <p><strong className="text-slate-900">Período Pasantía:</strong> {carta?.fechaInicio || "N/A"} al {carta?.fechaFin || "N/A"}</p>
                    </div>

                    {(carta?.emisorFirmaUrl || supervisor?.firmaUrl) && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-900 mb-2">Firma Autorizada:</p>
                        <MediaZoomViewer
                          url={carta?.emisorFirmaUrl || supervisor?.firmaUrl}
                          title="Firma Autorizada"
                          isSignature={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. JUSTIFICACIÓN DEL PROYECTO */}
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      5. JUSTIFICACIÓN DEL PROYECTO
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {propuesta.justificacionProceso || "Sin justificación provista."}
                    </p>
                  </div>
                </div>
              ) : (
                /* PROYECTO / INVESTIGACIÓN MULTIUSER */
                <div className="space-y-6">
                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      1. INTEGRANTES DEL EQUIPO
                    </h3>
                    <div className="text-xs space-y-2">
                      <p className="font-bold text-slate-900">
                        Líder: {estudiante?.nombreCompleto} ({estudiante?.carnet || "N/A"})
                      </p>
                      {teamMembers.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1">
                          {teamMembers.map((t) => (
                            <li key={t.id}>{t.nombreCompleto} ({t.carnet})</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-900 rounded-lg p-4 space-y-3 bg-white">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      2. DESCRIPCIÓN Y JUSTIFICACIÓN
                    </h3>
                    <div className="text-xs space-y-3">
                      <div>
                        <strong className="block text-slate-900 mb-1">Descripción del Problema:</strong>
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{detallesProj?.descripcionProblema || "N/A"}</p>
                      </div>
                      <div>
                        <strong className="block text-slate-900 mb-1">Justificación:</strong>
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{detallesProj?.justificacion || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PLAN DE ACTIVIDADES */}
              <div className="space-y-4 pt-6 border-t-2 border-rose-600">
                <h2 className="text-lg font-black uppercase text-rose-700 tracking-wider">
                  PLAN DE ACTIVIDADES
                </h2>
                <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-800 uppercase">
                      <tr>
                        <th className="p-3 w-20 border-r border-slate-300 text-center">Mes</th>
                        <th className="p-3 w-28 border-r border-slate-300">Semana</th>
                        <th className="p-3 w-24 border-r border-slate-300 font-mono text-center">Código</th>
                        <th className="p-3">Actividad a desarrollar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Array.from(new Set(actividadesList.map((a) => a.periodo))).map((mes) => {
                        const actsMes = actividadesList.filter((a) => a.periodo === mes);
                        return actsMes.map((a, idx) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            {idx === 0 && (
                              <td
                                className="p-3 font-extrabold text-slate-900 border-r border-slate-300 align-top text-center bg-white"
                                rowSpan={actsMes.length}
                              >
                                Mes {mes}
                              </td>
                            )}
                            <td className="p-3 font-semibold border-r border-slate-300 whitespace-nowrap">Semana {a.semana}</td>
                            <td className="p-3 font-mono text-slate-500 border-r border-slate-300 text-center">{`${a.periodo}.${a.semana}.${a.numero || idx + 1}`}</td>
                            <td className="p-3 text-slate-800">{a.descripcion}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOCUMENTOS ANEXOS DEL ESTUDIANTE CONVERTI2 A FOTOS DE PÁGINA CON ZOOM */}
              {docs.length > 0 && (
                <div className="space-y-6 pt-8">
                  {docs.map((d) => (
                    <PdfToImagesViewer
                      key={d.id}
                      url={d.archivoUrl}
                      title={d.tipo.toUpperCase().replace("_", " ")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review Form & History Trail */}
        <div className="lg:col-span-4 space-y-6">
          <ReviewForm
            propuestaId={propuesta.id}
            estadoActual={propuesta.estado}
            coordinadores={coordinadoresList}
            initialCoordinadorId={propuesta.coordinadorId}
            initialObservaciones={propuesta.observaciones}
          />

          {/* HISTORIAL DE CAMBIOS Y ASIGNACIONES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Historial de Asignaciones y Cambios
            </h3>

            {historialList.length > 0 ? (
              <div className="space-y-3">
                {historialList.map((h) => {
                  const fechaStr = new Date(h.historial.creadoEn || "").toLocaleString("es-SV", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  const usuarioNombre = h.usuario ? `${h.usuario.nombreCompleto} (${h.usuario.rol})` : "Sistema";

                  return (
                    <div key={h.historial.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{usuarioNombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{fechaStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                          {h.historial.de || "inicio"} ➔ {h.historial.a}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay registros aún en el historial.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
