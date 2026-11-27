import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documentosEgresado, propuestas, solicitudesAsesor, usuarios, empresas, supervisores, historialEstados, cartasAceptacion } from "@/lib/schema";
import { eq, asc, and } from "drizzle-orm";
import DocumentGate from "@/components/DocumentGate";
import Link from "next/link";
import AccionesPropuestaRechazada from "@/components/egresado/AccionesPropuestaRechazada";
import { ultimoRechazo } from "@/lib/expedientePropuesta";
import { fechaCortaSV } from "@/lib/fechasTexto";
import InvitationAlert from "@/components/proyecto/InvitationAlert";
import ResumenPropuestaEnviada, { type TonoEstado } from "@/components/egresado/ResumenPropuestaEnviada";
import MapaPropuesta from "@/components/egresado/MapaPropuesta";
import TablaMisPropuestas from "@/components/egresado/TablaMisPropuestas";
import { mapaPropuesta } from "@/lib/mapaPropuestaServidor";
import { getUserPendingInvitations, getUserAcceptedTeamProposal } from "@/app/actions/proyecto";
import CrearPropuestaModalButton from "@/components/CrearPropuestaModalButton";
import AvisoValoraciones from "@/components/valoraciones/AvisoValoraciones";
import PedirCambioAsesor from "@/components/cambioAsesor/PedirCambioAsesor";
import { ultimoCambio } from "@/lib/cambioAsesorServidor";
import { ESTADOS_CAMBIO_PERMITIDO } from "@/lib/cambioAsesor";

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
  const userPropuestas = await db
    .select()
    .from(propuestas)
    .where(eq(propuestas.egresadoId, session.userId))
    .orderBy(asc(propuestas.id));

  // Submitted states that mean a proposal was officially sent to academic evaluation
  const submittedStates = [
    "enviada",
    "coordinador_asignado",
    "aprobada",
    "primer_contacto_completado",
    "en_ejecucion",
    "pend_revision_datos",
    "pend_empresa_nueva"
  ];

  // Find active proposal in evaluation pipeline (submitted, assigned to coordinator/advisor, approved, or pending adjustments)
  const activeSubmittedProp =
    userPropuestas.find(
      (p) =>
        // A3: la rechazada por requisitos vuelve al egresado; no bloquea las demás
        p.estado !== "rechazada" && (p.enviadaEn !== null ||
        !!p.observaciones ||
        submittedStates.includes(p.estado) ||
        (p.coordinadorId !== null && !["rechazada", "anulada"].includes(p.estado)) ||
        (p.asesorId !== null && !["rechazada", "anulada"].includes(p.estado)))
    ) ||
    // Integrante de un equipo (recorrido integral, 20-nov-2026): mientras la propuesta del equipo está en redacción, el
    // integrante sigue viendo sus documentos obligatorios (el envío los exige a todos) y no un "enviada a revisión".
    (acceptedTeam && acceptedTeam.propuesta.estado !== "rechazada" && (acceptedTeam.propuesta.enviadaEn !== null || submittedStates.includes(acceptedTeam.propuesta.estado))
      ? acceptedTeam.propuesta
      : undefined);
  const hasSubmittedPropuesta = !!activeSubmittedProp;

  // A3: propuestas rechazadas por requisitos (las propias y la del equipo), con su último motivo
  const rechazadas = [
    ...userPropuestas.filter((p) => p.estado === "rechazada").map((p) => ({ p, lider: true })),
    ...(acceptedTeam && acceptedTeam.propuesta.estado === "rechazada" ? [{ p: acceptedTeam.propuesta, lider: false }] : []),
  ];
  const rechazos = await Promise.all(rechazadas.map(async (r) => ({ ...r, rechazo: await ultimoRechazo(r.p.id) })));

  let asesorNombre = "";
  let coordinadorNombre = "";
  let activeEmpresa = null;
  let activeSupervisor: { titulo?: string | null; nombres: string; apellidos: string } | null = null;
  let asesorPendiente = false;
  let primerEnvio: string | null = null;
  let ultimoReenvio: string | null = null;

  if (activeSubmittedProp) {
    if (activeSubmittedProp.empresaId) {
      const [emp] = await db.select().from(empresas).where(eq(empresas.id, activeSubmittedProp.empresaId)).limit(1);
      activeEmpresa = emp || null;
    }
    if (activeSubmittedProp.supervisorId) {
      const [sup] = await db.select().from(supervisores).where(eq(supervisores.id, activeSubmittedProp.supervisorId)).limit(1);
      activeSupervisor = sup || null;
    }
    // Proyecto e investigación (H16): el supervisor se escribe en el paso de la carta, no se elige del catálogo.
    if (!activeSupervisor) {
      const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, activeSubmittedProp.id)).limit(1);
      if (carta?.supNombres) activeSupervisor = { titulo: carta.supTitulo ?? "", nombres: carta.supNombres, apellidos: carta.supApellidos ?? "" };
    }

    if (activeSubmittedProp.coordinadorId) {
      const [cUser] = await db.select().from(usuarios).where(eq(usuarios.id, activeSubmittedProp.coordinadorId)).limit(1);
      if (cUser) {
        coordinadorNombre = cUser.nombreCompleto;
      }
    }

    if (activeSubmittedProp.asesorId) {
      const [u] = await db.select().from(usuarios).where(eq(usuarios.id, activeSubmittedProp.asesorId)).limit(1);
      if (u) {
        asesorNombre = u.nombreCompleto;
      }
    } else {
      // T1: antes se mostraba el asesor de la primera solicitud, aunque estuviera pendiente o rechazada
      const [sol] = await db
        .select({ id: solicitudesAsesor.id })
        .from(solicitudesAsesor)
        .where(and(eq(solicitudesAsesor.propuestaId, activeSubmittedProp.id), eq(solicitudesAsesor.estado, "pendiente")))
        .limit(1);
      asesorPendiente = !!sol;
    }

    // T1: fecha del primer envío y del último reenvío (con ajustes o después de un rechazo). enviada_en guarda la última.
    const envios = await db
      .select({ a: historialEstados.a, creadoEn: historialEstados.creadoEn })
      .from(historialEstados)
      .where(eq(historialEstados.propuestaId, activeSubmittedProp.id))
      .orderBy(asc(historialEstados.creadoEn));
    const enviadas = envios.filter((h) => h.a === "enviada");
    const reenvios = envios.filter((h) => h.a === "ajustes_completados" || (h.a === "enviada" && h !== enviadas[0]));
    primerEnvio = (enviadas[0]?.creadoEn ?? activeSubmittedProp.enviadaEn ?? null)?.toISOString() ?? null;
    const ultimo = reenvios[reenvios.length - 1]?.creadoEn;
    ultimoReenvio = ultimo && ultimo.toISOString() !== primerEnvio ? ultimo.toISOString() : null;

    // T2: los mensajes por estado pasaron al mapa de la propuesta (lib/mapaPropuestaServidor.ts)
  }

  // T1: estado de la propuesta enviada, en palabras y con su tono (acción del egresado, en proceso o logrado)
  const estadoResumen: { texto: string; tono: TonoEstado } = !activeSubmittedProp
    ? { texto: "", tono: "proceso" }
    : activeSubmittedProp.observaciones
      ? { texto: "Ajustes solicitados", tono: "accion" }
      : activeSubmittedProp.estado === "en_ejecucion"
        ? { texto: "En ejecución", tono: "ok" }
        : activeSubmittedProp.estado === "primer_contacto_completado"
          ? { texto: "Primer contacto completado", tono: "ok" }
          : activeSubmittedProp.estado === "aprobada"
            ? { texto: "Aprobada", tono: "ok" }
            : asesorNombre
              ? { texto: "En revisión del asesor", tono: "proceso" }
              : { texto: "En asignación de asesor", tono: "proceso" };
  // T2: mapa del estado de la propuesta
  const pasosMapa = activeSubmittedProp ? await mapaPropuesta(activeSubmittedProp.id) : [];
  const rutaEjecucion = activeSubmittedProp?.tipo === "pasantia" ? "/egresado/reportes" : "/egresado/ejecucion";

  return (
    <div className="space-y-8">
      {/* Pending Invitations Alert Banner */}
      <InvitationAlert invitations={pendingInvitations} />

      {/* Valoraciones pendientes de procesos cerrados (entrega V3) */}
      <AvisoValoraciones usuarioId={session.userId} rol="egresado" />

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
      ) : null}

      {/* T1: propuesta enviada: encabezado, datos y estado actual */}
      {activeSubmittedProp && (
        <ResumenPropuestaEnviada
          propuestaId={activeSubmittedProp.id}
          numero={activeSubmittedProp.numero}
          tipo={activeSubmittedProp.tipo}
          titulo={activeSubmittedProp.titulo}
          estado={estadoResumen.texto}
          tono={estadoResumen.tono}
          coordinador={coordinadorNombre || null}
          asesor={asesorNombre || null}
          asesorPendiente={asesorPendiente}
          empresa={activeEmpresa ? { nombre: activeEmpresa.nombre, direccion: activeEmpresa.direccion } : null}
          supervisor={activeSupervisor ? `${activeSupervisor.titulo || ""} ${activeSupervisor.nombres} ${activeSupervisor.apellidos}`.trim() : null}
          primerEnvio={primerEnvio}
          ultimoReenvio={ultimoReenvio}
        >
          <MapaPropuesta pasos={pasosMapa} esLider={activeSubmittedProp.egresadoId === session.userId} />
          {/* D8: el líder puede pedir cambio de asesor cuando ya lo tiene */}
          {asesorNombre && !asesorPendiente && activeSubmittedProp.asesorId && activeSubmittedProp.egresadoId === session.userId && ESTADOS_CAMBIO_PERMITIDO.includes(activeSubmittedProp.estado) && (
            <div className="mt-4">
              <PedirCambioAsesor propuestaId={activeSubmittedProp.id} quien="egresado" asesorActual={asesorNombre} ultimo={await ultimoCambio(activeSubmittedProp.id)} />
            </div>
          )}
          {activeSubmittedProp.estado === "en_ejecucion" && (
            <Link href={rutaEjecucion} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-xs font-bold text-white hover:bg-brand-red-hover">
              {activeSubmittedProp.tipo === "pasantia" ? "Ir a los reportes de actividades" : "Ir a la ejecución"}
            </Link>
          )}
        </ResumenPropuestaEnviada>
      )}

      {/* A3: propuestas rechazadas por requisitos */}
      {rechazos.map(({ p, lider, rechazo }) => (
        <section key={p.id} id={`rechazo-${p.id}`} className="rounded-2xl border border-brand-red/30 bg-red-50/60 p-6 space-y-4 scroll-mt-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-red">Propuesta rechazada por requisitos</p>
            <h2 className="text-lg font-bold text-card-dark mt-1">{p.titulo || `Propuesta #${p.numero}`}</h2>
            <p className="text-sm text-gray-700 mt-1">
              {rechazo
                ? `${rechazo.funcion === "coordinador" ? "El coordinador" : "La administración"} la devolvió el ${fechaCortaSV(rechazo.fecha)} porque no cumple los requisitos previos para asignarla.`
                : "La propuesta fue rechazada."}
            </p>
          </div>
          {rechazo && (
            <div className="rounded-xl border border-border bg-white p-4 space-y-2">
              <p className="text-sm font-bold text-card-dark">Qué corregir</p>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5">
                {rechazo.motivos.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              <p className="text-sm text-gray-700 border-t border-border pt-2">{rechazo.mensaje}</p>
            </div>
          )}
          {lider ? (
            <>
              <p className="text-xs text-gray-600">
                Puedes modificarla (conserva todos sus datos) y enviarla de nuevo, o eliminarla. Al reenviarla vuelve a empezar desde la asignación.
              </p>
              <AccionesPropuestaRechazada propuestaId={p.id} numero={p.numero} />
            </>
          ) : (
            <p className="text-xs text-gray-600">El líder del equipo decide si la modifica o la elimina.</p>
          )}
        </section>
      ))}

      {/* T3: tabla «Mis propuestas» */}
      <TablaMisPropuestas
        propuestas={userPropuestas.map((p) => ({ id: p.id, numero: p.numero, tipo: p.tipo, titulo: p.titulo, estado: p.estado, observaciones: p.observaciones }))}
        equipo={acceptedTeam ? { propuesta: { id: acceptedTeam.propuesta.id, numero: acceptedTeam.propuesta.numero, tipo: acceptedTeam.propuesta.tipo, titulo: acceptedTeam.propuesta.titulo, estado: acceptedTeam.propuesta.estado, observaciones: acceptedTeam.propuesta.observaciones }, lider: acceptedTeam.liderNombre } : null}
        idActiva={activeSubmittedProp?.id ?? null}
        hayEnviada={hasSubmittedPropuesta}
        crear={<CrearPropuestaModalButton existingCount={userPropuestas.length} isTeamMember={!!acceptedTeam} isLocked={hasSubmittedPropuesta} />}
      />
    </div>
  );
}
