import Link from "next/link";
import { db } from "@/lib/db";
import {
  propuestas,
  empresas,
  supervisores,
  sucursales,
  cartasAceptacion,
  actividades,
  documentosEgresado,
  usuarios,
  carreras,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getEquipoProyecto, getDetallesProyecto } from "@/app/actions/proyecto";
import { eq, asc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import PrintButton from "@/app/egresado/redactar/imprimir/PrintButton";
import PdfToImagesViewer from "@/components/PdfToImagesViewer";

const getStaticMapUrl = (coords: string | null) => {
  if (!coords || !coords.includes(",")) return null;
  return `/api/map?coords=${coords}`;
};

export default async function AdminPrintPropuestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "decanato" && session.rol !== "coordinador")) {
    redirect("/login");
  }

  const p = await params;
  const pId = parseInt(p.id, 10);
  if (isNaN(pId)) return notFound();

  const [propData] = await db.select().from(propuestas).where(eq(propuestas.id, pId)).limit(1);
  if (!propData) return notFound();

  const propuesta = propData;
  const isProyecto = propuesta.tipo === "proyecto";
  const isInvestigacion = propuesta.tipo === "investigacion";
  const isMultiUserFlow = isProyecto || isInvestigacion;

  // Fetch student info
  const [student] = await db
    .select({
      id: usuarios.id,
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      carrera: carreras.nombre,
    })
    .from(usuarios)
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(usuarios.id, propuesta.egresadoId))
    .limit(1);

  const studentName = student?.nombreCompleto || "Estudiante";
  const carreraNombre = student?.carrera || "Carrera no especificada";

  const dateForMonth = propuesta.enviadaEn ? new Date(propuesta.enviadaEn) : new Date();
  const mesEnvioStr = new Intl.DateTimeFormat("es-SV", { month: "long" }).format(dateForMonth).toUpperCase();

  let empresa: any = null;
  let supervisor: any = null;
  let sucursal: any = null;
  let actividadesList: any[] = [];
  let teamMembers: any[] = [];
  let detallesProj: any = null;

  if (isMultiUserFlow) {
    teamMembers = await getEquipoProyecto(propuesta.id);
    detallesProj = await getDetallesProyecto(propuesta.id);
  } else {
    if (propuesta.empresaId) {
      const res = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId)).limit(1);
      empresa = res[0];
    }

    if (propuesta.supervisorId) {
      const res = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId)).limit(1);
      supervisor = res[0];
    }

    if (propuesta.sucursalId) {
      const res = await db.select().from(sucursales).where(eq(sucursales.id, propuesta.sucursalId)).limit(1);
      sucursal = res[0];
    }

    actividadesList = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuesta.id))
      .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const backUrl = session.rol === "coordinador" ? "/coordinador" : (session.rol === "decanato" ? "/decanato/propuestas" : `/admin/propuestas/${propuesta.id}`);

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="mx-auto bg-white p-8 print:p-0" style={{ maxWidth: "800px" }}>
        {/* Helper navigation and print buttons */}
        <div className="mb-8 flex justify-between items-center print:hidden">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Revisión
          </Link>
          <PrintButton />
        </div>

        {/* ────────────────── PORTADA ────────────────── */}
        <div className="flex flex-col items-center justify-center min-h-[90vh] text-center" style={{ pageBreakAfter: "always" }}>
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-12">UNIVERSIDAD CATÓLICA DE EL SALVADOR</h1>

          <div className="mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="UNICAES" className="w-56 h-56 object-contain mx-auto" />
            <p className="text-xs font-bold text-gray-500 italic mt-2">&ldquo;La Ciencia sin Moral es Vana&rdquo;</p>
          </div>

          <h2 className="text-xl font-bold uppercase tracking-wider mb-2">
            HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN
          </h2>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">
            MODALIDAD: {propuesta.tipo.toUpperCase()} (PROPUESTA #{propuesta.numero})
          </p>

          <div className="mb-8 p-4 bg-gray-50 border border-gray-300 rounded-lg max-w-xl mx-auto w-full text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              TÍTULO DE LA PROPUESTA:
            </p>
            <h3 className="text-base font-extrabold text-gray-900 uppercase leading-snug">
              {propuesta.titulo || `Propuesta #${propuesta.numero}`}
            </h3>
          </div>

          <div className="mb-12 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 uppercase">
              {isMultiUserFlow ? (isInvestigacion ? "INVESTIGADOR PRINCIPAL: " : "LÍDER DE PROYECTO: ") : "ESTUDIANTE: "} {studentName} ({student?.carnet || "N/A"})
            </h3>

            <p className="text-sm font-semibold text-gray-700 uppercase">
              <strong>TÍTULO AL QUE SE OPTA / CARRERA:</strong> {carreraNombre}
            </p>

            <p className="text-sm font-semibold text-gray-700 uppercase">
              <strong>MES DE ENVÍO:</strong> {mesEnvioStr}
            </p>

            {isMultiUserFlow && teamMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Integrantes del Equipo:</p>
                <div className="space-y-1">
                  {teamMembers.map((m) => (
                    <p key={m.id} className="text-sm font-medium text-gray-800">
                      {m.nombreCompleto} ({m.carnet || "Sin carnet"}) - <span className="text-xs italic uppercase text-emerald-700">{m.estado}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {!isMultiUserFlow && empresa && (
              <div className="mt-6">
                <h2 className="text-md font-bold uppercase mb-1">EMPRESA:</h2>
                <p className="text-lg uppercase text-gray-800 font-medium">{empresa.nombre}</p>
              </div>
            )}
          </div>

          <div className="mt-auto">
            <h2 className="text-sm font-bold uppercase mb-1 text-gray-600">FECHA DE PRESENTACIÓN:</h2>
            <p className="text-md uppercase font-medium">{formattedDate}</p>
          </div>
        </div>

        {/* ────────────────── CONTENIDO PASANTÍA O PROYECTO ────────────────── */}
        {isMultiUserFlow ? (
          <>
            {/* PASO 1: ACTORES INTERVINIENTES */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                1. Actores Intervinientes {isInvestigacion ? "de la Investigación" : "del Proyecto"}
              </h2>

              <div className="space-y-6">
                <section className="print:break-inside-avoid border p-4 rounded bg-gray-50">
                  <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">Patrocinador</h3>
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {detallesProj?.actorPatrocinador || <span className="italic text-gray-400">No especificado</span>}
                  </p>
                </section>

                <section className="print:break-inside-avoid border p-4 rounded bg-gray-50">
                  <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">{isInvestigacion ? "Investigador" : "Beneficiario"}</h3>
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {detallesProj?.actorBeneficiario || <span className="italic text-gray-400">No especificado</span>}
                  </p>
                </section>

                {!isInvestigacion && (
                  <section className="print:break-inside-avoid border p-4 rounded bg-gray-50">
                    <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">Ejecutor</h3>
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {detallesProj?.actorEjecutor || <span className="italic text-gray-400">No especificado</span>}
                    </p>
                  </section>
                )}

                <section className="print:break-inside-avoid border p-4 rounded bg-gray-50">
                  <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">Financista</h3>
                  <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {detallesProj?.actorFinancista || <span className="italic text-gray-400">No especificado</span>}
                  </p>
                </section>
              </div>
            </div>

            {/* PASO 2: CARTA DE ACEPTACIÓN */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                2. Carta de Aceptación {isInvestigacion ? "de la Investigación" : "del Proyecto"}
              </h2>

              {carta ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50 print:break-inside-avoid">
                    <p><span className="font-bold">Fecha de Emisión:</span> {carta.fechaEmision || "N/A"}</p>
                    <p><span className="font-bold">Período:</span> {carta.fechaInicio || "N/A"} al {carta.fechaFin || "N/A"}</p>
                    <p className="col-span-2"><span className="font-bold">Supervisor Encargado:</span> {carta.emisorNombre || "N/A"}</p>
                    <p className="col-span-2"><span className="font-bold">Cargo del Supervisor:</span> {carta.emisorCargo || "N/A"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-gray-500">Carta de aceptación pendiente de registro.</p>
              )}
            </div>

            {/* PASO 3: DESCRIPCIÓN DEL PROBLEMA */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                3. Descripción del Problema o la Oportunidad {isInvestigacion ? "a ser Investigada" : ""}
              </h2>

              <div className="text-sm border p-5 rounded bg-gray-50 leading-relaxed whitespace-pre-wrap print:break-inside-avoid">
                {detallesProj?.descripcionProblema || <span className="italic text-gray-400">No especificada</span>}
              </div>
            </div>

            {/* PASO 4: JUSTIFICACIÓN */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                4. Justificación {isInvestigacion ? "de la Investigación" : "del Proyecto"}
              </h2>

              <div className="text-sm border p-5 rounded bg-gray-50 leading-relaxed whitespace-pre-wrap print:break-inside-avoid">
                {detallesProj?.justificacion || <span className="italic text-gray-400">No especificada</span>}
              </div>
            </div>

            {/* PASO 5: ALCANCE (SOLO PROYECTO) */}
            {!isInvestigacion && (
              <div style={{ pageBreakAfter: "always" }} className="pt-8">
                <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                  5. Alcance del Proyecto
                </h2>

                <div className="text-sm border p-5 rounded bg-gray-50 leading-relaxed whitespace-pre-wrap print:break-inside-avoid">
                  {detallesProj?.alcance || <span className="italic text-gray-400">No especificado</span>}
                </div>
              </div>
            )}

            {/* PASO 6 / 7: OBJETIVOS */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                {isInvestigacion ? "5. Objetivos de la Investigación" : "6. Objetivos del Proyecto"}
              </h2>

              <div className="space-y-6">
                <section className="print:break-inside-avoid border p-4 rounded bg-gray-50">
                  <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">Objetivo General</h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {detallesProj?.objetivoGeneral || <span className="italic text-gray-400">No especificado</span>}
                  </p>
                </section>

                <section className="print:break-inside-avoid">
                  <h3 className="text-md font-bold text-gray-900 mb-3 uppercase">Objetivos Específicos</h3>
                  {Array.isArray(detallesProj?.objetivosEspecificos) && detallesProj.objetivosEspecificos.length > 0 ? (
                    <table className="w-full text-sm border-collapse border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 p-2 text-center w-12">#</th>
                          <th className="border border-gray-300 p-2 text-left w-1/3">Título</th>
                          <th className="border border-gray-300 p-2 text-left">Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detallesProj.objetivosEspecificos.map((obj: any, idx: number) => (
                          <tr key={idx}>
                            <td className="border border-gray-300 p-2 text-center font-bold">{idx + 1}</td>
                            <td className="border border-gray-300 p-2 font-semibold">{obj.titulo}</td>
                            <td className="border border-gray-300 p-2">{obj.descripcion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm italic text-gray-500">Sin objetivos específicos registrados.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : (
          /* PASANTÍA */
          <>
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">DATOS EMPRESARIALES</h2>

              <div className="space-y-6">
                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">1. Información de la Empresa</h3>
                  {empresa ? (
                    <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                      <p><span className="font-bold">Razón Social:</span> {empresa.nombre}</p>
                      <p><span className="font-bold">Área:</span> {empresa.area || "No especificada"}</p>
                      <p className="col-span-2"><span className="font-bold">Descripción:</span> {empresa.descripcion || "N/A"}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Pendiente de registro</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">2. Ubicación y Sucursal</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                    <p><span className="font-bold">Sucursal:</span> {sucursal?.nombre || "Matriz / Sede Central"}</p>
                    <p><span className="font-bold">Teléfono:</span> {sucursal?.telefono || "No especificado"}</p>
                    <p className="col-span-2"><span className="font-bold">Dirección:</span> {sucursal?.direccion || "No especificada"}</p>
                  </div>
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">3. Supervisor Asignado</h3>
                  {supervisor ? (
                    <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                      <p><span className="font-bold">Nombre:</span> {supervisor.nombres} {supervisor.apellidos}</p>
                      <p><span className="font-bold">Cargo:</span> {supervisor.cargo || "Supervisor"}</p>
                      <p><span className="font-bold">Email:</span> {supervisor.correo || "N/A"}</p>
                      <p><span className="font-bold">Teléfono:</span> {supervisor.telefono || "N/A"}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Supervisor no asignado.</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">4. Carta de Aceptación</h3>
                  {carta ? (
                    <div className="space-y-4 border p-4 rounded bg-gray-50 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <p><span className="font-bold">Fecha de Emisión:</span> {carta.fechaEmision || "N/A"}</p>
                        <p><span className="font-bold">Período Pasantía:</span> {carta.fechaInicio || "N/A"} al {carta.fechaFin || "N/A"}</p>
                      </div>
                      {(carta.emisorFirmaUrl || supervisor?.firmaUrl) && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="font-bold mb-1">Firma Autorizada:</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={carta.emisorFirmaUrl || supervisor?.firmaUrl} alt="Firma" className="max-h-24 object-contain" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Carta no registrada.</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">5. Justificación del Proyecto</h3>
                  <div className="border p-4 rounded bg-gray-50 text-sm leading-relaxed whitespace-pre-wrap">
                    {propuesta.justificacionProceso || "Sin justificación provista."}
                  </div>
                </section>
              </div>
            </div>

            {/* PLAN DE ACTIVIDADES */}
            {actividadesList.length > 0 && (
              <div style={{ pageBreakAfter: "always" }} className="pt-8">
                <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">PLAN DE ACTIVIDADES</h2>

                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100 font-bold text-gray-900">
                    <tr>
                      <th className="border border-gray-300 p-2.5 text-center w-16">Mes</th>
                      <th className="border border-gray-300 p-2.5 text-center w-24">Semana</th>
                      <th className="border border-gray-300 p-2.5 text-center w-20">Código</th>
                      <th className="border border-gray-300 p-2.5 text-left">Actividad a desarrollar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(actividadesList.map((a) => a.periodo))).map((mes) => {
                      const actsMes = actividadesList.filter((a) => a.periodo === mes);
                      return actsMes.map((a, idx) => (
                        <tr key={a.id}>
                          {idx === 0 && (
                            <td
                              className="border border-gray-300 p-2.5 font-bold text-center align-top bg-white"
                              rowSpan={actsMes.length}
                            >
                              Mes {mes}
                            </td>
                          )}
                          <td className="border border-gray-300 p-2.5 text-center">Semana {a.semana}</td>
                          <td className="border border-gray-300 p-2.5 text-center font-mono text-xs">{`${a.periodo}.${a.semana}.${a.numero || idx + 1}`}</td>
                          <td className="border border-gray-300 p-2.5 text-gray-800">{a.descripcion}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* DOCUMENTOS ADJUNTOS CONVERTI2 A FOTOS DE PÁGINA */}
        {docs.length > 0 && (
          <div className="pt-8 space-y-6">
            {docs.map((d) => (
              <PdfToImagesViewer key={d.id} url={d.archivoUrl} title={d.tipo.toUpperCase().replace("_", " ")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
