import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documentosEgresado, propuestas, solicitudesAsesor, usuarios, empresas, supervisores, historialEstados } from "@/lib/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import DocumentGate from "@/components/DocumentGate";
import Link from "next/link";
import InvitationAlert from "@/components/proyecto/InvitationAlert";
import { getUserPendingInvitations, getUserAcceptedTeamProposal } from "@/app/actions/proyecto";
import CrearPropuestaModalButton from "@/components/CrearPropuestaModalButton";

function formatFechaHoraSV(dateInput: Date | string | null) {
  if (!dateInput) return { fecha: "N/A", hora: "N/A" };
  const d = new Date(dateInput);

  const fecha = d.toLocaleDateString("es-SV", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hora = d.toLocaleTimeString("es-SV", {
    timeZone: "America/El_Salvador",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { fecha, hora };
}

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

  // Find active proposal in evaluation pipeline (submitted, assigned to coordinator/advisor, or approved)
  const activeSubmittedProp =
    userPropuestas.find(
      (p) =>
        p.estado !== "redactando" ||
        p.coordinadorId !== null ||
        p.asesorId !== null
    ) || acceptedTeam?.propuesta;
  const hasSubmittedPropuesta = !!activeSubmittedProp;

  let activeStatusTitle = "";
  let activeStatusDesc = "";
  let activeBadgeClass = "";
  let asesorNombre = "";
  let coordinadorNombre = "";
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

    if (activeSubmittedProp.coordinadorId) {
      const [cUser] = await db.select().from(usuarios).where(eq(usuarios.id, activeSubmittedProp.coordinadorId)).limit(1);
      if (cUser) {
        coordinadorNombre = cUser.nombreCompleto;
      }
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

    let isPropuestaAjustada = false;
    const [histAjustes] = await db
      .select()
      .from(historialEstados)
      .where(
        and(
          eq(historialEstados.propuestaId, activeSubmittedProp.id),
          eq(historialEstados.a, "ajustes_completados")
        )
      )
      .limit(1);
    if (histAjustes) {
      isPropuestaAjustada = true;
    }

    if (activeSubmittedProp.estado === "coordinador_asignado" || activeSubmittedProp.estado === "enviada") {
      if (isPropuestaAjustada) {
        activeStatusTitle = "En espera de revisión de propuesta ajustada";
        activeStatusDesc = `Ha enviado su propuesta #${activeSubmittedProp.numero} ajustada con las correcciones aplicadas al plan de trabajo. El docente asesor${asesorNombre ? ` (${asesorNombre})` : ""} revisará nuevamente las modificaciones realizadas.`;
        activeBadgeClass = "bg-indigo-100 text-indigo-950 border-indigo-300 font-extrabold";
      } else if (hasAsesor && asesorNombre) {
        activeStatusTitle = "Asesor asignado, en espera de revisión";
        activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} cuenta con docente asesor asignado (${asesorNombre})${coordinadorNombre ? ` bajo la Coordinación de ${coordinadorNombre}` : ""} y se encuentra en proceso de revisión de plan de trabajo y documentación.`;
        activeBadgeClass = "bg-blue-100 text-blue-900 border-blue-300";
      } else {
        activeStatusTitle = "En espera de ser asignado el asesor";
        activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} ha sido asignada a la Coordinación de Facultad${coordinadorNombre ? ` (${coordinadorNombre})` : ""} y se encuentra en proceso de asignación de un docente asesor.`;
        activeBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";
      }
    } else if (activeSubmittedProp.estado === "primer_contacto_completado") {
      activeStatusTitle = "¡Primer Contacto Completado y Plan Validado! 🎉";
      activeStatusDesc = `El docente asesor${asesorNombre ? ` (${asesorNombre})` : ""} ha completado exitosamente el Informe de Primer Contacto. La empresa ha validado tu plan de trabajo y tu propuesta avanza en el desarrollo del proyecto.`;
      activeBadgeClass = "bg-teal-100 text-teal-950 border-teal-400 font-black";
    } else if (activeSubmittedProp.estado === "aprobada") {
      activeStatusTitle = "Propuesta Aprobada — Esperando Primer Contacto";
      activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} ha sido aprobada exitosamente por el docente asesor${asesorNombre ? ` (${asesorNombre})` : ""}. Estado actual: Esperando que el docente asesor realice el primer contacto con el supervisor empresarial.`;
      activeBadgeClass = "bg-emerald-100 text-emerald-950 border-emerald-400 font-black";
    } else if (activeSubmittedProp.estado === "enviada") {
      activeStatusTitle = "Tu propuesta está en revisión";
      activeStatusDesc = `Has enviado tu propuesta #${activeSubmittedProp.numero}. En este momento está siendo evaluada por las autoridades académicas${coordinadorNombre ? ` y la Coordinación de ${coordinadorNombre}` : ""}.`;
      activeBadgeClass = "bg-purple-100 text-purple-900 border-purple-300";
    } else {
      activeStatusTitle = "Propuesta en revisión / corrección de observaciones";
      const teamList = [];
      if (coordinadorNombre) teamList.push(`Coordinador: ${coordinadorNombre}`);
      if (asesorNombre) teamList.push(`Docente Asesor: ${asesorNombre}`);
      activeStatusDesc = `Su propuesta #${activeSubmittedProp.numero} se encuentra activa. ${teamList.length > 0 ? `Asignaciones actuales: ${teamList.join(" | ")}.` : "En proceso de revisión."}`;
      activeBadgeClass = "bg-blue-100 text-blue-900 border-blue-300";
    }
  }

  const { fecha: fechaEnvio, hora: horaEnvio } = formatFechaHoraSV(activeSubmittedProp?.enviadaEn || null);

  return (
    <div className="space-y-8">
      {/* Pending Invitations Alert Banner */}
      <InvitationAlert invitations={pendingInvitations} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Trabajo de Graduación</h1>
        <p className="text-muted mt-1 text-sm">
          {hasSubmittedPropuesta
            ? "Su propuesta ha sido enviada a revisión. A continuación se muestran los detalles oficiales y el avance del proceso."
            : "Antes de crear tu propuesta, asegúrate de cumplir con los requisitos obligatorios."}
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
        /* Summary of Submitted Proposal Information */
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
                Detalles registrados de la institución, supervisor y registro oficial de envío.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Coordinador y Asesor Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                🎓 Coordinación y Asesoría
              </h3>
              <div className="text-xs space-y-1.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Coordinador:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {coordinadorNombre || "Pendiente de asignación"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Docente Asesor:</span>
                  <span className="font-extrabold text-indigo-700 truncate block">
                    {asesorNombre || "Pendiente de asignación"}
                  </span>
                </div>
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

            {/* Supervisor & Fecha / Hora Envío (SEPARATED & CONVERTED TO EL SALVADOR TIME) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                👤 Supervisor y Envío
              </h3>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800 truncate">
                  {activeSupervisor ? `${activeSupervisor.titulo || ''} ${activeSupervisor.nombres} ${activeSupervisor.apellidos}`.trim() : "Sin supervisor asignado"}
                </p>
                <p className="text-brand-red font-bold flex items-center gap-1 mt-1">
                  <span>🗓️ Envío:</span> <span className="capitalize">{fechaEnvio}</span>
                </p>
                <p className="text-slate-700 font-bold flex items-center gap-1">
                  <span>⏰ Hora (SV):</span> <span>{horaEnvio}</span>
                </p>
                {activeSubmittedProp.estado === "aprobada" && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5 shadow-2xs">
                    <span>⏳ Esperando que el asesor realice el primer contacto</span>
                  </div>
                )}
                {activeSubmittedProp.estado === "primer_contacto_completado" && (
                  <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-lg text-[11px] font-extrabold text-teal-900 flex items-center gap-1.5 shadow-2xs">
                    <span>✓ Primer Contacto completado y validado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SUBMITTED PROPOSAL STATUS CARD */}
      {activeSubmittedProp && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Propuesta #{activeSubmittedProp.numero} ({activeSubmittedProp.tipo.toUpperCase()})
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${activeBadgeClass}`}>
                  {activeSubmittedProp.estado === "primer_contacto_completado"
                    ? "PRIMER CONTACTO COMPLETADO"
                    : activeSubmittedProp.estado === "aprobada"
                    ? "PROPUESTA APROBADA"
                    : activeSubmittedProp.estado.replace(/_/g, " ")}
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

      {/* PROPOSALS TABLE BAR - ALWAYS VISIBLE AT ALL TIMES AS REQUESTED */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Mis Propuestas ({userPropuestas.length}/3)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Puedes crear y redactar hasta 3 propuestas. Puedes continuar editando borradores o crear una nueva.
            </p>
          </div>

          <CrearPropuestaModalButton
            existingCount={userPropuestas.length}
            isTeamMember={!!acceptedTeam}
            isLocked={hasSubmittedPropuesta}
          />
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-extrabold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4"># Propuesta</th>
                  <th className="px-6 py-4">Título / Descripción</th>
                  <th className="px-6 py-4">Modalidad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {acceptedTeam ? (
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">Propuesta #{acceptedTeam.propuesta.numero}</td>
                    <td className="px-6 py-4 font-medium text-slate-800 max-w-[280px] truncate">
                      Propuesta de Proyecto (Equipo de {acceptedTeam.liderNombre})
                    </td>
                    <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">
                      {acceptedTeam.propuesta.tipo}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Integrante de equipo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/egresado/redactar?id=${acceptedTeam.propuesta.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                      >
                        Ver propuesta
                      </Link>
                    </td>
                  </tr>
                ) : userPropuestas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="font-bold text-slate-700 text-sm">Aún no has creado ninguna propuesta.</p>
                        <p className="text-xs text-slate-500 mt-0.5">Haz clic en "Crear Nueva Propuesta" para iniciar.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userPropuestas.map((p, index) => {
                    const numeroCalculado = index + 1;
                    const isCurrentActiveSubmitted = activeSubmittedProp && p.id === activeSubmittedProp.id;
                    const hasAdvisorObservations = !!p.observaciones;

                    let actionText = "📄 Ver PDF Final";
                    let actionClass = "bg-slate-900 hover:bg-slate-800 text-white font-bold";
                    let targetUrl = `/egresado/redactar/imprimir?id=${p.id}`;
                    let isPdf = true;

                    if (hasAdvisorObservations) {
                      actionText = "✏️ Corregir Observaciones";
                      actionClass = "bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-sm animate-pulse";
                      targetUrl = `/egresado/redactar?id=${p.id}&step=5`;
                      isPdf = false;
                    } else if (p.estado === "redactando" && !hasSubmittedPropuesta) {
                      actionText = "Continuar Redacción";
                      actionClass = "bg-brand-red text-white hover:bg-brand-red-dark font-extrabold shadow-sm";
                      targetUrl = `/egresado/redactar?id=${p.id}`;
                      isPdf = false;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-brand-red">Propuesta #{numeroCalculado}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 max-w-[280px] truncate" title={p.titulo || ""}>
                          {p.titulo || `Propuesta de Trabajo de Graduación (${p.tipo.toUpperCase()})`}
                        </td>
                        <td className="px-6 py-4 uppercase text-xs font-bold text-slate-500">{p.tipo}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                              hasAdvisorObservations
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : p.estado === "redactando"
                                ? hasSubmittedPropuesta && !isCurrentActiveSubmitted
                                  ? "bg-slate-100 text-slate-600 border-slate-300"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-purple-100 text-purple-800 border-purple-200"
                            }`}
                          >
                            {hasAdvisorObservations
                              ? "Ajustes Solicitados"
                              : p.estado === "primer_contacto_completado"
                              ? "Primer Contacto Completado"
                              : p.estado === "aprobada"
                              ? "Aprobada por Asesor"
                              : p.estado === "redactando"
                              ? hasSubmittedPropuesta && !isCurrentActiveSubmitted
                                ? "Bloqueada (En Espera)"
                                : "Redactando (Borrador)"
                              : p.estado.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isPdf ? (
                            <a
                              href={targetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${actionClass}`}
                            >
                              {actionText}
                            </a>
                          ) : (
                            <Link
                              href={targetUrl}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${actionClass}`}
                            >
                              {actionText}
                            </Link>
                          )}
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
    </div>
  );
}
