import { db } from "@/lib/db";
import {
  empresas,
  supervisores,
  sucursales,
  cartasAceptacion,
  actividades,
  documentosEgresado,
  usuarios,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getActivePropuesta } from "@/app/actions/propuestas";
import { getEquipoProyecto, getDetallesProyecto } from "@/app/actions/proyecto";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import PrintButton from "./PrintButton";
import PdfToImagesViewer from "@/components/PdfToImagesViewer";

const getStaticMapUrl = (coords: string | null) => {
  if (!coords || !coords.includes(",")) return null;
  return `/api/map?coords=${coords}`;
};

export default async function PrintPropuestaPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // Get active proposal
  const data = await getActivePropuesta();
  if (!data || "error" in data) {
    redirect("/egresado");
  }
  const { propuesta } = data;

  const isProyecto = propuesta.tipo === "proyecto";
  const isInvestigacion = propuesta.tipo === "investigacion";
  const isMultiUserFlow = isProyecto || isInvestigacion;

  // Fetch student info
  const studentRows = await db.select().from(usuarios).where(eq(usuarios.id, session.userId)).limit(1);
  const student = studentRows[0];
  const studentName = student?.nombreCompleto || "Estudiante";

  // Fetch relations for Pasantía, Proyecto or Investigación
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
      .orderBy(asc(actividades.periodo), asc(actividades.numero));
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));

  // Date formatted
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const formattedDate = `SANTA ANA, ${today.toLocaleDateString("es-SV", options).toUpperCase()}`;

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="mx-auto bg-white p-8 print:p-0" style={{ maxWidth: "800px" }}>
        {/* Helper print button */}
        <div className="mb-8 flex justify-end print:hidden">
          <PrintButton />
        </div>

        {/* ────────────────── PORTADA ────────────────── */}
        <div className="flex flex-col items-center justify-center min-h-[90vh] text-center" style={{ pageBreakAfter: "always" }}>
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-12">UNIVERSIDAD CATÓLICA DE EL SALVADOR</h1>

          <div className="mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="UNICAES" className="w-56 h-56 object-contain mx-auto" />
          </div>

          <h2 className="text-xl font-bold uppercase tracking-wider mb-2">
            HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN
          </h2>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">
            MODALIDAD: {propuesta.tipo.toUpperCase()}
          </p>

          <div className="mb-12 space-y-2">
            <h3 className="text-lg font-bold text-gray-900 uppercase">
              {isMultiUserFlow ? (isInvestigacion ? "INVESTIGADOR PRINCIPAL: " : "LÍDER DE PROYECTO: ") : "ESTUDIANTE: "} {studentName} ({student?.carnet || "N/A"})
            </h3>

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

        {/* ────────────────── CONTENIDO PROYECTO / INVESTIGACIÓN ────────────────── */}
        {isMultiUserFlow ? (
          <>
            {/* PAGE 2: ACTORES INTERVINIENTES */}
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

            {/* PAGE 3: CARTA DE ACEPTACIÓN */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                2. Carta de Aceptación {isInvestigacion ? "de la Investigación" : "del Proyecto"}
              </h2>

              {carta ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50 print:break-inside-avoid">
                    <p><span className="font-bold">Fecha de Emisión:</span> {carta.fechaEmision}</p>
                    <p><span className="font-bold">Período:</span> {carta.fechaInicio} al {carta.fechaFin}</p>
                    <p className="col-span-2"><span className="font-bold">Supervisor Encargado:</span> {carta.supTitulo ? `${carta.supTitulo} ` : ""}{carta.supNombres} {carta.supApellidos}</p>
                    <p className="col-span-2"><span className="font-bold">Cargo del Supervisor:</span> {carta.supCargo}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-gray-500">Carta de aceptación pendiente de registro.</p>
              )}
            </div>

            {/* PAGE 4: DESCRIPCIÓN DEL PROBLEMA */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                3. Descripción del Problema o la Oportunidad {isInvestigacion ? "a ser Investigada" : ""}
              </h2>

              <div className="text-sm border p-5 rounded bg-gray-50 leading-relaxed whitespace-pre-wrap print:break-inside-avoid">
                {detallesProj?.descripcionProblema || <span className="italic text-gray-400">No especificada</span>}
              </div>
            </div>

            {/* PAGE 5: JUSTIFICACIÓN */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">
                4. Justificación {isInvestigacion ? "de la Investigación" : "del Proyecto"}
              </h2>

              <div className="text-sm border p-5 rounded bg-gray-50 leading-relaxed whitespace-pre-wrap print:break-inside-avoid">
                {detallesProj?.justificacion || <span className="italic text-gray-400">No especificada</span>}
              </div>
            </div>

            {/* PAGE 6: ALCANCE (ONLY FOR PROYECTO) */}
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

            {/* PAGE 7: OBJETIVOS */}
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
          /* ────────────────── CONTENIDO PASANTÍA ────────────────── */
          <>
            {/* PAGE 2: DATOS DE LA EMPRESA & SUPERVISOR */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">Datos Empresariales</h2>

              <div className="space-y-6">
                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">1. Información de la Empresa</h3>
                  {empresa ? (
                    <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                      <p><span className="font-bold">Razón Social:</span> {empresa.nombre}</p>
                      <p><span className="font-bold">Área:</span> {empresa.area || "No especificada"}</p>
                      <p className="col-span-2"><span className="font-bold">Descripción:</span> {empresa.descripcion}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Pendiente</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">2. Ubicación y Sucursal</h3>
                  <div className="text-sm border p-4 rounded bg-gray-50">
                    {sucursal ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <p><span className="font-bold">Sucursal:</span> {sucursal.nombre}</p>
                          <p><span className="font-bold">Teléfono:</span> {sucursal.telefono || "No especificado"}</p>
                          <p className="col-span-2"><span className="font-bold">Dirección:</span> {sucursal.direccion || "No especificada"}</p>
                        </div>
                        {sucursal.mapaUrl && getStaticMapUrl(sucursal.mapaUrl) && (
                          <div className="mt-2 border-t border-gray-200 pt-4">
                            <span className="font-bold block mb-2">Captura de Mapa (Sucursal):</span>
                            <div className="border border-gray-300 p-1 rounded bg-white h-[300px] flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getStaticMapUrl(sucursal.mapaUrl)!} alt="Mapa Sucursal" className="w-full h-full object-cover rounded" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : empresa ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <p><span className="font-bold">Sucursal:</span> Matriz / Sede Central</p>
                          <p><span className="font-bold">Teléfono:</span> No especificado</p>
                          <p className="col-span-2"><span className="font-bold">Dirección:</span> {empresa.direccion || "No especificada"}</p>
                        </div>
                        {empresa.mapaUrl && getStaticMapUrl(empresa.mapaUrl) && (
                          <div className="mt-2 border-t border-gray-200 pt-4">
                            <span className="font-bold block mb-2">Captura de Mapa (Matriz):</span>
                            <div className="border border-gray-300 p-1 rounded bg-white h-[300px] flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getStaticMapUrl(empresa.mapaUrl)!} alt="Mapa Matriz" className="w-full h-full object-cover rounded" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm italic text-gray-500">Pendiente</p>
                    )}
                  </div>
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">3. Supervisor Asignado</h3>
                  {supervisor ? (
                    <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                      <p><span className="font-bold">Nombre:</span> {supervisor.nombres} {supervisor.apellidos}</p>
                      <p><span className="font-bold">Cargo:</span> {supervisor.cargo || "No especificado"}</p>
                      <p><span className="font-bold">Email:</span> {supervisor.correo || "No especificado"}</p>
                      <p><span className="font-bold">Teléfono:</span> {supervisor.telefono || "No especificado"}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Pendiente</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">4. Carta de Aceptación</h3>
                  {carta ? (
                    <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                      <p><span className="font-bold">Fecha de Emisión:</span> {carta.fechaEmision}</p>
                      <p><span className="font-bold">Período Pasantía:</span> {carta.fechaInicio} al {carta.fechaFin}</p>
                      {carta.emisorFirmaUrl ? (
                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                          <p className="font-bold mb-2">Firma Autorizada:</p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={carta.emisorFirmaUrl} alt="Firma" className="max-h-24 object-contain mix-blend-multiply" />
                        </div>
                      ) : (
                        <>
                          <p><span className="font-bold">Emisor:</span> {carta.emisorNombre}</p>
                          <p><span className="font-bold">Cargo Emisor:</span> {carta.emisorCargo}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Pendiente</p>
                  )}
                </section>

                <section className="print:break-inside-avoid mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">5. Justificación del Proyecto</h3>
                  <div className="text-sm border p-4 rounded bg-gray-50 whitespace-pre-wrap">
                    {propuesta.justificacionProceso || <span className="italic text-gray-500">Pendiente</span>}
                  </div>
                </section>
              </div>
            </div>

            {/* PAGE 3: CRONOGRAMA DE ACTIVIDADES */}
            <div style={{ pageBreakAfter: "always" }} className="pt-8">
              <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">Plan de Actividades</h2>

              {actividadesList.length > 0 ? (
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-2 text-center w-24">Mes</th>
                      <th className="border border-gray-300 p-2 text-center w-24">Semana</th>
                      <th className="border border-gray-300 p-2 text-center w-24">Código</th>
                      <th className="border border-gray-300 p-2 text-left">Actividad a desarrollar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(actividadesList.map((a) => a.periodo))).map((mes) => {
                      const actsMes = actividadesList.filter((a) => a.periodo === mes);
                      return actsMes.map((a, index) => (
                        <tr key={a.id}>
                          {index === 0 && (
                            <td className="border border-gray-300 p-2 text-center font-bold align-middle bg-white" rowSpan={actsMes.length}>
                              Mes {mes}
                            </td>
                          )}
                          <td className="border border-gray-300 p-2 text-center">Semana {a.semana}</td>
                          <td className="border border-gray-300 p-2 text-center text-gray-500 font-mono">
                            {a.periodo}.{a.semana}.{a.numero}
                          </td>
                          <td className="border border-gray-300 p-2">{a.descripcion}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm italic text-gray-500">Sin actividades registradas.</p>
              )}
            </div>
          </>
        )}

        {/* ────────────────── ADJUNTOS Y DOCUMENTOS ────────────────── */}
        {docs.length > 0 &&
          docs.map((doc) => {
            const getTitle = (tipo: string) => {
              switch (tipo) {
                case "pago_tg":
                  return "HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN";
                case "certificacion_notas":
                  return "CONSTANCIA DE HORAS SOCIALES";
                case "servicio_social":
                  return "CARTA DE SERVICIO SOCIAL";
                default:
                  return "DOCUMENTO ADJUNTO";
              }
            };

            const title = getTitle(doc.tipo);
            const isImage = doc.archivoUrl?.startsWith("data:image");

            return isImage ? (
              <div key={doc.id} style={{ pageBreakAfter: "always" }} className="pt-8 flex flex-col items-center">
                <h2 className="text-lg font-bold uppercase mb-8 border-b-2 border-brand-red pb-2 w-full text-center">
                  {title}
                </h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doc.archivoUrl} alt={doc.tipo} className="max-w-full max-h-[800px] object-contain border shadow-sm" />
              </div>
            ) : (
              <PdfToImagesViewer key={doc.id} url={doc.archivoUrl} title={title} />
            );
          })}

        {carta?.archivoUrl && (
          carta.archivoUrl.startsWith("data:image") ? (
            <div style={{ pageBreakAfter: "always" }} className="pt-8 flex flex-col items-center">
              <h2 className="text-lg font-bold uppercase mb-8 border-b-2 border-brand-red pb-2 w-full text-center">
                CARTA DE ACEPTACIÓN
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={carta.archivoUrl} alt="Carta de Aceptación" className="max-w-full max-h-[800px] object-contain border shadow-sm" />
            </div>
          ) : (
            <PdfToImagesViewer url={carta.archivoUrl} title="CARTA DE ACEPTACIÓN" />
          )
        )}
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.print();
          }, 2500);
        }
      `,
        }}
      />
    </div>
  );
}
