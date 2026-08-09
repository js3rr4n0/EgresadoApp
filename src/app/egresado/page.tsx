import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documentosEgresado, propuestas, solicitudesAsesor, usuarios } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";
import DocumentGate from "@/components/DocumentGate";
import Link from "next/link";
import InvitationAlert from "@/components/proyecto/InvitationAlert";
import { getUserPendingInvitations, getUserAcceptedTeamProposal } from "@/app/actions/proyecto";

export default async function EgresadoLandingPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  // 1. Fetch pending team invitations & accepted team proposal
  const pendingInvitations = await getUserPendingInvitations();
  const acceptedTeam = await getUserAcceptedTeamProposal();

  // 2. Fetch documents
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, session.userId));
  const docServicio = docs.find((d) => d.tipo === "servicio_social");
  const docNotas = docs.find((d) => d.tipo === "certificacion_notas");
  const docPago = docs.find((d) => d.tipo === "pago_tg");

  // 3. Fetch user proposals ordered by creation date (id asc)
  let userPropuestas = await db
    .select()
    .from(propuestas)
    .where(eq(propuestas.egresadoId, session.userId))
    .orderBy(asc(propuestas.id));

  // Find active proposal in evaluation pipeline
  const activeSubmittedProp = userPropuestas.find(p => p.estado === "enviada" || p.estado === "coordinador_asignado" || p.estado === "aprobada") || acceptedTeam?.propuesta;
  const hasSubmittedPropuesta = !!activeSubmittedProp;

  let activeStatusTitle = "";
  let activeStatusDesc = "";
  let activeBadgeClass = "";
  let asesorNombre = "";

  if (activeSubmittedProp) {
    let hasAsesor = false;
    if (activeSubmittedProp.asesorId) {
      const [u] = await db.select().from(usuarios).where(eq(usuarios.id, activeSubmittedProp.asesorId)).limit(1);
      if (u) {
        hasAsesor = true;
        asesorNombre = u.nombreCompleto;
      }
    } else {
      const [sol] = await db
        .select({ solicitud: solicitudesAsesor, asesor: usuarios })
        .from(solicitudesAsesor)
        .innerJoin(usuarios, eq(solicitudesAsesor.asesorId, usuarios.id))
        .where(eq(solicitudesAsesor.propuestaId, activeSubmittedProp.id))
        .limit(1);
      if (sol) {
        hasAsesor = true;
        asesorNombre = sol.asesor.nombreCompleto;
      }
    }

    if (activeSubmittedProp.estado === "coordinador_asignado") {
      if (hasAsesor) {
        activeStatusTitle = "Asesor asignado, en espera de revisión";
        activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} cuenta con docente asesor asignado${asesorNombre ? ` (${asesorNombre})` : ""} y se encuentra en proceso de revisión de plan de trabajo y documentación.`;
        activeBadgeClass = "bg-blue-100 text-blue-900 border-blue-300";
      } else {
        activeStatusTitle = "En espera de ser asignado el asesor";
        activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} ha sido asignada a la Coordinación de Facultad y se encuentra en proceso de asignación de un docente asesor.`;
        activeBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";
      }
    } else if (activeSubmittedProp.estado === "aprobada") {
      activeStatusTitle = "En espera de que el asesor se contacte con la empresa";
      activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} ha sido aprobada por la Coordinación de Facultad. El docente asesor${asesorNombre ? ` (${asesorNombre})` : ""} se pondrá en contacto con la institución/empresa para dar inicio al seguimiento del trabajo.`;
      activeBadgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
    } else if (activeSubmittedProp.estado === "enviada") {
      activeStatusTitle = "Tu propuesta está en revisión";
      activeStatusDesc = `Has enviado tu propuesta #${activeSubmittedProp.numero}. En este momento está siendo evaluada por las autoridades académicas.`;
      activeBadgeClass = "bg-purple-100 text-purple-900 border-purple-300";
    }
  }

  return (
    <div>
      {/* Pending Invitations Alert Banner */}
      <InvitationAlert invitations={pendingInvitations} />

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
            isTeamMember={!!acceptedTeam}
            isLocked={hasSubmittedPropuesta}
            existingCount={userPropuestas.length}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-[#1e293b] text-white rounded-xl p-6">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Información importante
            </h3>
            <ul className="text-sm space-y-3 text-slate-300 list-disc pl-5">
              <li>Puedes redactar hasta <strong>3 propuestas</strong> simultáneamente.</li>
              <li>Cualquiera de las 3 propuestas que envíes primero será la evaluada.</li>
              <li>Al enviar una propuesta a revisión, las demás quedan bloqueadas temporalmente.</li>
              <li>Si tu propuesta enviada es rechazada, se desbloquean con sus datos conservados para que puedas modificarlas.</li>
              {acceptedTeam && (
                <li className="text-amber-300 font-bold">
                  Estás registrado en un equipo de trabajo. Las opciones de creación están deshabilitadas mientras pertenezcas al equipo.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ACTIVE SUBMITTED PROPOSAL STATUS CARD */}
      {activeSubmittedProp ? (
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Propuesta #{activeSubmittedProp.numero} ({activeSubmittedProp.tipo.toUpperCase()})
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${activeBadgeClass}`}>
                  {activeSubmittedProp.estado}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {activeSubmittedProp.titulo || "Trabajo de Graduación"}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href={`/egresado/redactar?id=${activeSubmittedProp.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs transition-colors"
              >
                <span>Ver Propuesta (Modo Lectura)</span>
              </Link>
              <Link
                href={`/egresado/redactar/imprimir?id=${activeSubmittedProp.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-red text-white hover:bg-brand-red-hover font-bold text-xs shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Ver PDF / Imprimir</span>
              </Link>
            </div>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-brand-red font-extrabold text-sm sm:text-base">
              <svg className="w-5 h-5 text-brand-red animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{activeStatusTitle}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {activeStatusDesc}
            </p>
          </div>
        </div>
      ) : (
        /* Mis propuestas table (Shown ONLY when no proposal is active in evaluation) */
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Mis Propuestas ({userPropuestas.length}/3)</h2>
              <p className="text-sm text-muted">Puedes redactar hasta 3 propuestas. Solo se evaluará la que decidas enviar.</p>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted bg-muted-bg uppercase font-bold border-b border-border">
                  <tr>
                    <th className="px-6 py-4"># Propuesta</th>
                    <th className="px-6 py-4">Título / Descripción</th>
                    <th className="px-6 py-4">Modalidad</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {acceptedTeam ? (
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold">Propuesta #{acceptedTeam.propuesta.numero}</td>
                      <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate">
                        Propuesta de Proyecto (Equipo de {acceptedTeam.liderNombre})
                      </td>
                      <td className="px-6 py-4 uppercase text-xs font-bold text-muted">
                        {acceptedTeam.propuesta.tipo}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          Integrante de equipo
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end items-center gap-3">
                        <Link
                          href={`/egresado/redactar?id=${acceptedTeam.propuesta.id}`}
                          className="text-brand-red hover:text-brand-red-hover font-bold text-sm"
                        >
                          Ver propuesta
                        </Link>
                      </td>
                    </tr>
                  ) : userPropuestas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-muted">
                          <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          <p className="font-semibold text-foreground">Aún no has creado ninguna propuesta.</p>
                          <p className="text-sm">Crea tu primera propuesta para comenzar.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    userPropuestas.map((p, index) => {
                      const numeroCalculado = index + 1;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-brand-red">Propuesta #{numeroCalculado}</td>
                          <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate" title={p.titulo || ""}>
                            {p.titulo || `Propuesta de Trabajo de Graduación (${p.tipo.toUpperCase()})`}
                          </td>
                          <td className="px-6 py-4 uppercase text-xs font-bold text-muted">{p.tipo}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              {p.estado === 'redactando' ? 'Redactando (Borrador)' : p.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/egresado/redactar?id=${p.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                            >
                              Continuar Redacción
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
