import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documentosEgresado, propuestas, solicitudesAsesor, usuarios, empresas, supervisores } from "@/lib/schema";
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
  let activeEmpresa = null;
  let activeSupervisor = null;

  if (activeSubmittedProp) {
    if (activeSubmittedProp.empresaId) {
      const [emp] = await db.select().from(empresas).where(eq(empresas.id, activeSubmittedProp.empresaId)).limit(1);
      activeEmpresa = emp || null;
    }
    if (activeSubmittedProp.supervisorId) {
      const [sup] = await db.select().from(supervisores).where(eq(supervisores.id, activeSubmittedProp.supervisorId)).limit(1);
      activeSupervisor = sup || null;
    }

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
          {hasSubmittedPropuesta
            ? "Su propuesta ha sido enviada exitosamente a revisión. A continuación se detallan la información general y el estado actual."
            : "Antes de crear tu propuesta, asegúrate de cumplir con los requisitos."}
        </p>
      </div>

      {!hasSubmittedPropuesta ? (
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
      ) : (
        /* Summary of Submitted Proposal Information (Replaces DocumentGate upon submission) */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
              🏢
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Información General de la Propuesta Enviada
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Detalles registrados de la institución, supervisor y fecha oficial de envío.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Propuesta Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                📌 Detalle de la Propuesta
              </h3>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  Propuesta #{activeSubmittedProp.numero} ({activeSubmittedProp.tipo.toUpperCase()})
                </p>
                <p className="text-slate-600 truncate" title={activeSubmittedProp.titulo || ""}>
                  {activeSubmittedProp.titulo || "Trabajo de Graduación"}
                </p>
              </div>
            </div>

            {/* Empresa Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                🏢 Empresa / Institución
              </h3>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {activeEmpresa ? activeEmpresa.nombre : "No especificada / No aplica"}
                </p>
                <p className="text-slate-600 truncate" title={activeEmpresa?.direccion || ""}>
                  {activeEmpresa?.direccion || "Sin dirección registrada"}
                </p>
              </div>
            </div>

            {/* Supervisor & Fecha Envío */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                👤 Supervisor y Fecha de Envío
              </h3>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {activeSupervisor ? `${activeSupervisor.titulo || ''} ${activeSupervisor.nombres} ${activeSupervisor.apellidos}`.trim() : "Sin supervisor"}
                </p>
                <p className="text-brand-red font-bold">
                  🗓️ {activeSubmittedProp.enviadaEn ? new Date(activeSubmittedProp.enviadaEn).toLocaleString("es-SV", { dateStyle: "long", timeStyle: "short" }) : "Fecha no registrada"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SUBMITTED PROPOSAL STATUS CARD */}
      {activeSubmittedProp && (
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
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

            {/* SINGLE BUTTON: Open PDF Document */}
            <div className="flex items-center gap-3">
              <a
                href={`/egresado/redactar/imprimir?id=${activeSubmittedProp.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>📄 Ver Documento PDF</span>
              </a>
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
      )}
    </div>
  );
}
