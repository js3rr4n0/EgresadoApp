import { db } from "@/lib/db";
import { propuestas, usuarios, empresas, sucursales, supervisores, cartasAceptacion, actividades, documentosEgresado } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReviewForm from "./ReviewForm";

export default async function AdminPropuestaReviewPage({ params }: { params: { id: string } }) {
  const pId = parseInt(params.id);
  if (isNaN(pId)) redirect("/admin/propuestas");

  const [propuestaInfo] = await db.select({
    propuesta: propuestas,
    estudiante: usuarios,
  })
  .from(propuestas)
  .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
  .where(eq(propuestas.id, pId))
  .limit(1);

  if (!propuestaInfo) redirect("/admin/propuestas");

  const { propuesta, estudiante } = propuestaInfo;

  let empresa = null;
  if (propuesta.empresaId) {
    const res = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId)).limit(1);
    empresa = res[0];
  }

  let sucursal = null;
  if (propuesta.sucursalId) {
    const res = await db.select().from(sucursales).where(eq(sucursales.id, propuesta.sucursalId)).limit(1);
    sucursal = res[0];
  }

  let supervisor = null;
  if (propuesta.supervisorId) {
    const res = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId)).limit(1);
    supervisor = res[0];
  }

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuesta.id)).limit(1);
  const actividadesList = await db.select().from(actividades).where(eq(actividades.propuestaId, propuesta.id)).orderBy(asc(actividades.periodo), asc(actividades.numero));
  
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));

  const asesoresList = await db.select().from(usuarios).where(eq(usuarios.rol, "asesor"));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/propuestas" className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-muted hover:text-card-dark hover:border-card-dark transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-card-dark">Revisión de Propuesta</h1>
          <p className="text-muted text-sm">Estudiante: {estudiante?.nombreCompleto}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Info (Like PDF) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-border p-6 lg:p-8">
            <h2 className="text-xl font-bold border-b border-border pb-4 mb-6 text-card-dark uppercase tracking-widest">Información de la Propuesta</h2>
            
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Datos Empresariales</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-border">
                  <p><span className="font-bold">Empresa:</span> {empresa?.nombre || 'N/A'}</p>
                  <p><span className="font-bold">Área:</span> {empresa?.area || 'N/A'}</p>
                  <p className="col-span-2"><span className="font-bold">Sucursal:</span> {sucursal ? `${sucursal.nombre} (${sucursal.direccion})` : 'Matriz'}</p>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Supervisor Asignado</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-border">
                  <p><span className="font-bold">Nombre:</span> {supervisor?.nombres} {supervisor?.apellidos}</p>
                  <p><span className="font-bold">Cargo:</span> {supervisor?.cargo}</p>
                  <p><span className="font-bold">Teléfono:</span> {supervisor?.telefono}</p>
                  <p><span className="font-bold">Correo:</span> {supervisor?.correo}</p>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Carta de Aceptación</h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-border">
                  <p><span className="font-bold">Emisor:</span> {carta?.emisorNombre}</p>
                  <p><span className="font-bold">Cargo:</span> {carta?.emisorCargo}</p>
                  <p><span className="font-bold">Período:</span> {carta?.fechaInicio} al {carta?.fechaFin}</p>
                  <div className="col-span-2">
                    {carta?.archivoUrl && (
                      <a href={carta.archivoUrl} target="_blank" rel="noreferrer" className="text-brand-red font-bold hover:underline inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Ver Documento Carta de Aceptación
                      </a>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Justificación del Proyecto</h3>
                <div className="text-sm bg-slate-50 p-4 rounded-lg border border-border whitespace-pre-wrap">
                  {propuesta.justificacionProceso || 'Pendiente'}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Plan de Actividades</h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr>
                        <th className="pb-2 font-bold w-20">Mes</th>
                        <th className="pb-2 font-bold w-20">Semana</th>
                        <th className="pb-2 font-bold">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {actividadesList.map(a => (
                        <tr key={a.id}>
                          <td className="py-2">Mes {a.periodo}</td>
                          <td className="py-2">Semana {a.semana}</td>
                          <td className="py-2">{a.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted mb-2 uppercase">Documentos del Estudiante</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {docs.map(d => (
                    <a key={d.id} href={d.archivoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-border hover:border-brand-red transition-colors">
                      <svg className="w-5 h-5 text-brand-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-sm font-bold uppercase truncate">{d.tipo.replace('_', ' ')}</span>
                    </a>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Right Col: Review Form */}
        <div className="lg:col-span-1">
          <ReviewForm 
            propuestaId={propuesta.id}
            estadoActual={propuesta.estado}
            asesores={asesoresList}
            initialAsesorId={propuesta.asesorId}
            initialObservaciones={propuesta.observaciones}
          />
        </div>
      </div>
    </div>
  );
}
