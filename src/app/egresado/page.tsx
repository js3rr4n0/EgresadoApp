import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documentosEgresado, propuestas } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import DocumentGate from "@/components/DocumentGate";
import Link from "next/link";

export default async function EgresadoLandingPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // 1. Fetch documents
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, session.userId));
  const docServicio = docs.find((d) => d.tipo === "servicio_social");
  const docNotas = docs.find((d) => d.tipo === "certificacion_notas");
  const docPago = docs.find((d) => d.tipo === "pago_tg");

  // 2. Fetch user proposals
  const userPropuestas = await db
    .select()
    .from(propuestas)
    .where(eq(propuestas.egresadoId, session.userId))
    .orderBy(desc(propuestas.numero));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mi Trabajo de Graduación</h1>
        <p className="text-muted mt-1 text-sm">
          Antes de crear tu propuesta, asegúrate de cumplir con los requisitos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <DocumentGate
            hasServicio={!!docServicio}
            hasNotas={!!docNotas}
            hasPago={!!docPago}
            urlServicio={docServicio?.archivoUrl}
            urlNotas={docNotas?.archivoUrl}
            urlPago={docPago?.archivoUrl}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
            <h3 className="font-bold text-orange-900 flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ¿Necesitas ayuda?
            </h3>
            <p className="text-sm text-orange-800/80">
              Consulta la guía de elaboración de propuestas <a href="#" className="font-bold underline text-brand-red">aquí</a>.
            </p>
          </div>

          <div className="bg-[#1e293b] text-white rounded-xl p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Información importante
            </h3>
            <ul className="text-sm space-y-3 text-slate-300 list-disc pl-5">
              <li>Puedes crear hasta 3 propuestas.</li>
              <li>Solo podrás enviar (mandar) una propuesta.</li>
              <li>Las propuestas no enviadas quedarán guardadas como respaldo.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mis propuestas table */}
      <div className="mt-12">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Mis propuestas</h2>
          <p className="text-sm text-muted">Puedes crear hasta 3 propuestas. Solo podrás enviar una.</p>
        </div>

        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted bg-muted-bg uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Título de la Propuesta</th>
                  <th className="px-6 py-4">Fecha de Creación</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userPropuestas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted">
                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        <p className="font-semibold text-foreground">Aún no has creado ninguna propuesta.</p>
                        <p className="text-sm">Crea tu primera propuesta para comenzar.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userPropuestas.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold">{p.numero}</td>
                      <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate">
                        {/* the real title isn't easily available since it's inside the proposal block, we can just say "Propuesta #N" for now if not fetched, but let's just show "Trabajo de Graduación" */}
                        Propuesta de Trabajo de Graduación
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {new Date().toLocaleDateString("es-SV")}
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-bold text-muted">{p.tipo}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {p.estado === 'redactando' ? 'Redactando' : p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href="/egresado/redactar"
                          className="text-brand-red hover:text-brand-red-hover font-bold text-sm"
                        >
                          Continuar
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
