import { db } from "@/lib/db";
import { empresas, supervisores, sucursales, cartasAceptacion, actividades, documentosEgresado, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getActivePropuesta } from "@/app/actions/propuestas";
import { eq, and, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import PrintButton from "./PrintButton";

const getStaticMapUrl = (coords: string | null) => {
  if (!coords || !coords.includes(',')) return null;
  return `/api/map?coords=${coords}`;
};

export default async function PrintPropuestaPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // Get active proposal
  const data = await getActivePropuesta();
  if (!data || 'error' in data) {
    redirect("/egresado");
  }
  const { propuesta } = data;

  // Fetch relations
  let empresa = null;
  if (propuesta.empresaId) {
    const res = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId)).limit(1);
    empresa = res[0];
  }

  let supervisor = null;
  if (propuesta.supervisorId) {
    const res = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId)).limit(1);
    supervisor = res[0];
  }

  let sucursal = null;
  if (propuesta.sucursalId) {
    const res = await db.select().from(sucursales).where(eq(sucursales.id, propuesta.sucursalId)).limit(1);
    sucursal = res[0];
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const actividadesList = await db.select().from(actividades).where(eq(actividades.propuestaId, propuesta.id)).orderBy(asc(actividades.periodo), asc(actividades.numero));
  
  const student = await db.select().from(usuarios).where(eq(usuarios.id, session.userId)).limit(1);
  const studentName = student[0]?.nombreCompleto || "Estudiante";

  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, session.userId));

  // Date formatted
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = `SANTA ANA, ${today.toLocaleDateString('es-SV', options).toUpperCase()}`;

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="mx-auto bg-white p-8 print:p-0" style={{ maxWidth: '800px' }}>
        
        {/* Helper print button (hidden when printing) */}
        <div className="mb-8 flex justify-end print:hidden">
          <PrintButton />
        </div>

        {/* PAGE 1: PORTADA */}
        <div className="flex flex-col items-center justify-center min-h-[90vh] text-center" style={{ pageBreakAfter: 'always' }}>
          <h1 className="text-2xl font-bold uppercase tracking-widest mb-16">UNIVERSIDAD CATÓLICA DE EL SALVADOR</h1>
          
          <div className="mb-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/unicaes-logo.png" alt="UNICAES" className="w-64 h-64 object-contain mx-auto" />
          </div>
          
          <h2 className="text-xl font-bold uppercase tracking-wider mb-2">REPORTE DE PROPUESTA</h2>
          <h3 className="text-lg font-semibold text-gray-700 uppercase mb-16">ESTUDIANTE: {studentName}</h3>

          {empresa && (
            <div className="mb-16">
              <h2 className="text-xl font-bold uppercase mb-2">INFORMACIÓN EMPRESA:</h2>
              <p className="text-lg uppercase text-gray-800 font-medium">{empresa.nombre}</p>
            </div>
          )}
          
          <div className="mt-auto">
            <h2 className="text-xl font-bold uppercase mb-1">FECHA:</h2>
            <p className="text-lg uppercase font-medium">{formattedDate}</p>
          </div>
        </div>

        {/* PAGE 2: DATOS DE LA EMPRESA & SUPERVISOR */}
        <div style={{ pageBreakAfter: 'always' }} className="pt-8">
          <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">Datos Empresariales</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">1. Información de la Empresa</h3>
              {empresa ? (
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                  <p><span className="font-bold">Razón Social:</span> {empresa.nombre}</p>
                  <p><span className="font-bold">Área:</span> {empresa.area || 'No especificada'}</p>
                  <p className="col-span-2"><span className="font-bold">Descripción:</span> {empresa.descripcion}</p>
                </div>
              ) : <p className="text-sm italic text-gray-500">Pendiente</p>}
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">2. Ubicación y Sucursal</h3>
              <div className="text-sm border p-4 rounded bg-gray-50">
                {sucursal ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <p><span className="font-bold">Sucursal:</span> {sucursal.nombre}</p>
                      <p><span className="font-bold">Teléfono:</span> {sucursal.telefono || 'No especificado'}</p>
                      <p className="col-span-2"><span className="font-bold">Dirección:</span> {sucursal.direccion || 'No especificada'}</p>
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
                      <p className="col-span-2"><span className="font-bold">Dirección:</span> {empresa.direccion || 'No especificada'}</p>
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

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">3. Supervisor Asignado</h3>
              {supervisor ? (
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                  <p><span className="font-bold">Nombre:</span> {supervisor.nombres} {supervisor.apellidos}</p>
                  <p><span className="font-bold">Cargo:</span> {supervisor.cargo || 'No especificado'}</p>
                  <p><span className="font-bold">Email:</span> {supervisor.correo || 'No especificado'}</p>
                  <p><span className="font-bold">Teléfono:</span> {supervisor.telefono || 'No especificado'}</p>
                </div>
              ) : <p className="text-sm italic text-gray-500">Pendiente</p>}
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">4. Carta de Aceptación</h3>
              {carta ? (
                <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded bg-gray-50">
                  <p><span className="font-bold">Emisor:</span> {carta.emisorNombre}</p>
                  <p><span className="font-bold">Cargo Emisor:</span> {carta.emisorCargo}</p>
                  <p><span className="font-bold">Fecha de Emisión:</span> {carta.fechaEmision}</p>
                  <p><span className="font-bold">Período Pasantía:</span> {carta.fechaInicio} al {carta.fechaFin}</p>
                </div>
              ) : <p className="text-sm italic text-gray-500">Pendiente</p>}
            </section>

            <section>
              <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">5. Justificación del Proyecto</h3>
              <div className="text-sm border p-4 rounded bg-gray-50 whitespace-pre-wrap">
                {propuesta.justificacionProceso || <span className="italic text-gray-500">Pendiente</span>}
              </div>
            </section>
          </div>
        </div>

        {/* PAGE 3: CRONOGRAMA DE ACTIVIDADES */}
        <div style={{ pageBreakAfter: 'always' }} className="pt-8">
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
                {actividadesList.map(a => (
                  <tr key={a.id}>
                    <td className="border border-gray-300 p-2 text-center font-bold">Mes {a.periodo}</td>
                    <td className="border border-gray-300 p-2 text-center">Semana {a.semana}</td>
                    <td className="border border-gray-300 p-2 text-center text-gray-500 font-mono">{a.periodo}.{a.semana}.{a.numero}</td>
                    <td className="border border-gray-300 p-2">{a.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm italic text-gray-500">Sin actividades registradas.</p>
          )}
        </div>

        {/* IMAGES & DOCS (Each on new page if it's an image) */}
        {docs.length > 0 && docs.map(doc => {
          if (!doc.archivoUrl?.startsWith('data:image')) return null;
          
          const getTitle = (tipo: string) => {
            switch(tipo) {
              case 'pago_tg': return 'HOJA DE INSCRIPCIÓN DE TRABAJO DE GRADUACIÓN';
              case 'certificacion_notas': return 'CONSTANCIA DE HORAS SOCIALES';
              case 'servicio_social': return 'CARTA DE SERVICIO SOCIAL';
              default: return 'DOCUMENTO';
            }
          };

          return (
            <div key={doc.id} style={{ pageBreakAfter: 'always' }} className="pt-8 flex flex-col items-center">
              <h2 className="text-lg font-bold uppercase mb-8 border-b-2 border-brand-red pb-2 w-full text-center">
                {getTitle(doc.tipo)}
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.archivoUrl} alt={doc.tipo} className="max-w-full max-h-[800px] object-contain border shadow-sm" />
            </div>
          );
        })}

        {carta?.archivoUrl?.startsWith('data:image') && (
          <div style={{ pageBreakAfter: 'always' }} className="pt-8 flex flex-col items-center">
            <h2 className="text-lg font-bold uppercase mb-8 border-b-2 border-brand-red pb-2 w-full text-center">
              CARTA DE ACEPTACIÓN
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={carta.archivoUrl} alt="Carta de Aceptación" className="max-w-full max-h-[800px] object-contain border shadow-sm" />
          </div>
        )}

      </div>

      {/* Script to auto-print */}
      <script dangerouslySetInnerHTML={{ __html: `
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      `}} />
    </div>
  );
}
