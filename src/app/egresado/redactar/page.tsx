import Link from "next/link";
import { getActivePropuesta } from "@/app/actions/propuestas";
import { getCartaAceptacion } from "@/app/actions/carta";
import { getActividades } from "@/app/actions/actividades";
import { getEquipoProyecto, getDetallesProyecto } from "@/app/actions/proyecto";
import ReenviarPropuestaAjustadaButton from "@/components/ReenviarPropuestaAjustadaButton";

import PortadaForm from "@/components/PortadaForm";
import CartaForm from "@/components/CartaForm";
import ActividadesForm from "@/components/ActividadesForm";
import JustificacionForm from "@/components/JustificacionForm";
import DocumentosEstudianteForm from "@/components/DocumentosEstudianteForm";
import DatosEmpresarialesForm from "@/components/DatosEmpresarialesForm";
import DatosSupervisorForm from "@/components/DatosSupervisorForm";

import ProyectoPortadaForm from "@/components/proyecto/ProyectoPortadaForm";
import ActoresIntervinientesForm from "@/components/proyecto/ActoresIntervinientesForm";
import CartaProyectoForm from "@/components/proyecto/CartaProyectoForm";
import DescripcionProblemaForm from "@/components/proyecto/DescripcionProblemaForm";
import JustificacionProyectoForm from "@/components/proyecto/JustificacionProyectoForm";
import AlcanceProyectoForm from "@/components/proyecto/AlcanceProyectoForm";
import ObjetivosProyectoForm from "@/components/proyecto/ObjetivosProyectoForm";
import TextoEspacioForm from "@/components/proyecto/TextoEspacioForm";
import { espaciosPropuesta, fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import type { Espacio } from "@/lib/fichas/tipos";
import { getRespuestasEspacios } from "@/app/actions/respuestasEspacios";
import { esRecurso, recursoCompleto } from "@/lib/fichas/elementosRecurso";
import RecursoEspacioForm from "@/components/proyecto/RecursoEspacioForm";

/** Formulario de la fase 1 que atiende cada espacio de la ficha de proyecto (entrega P2). */
type TipoPasoProyecto = "portada" | "actores" | "carta" | "problema" | "justificacion" | "alcance" | "objetivos" | "documentos" | "texto" | "recurso" | "no_disponible";
function tipoPasoProyecto(e: Espacio): TipoPasoProyecto {
  switch (e.elemento) {
    case "portada":
    case "actores":
    case "carta":
    case "objetivos":
    case "documentos":
      return e.elemento;
    case "texto":
      if (e.origenFase1 === "detalles_proyecto.descripcion_problema") return "problema";
      if (e.origenFase1 === "detalles_proyecto.justificacion") return "justificacion";
      if (e.origenFase1 === "detalles_proyecto.alcance") return "alcance";
      return "texto";
    case "imagen":
    case "archivo":
    case "enlace":
    case "lista":
      return "recurso";
    default:
      return "no_disponible";
  }
}

import { db } from "@/lib/db";
import { empresas } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";

export default async function EgresadoPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; id?: string }>;
}) {
  const params = await searchParams;
  const targetPropId = params.id ? parseInt(params.id, 10) : undefined;
  const data = await getActivePropuesta(targetPropId);

  if (!data) {
    return <div className="p-8 text-center text-muted">Error cargando sesión.</div>;
  }

  if ("error" in data) {
    return (
      <div className="p-12 text-center border border-amber-200 bg-amber-50 rounded-xl mt-8">
        <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold text-amber-800 mb-2">No hay periodo activo</h2>
        <p className="text-amber-700">{data.error} Contacte a administración.</p>
      </div>
    );
  }

  const {
    propuesta,
    userDetails,
    mesEnvio,
    isLeader,
    memberInfo,
    isAnySubmitted,
    isCurrentSubmitted,
    submittedPropNumber,
  } = data;

  const hasAdvisorObservations = !!propuesta?.observaciones;
  const isProyecto = propuesta?.tipo === "proyecto";
  const isInvestigacion = propuesta?.tipo === "investigacion";
  const isMultiUserFlow = isProyecto || isInvestigacion;

  // Proyecto: los pasos salen de la ficha ligada a la propuesta (o de la ficha base, que es la fase 1 tal cual).
  const fichaProyecto = isProyecto ? await fichaDePropuesta(propuesta.id) : null;
  const pasosProyecto = fichaProyecto
    ? espaciosPropuesta(fichaProyecto.definicion).map((espacio, i) => ({ num: i + 1, espacio, tipo: tipoPasoProyecto(espacio) }))
    : [];
  const numPasoProyecto = (tipo: TipoPasoProyecto, porDefecto: number) => pasosProyecto.find((p) => p.tipo === tipo)?.num ?? porDefecto;

  const defaultStepForAdjustments = isProyecto ? numPasoProyecto("objetivos", 7) : isInvestigacion ? 6 : 5;
  const currentStep = hasAdvisorObservations
    ? defaultStepForAdjustments
    : parseInt(params.step || "1", 10);

  let cartaData: any = null;
  let empresasList: any[] = [];
  let sucursalesList: any[] = [];
  let supervisoresList: any[] = [];
  let empresaInfo: any = null;
  let actividadesList: any[] = [];
  let documentosSubidos: any[] = [];
  let teamMembers: any[] = [];
  let detallesProj: any = null;
  let respuestasProyecto: Record<string, string> = {};

  if (isMultiUserFlow) {
    teamMembers = await getEquipoProyecto(propuesta.id);
    detallesProj = await getDetallesProyecto(propuesta.id);
    if (isProyecto) respuestasProyecto = await getRespuestasEspacios(propuesta.id);
    cartaData = await getCartaAceptacion(propuesta.id);

    const docStepNumber = isInvestigacion ? 7 : numPasoProyecto("documentos", 8);
    if (currentStep === docStepNumber) {
      const { documentosEgresado } = await import("@/lib/schema");
      documentosSubidos = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));
    }
  } else {
    // Pasantía
    if (currentStep === 4) {
      cartaData = await getCartaAceptacion(propuesta.id);
      if (propuesta.empresaId && propuesta.supervisorId) {
        const { empresas, supervisores } = await import("@/lib/schema");
        const empresaRows = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId));
        const supervisorRows = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId));
        if (empresaRows.length > 0 && supervisorRows.length > 0) {
          empresaInfo = {
            nombre: empresaRows[0].nombre,
            supervisor: `${supervisorRows[0].nombres} ${supervisorRows[0].apellidos}`,
            supervisorCargo: supervisorRows[0].cargo,
          };
        }
      }
    }

    if (currentStep === 5) {
      cartaData = await getCartaAceptacion(propuesta.id);
      actividadesList = await getActividades(propuesta.id);
    }

    if (currentStep === 7) {
      const { documentosEgresado } = await import("@/lib/schema");
      documentosSubidos = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));
    }

    if (currentStep === 2) {
      const { sucursales, organigramasEmpresa } = await import("@/lib/schema");
      empresasList = await db.select().from(empresas).orderBy(asc(empresas.nombre));
      sucursalesList = await db.select().from(sucursales).orderBy(asc(sucursales.nombre));

      const orgs = await db.select().from(organigramasEmpresa).orderBy(desc(organigramasEmpresa.subidoEn));
      empresasList = empresasList.map((emp) => {
        const latestOrg = orgs.find((o) => o.empresaId === emp.id);
        return latestOrg ? { ...emp, organigramaUrl: latestOrg.url } : emp;
      });
    }

    if (currentStep === 3 && propuesta.empresaId) {
      const { supervisores, sucursales } = await import("@/lib/schema");
      supervisoresList = await db.select().from(supervisores).where(eq(supervisores.empresaId, propuesta.empresaId)).orderBy(asc(supervisores.nombres));
      sucursalesList = await db.select().from(sucursales).where(eq(sucursales.empresaId, propuesta.empresaId)).orderBy(asc(sucursales.nombre));
    }
  }

  // Calculate max allowed step
  let maxAllowedStep = 1;

  if (isInvestigacion) {
    const isStep2Complete =
      detallesProj?.actorPatrocinador &&
      detallesProj?.actorBeneficiario &&
      detallesProj?.actorFinancista;

    const isStep3Complete =
      isStep2Complete &&
      cartaData?.archivoUrl &&
      cartaData?.fechaEmision &&
      cartaData?.fechaInicio &&
      cartaData?.fechaFin &&
      cartaData?.supNombres;

    const isStep4Complete = isStep3Complete && detallesProj?.descripcionProblema;
    const isStep5Complete = isStep4Complete && detallesProj?.justificacion;
    const isStep6Complete =
      isStep5Complete &&
      detallesProj?.objetivoGeneral &&
      Array.isArray(detallesProj?.objetivosEspecificos) &&
      detallesProj.objetivosEspecificos.length >= 4;

    maxAllowedStep = isStep6Complete ? 7 : isStep5Complete ? 6 : isStep4Complete ? 5 : isStep3Complete ? 4 : isStep2Complete ? 3 : 2;
  } else if (isProyecto) {
    // Cada paso se desbloquea al completar el anterior, en el orden de la ficha. Mismas condiciones que la fase 1.
    const completo = (p: (typeof pasosProyecto)[number]): boolean => {
      switch (p.tipo) {
        case "portada":
          return true;
        case "actores":
          return !!(detallesProj?.actorPatrocinador && detallesProj?.actorBeneficiario && detallesProj?.actorEjecutor && detallesProj?.actorFinancista);
        case "carta":
          return !!(cartaData?.archivoUrl && cartaData?.fechaEmision && cartaData?.fechaInicio && cartaData?.fechaFin && cartaData?.supNombres);
        case "problema":
          return !!detallesProj?.descripcionProblema;
        case "justificacion":
          return !!detallesProj?.justificacion;
        case "alcance":
          return !!detallesProj?.alcance;
        case "objetivos":
          return !!(detallesProj?.objetivoGeneral && Array.isArray(detallesProj?.objetivosEspecificos) &&
            detallesProj.objetivosEspecificos.length >= Number(p.espacio.parametros.minEspecificos ?? 4));
        case "texto":
          return !p.espacio.obligatorio || !!respuestasProyecto[p.espacio.id]?.trim();
        case "recurso":
          return esRecurso(p.espacio.elemento) && recursoCompleto({ ...p.espacio, elemento: p.espacio.elemento }, respuestasProyecto[p.espacio.id]);
        default:
          return true;
      }
    };
    maxAllowedStep = 1;
    for (const p of pasosProyecto) {
      if (p.num === pasosProyecto.length || !completo(p)) break;
      maxAllowedStep = p.num + 1;
    }
  } else {
    // Pasantía logic
    const isStep2Complete =
      propuesta.empresaId !== null &&
      propuesta.estado !== "pend_empresa_nueva" &&
      propuesta.estado !== "pend_revision_datos" &&
      propuesta.estado !== "empresa_rechazada" &&
      propuesta.estado !== "datos_rechazados";
    const isStep3Complete = isStep2Complete && propuesta.supervisorId !== null;
    const isStep4Complete = isStep3Complete && (await getCartaAceptacion(propuesta.id)) !== null;
    const isStep5Complete = isStep4Complete && (await getActividades(propuesta.id)).length > 0;
    const isStep6Complete = isStep5Complete && propuesta.justificacionProceso !== null;

    maxAllowedStep = isStep6Complete ? 7 : isStep5Complete ? 6 : isStep4Complete ? 5 : isStep3Complete ? 4 : isStep2Complete ? 3 : 2;
  }

  const estadosLabel: Record<string, string> = {
    redactando: "Redactando Propuesta",
    enviada: "Enviada a Revisión",
    rechazada: "Propuesta Rechazada",
    aprobada: "Propuesta Aprobada",
    pend_revision_datos: "En Revisión Administrativa",
    pend_empresa_nueva: "Revisando Nueva Empresa",
    empresa_rechazada: "Empresa Rechazada",
    datos_rechazados: "Datos Rechazados",
  };

  const steps = isInvestigacion
    ? [
        { num: 1, title: "Portada", desc: "Información general e integrantes" },
        { num: 2, title: "Actores intervinientes", desc: "Patrocinador, investigador y financista" },
        { num: 3, title: "Carta de Aceptación", desc: "Documento de la institución" },
        { num: 4, title: "Descripción del problema", desc: "Problema u oportunidad a investigar" },
        { num: 5, title: "Justificación", desc: "Justificación de la investigación" },
        { num: 6, title: "Objetivos", desc: "Objetivo general y específicos" },
        { num: 7, title: "Documentación de soporte", desc: "Documentos obligatorios" },
      ]
    : isProyecto
    ? pasosProyecto.map((p) => ({ num: p.num, title: p.espacio.titulo, desc: p.espacio.descripcion }))
    : [
        { num: 1, title: "Portada", desc: "Información general del trabajo" },
        { num: 2, title: "Datos empresariales", desc: "Información de la institución" },
        { num: 3, title: "Datos de supervisor", desc: "Información del supervisor" },
        { num: 4, title: "Carta de Aceptación", desc: "Documento de aceptación" },
        { num: 5, title: "Descripción de actividades", desc: "Actividades que realizarás" },
        { num: 6, title: "Justificación del proceso", desc: "Justificación y objetivos" },
        { num: 7, title: "Documentos del estudiante", desc: "Documentos requeridos" },
      ];

  const isLockedOther = isAnySubmitted && !isCurrentSubmitted;
  const isFormLocked = propuesta.bloqueada || propuesta.estado !== "redactando" || isLockedOther;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/egresado"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-brand-red hover:text-brand-red text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all group"
        >
          <svg className="w-4 h-4 text-slate-500 group-hover:text-brand-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Panel Principal
        </Link>
      </div>

      {isLockedOther && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Propuesta #{propuesta.numero} (Bloqueada)</h3>
            <p className="text-xs text-amber-800 mt-1">
              Has enviado la <strong>Propuesta #{submittedPropNumber}</strong> a revisión administrativa. Mientras se encuentre en evaluación, tus demás propuestas están en modo solo lectura. Si es rechazada, se desbloquearán automáticamente con todos sus datos conservados.
            </p>
          </div>
        </div>
      )}

      {propuesta.observaciones && (
        <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-extrabold text-xl shrink-0 border border-amber-300">
                📝
              </div>
              <div>
                <h3 className="font-extrabold text-amber-950 text-base flex items-center gap-2">
                  <span>Observaciones del Docente Asesor sobre el Plan de Trabajo</span>
                </h3>
                <p className="text-xs text-amber-900 font-medium mt-0.5">
                  El docente asesor solicitó las correcciones detalladas abajo. Modifica el plan en esta pantalla y haz clic en <strong>Reenviar Propuesta Ajustada</strong> al terminar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href={`/egresado/redactar/imprimir?id=${propuesta.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/60 transition-all shadow-xs"
              >
                📄 Ver PDF Original Enviado ↗
              </Link>
              <ReenviarPropuestaAjustadaButton propuestaId={propuesta.id} />
            </div>
          </div>

          <div className="p-4 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed font-semibold shadow-xs">
            <strong className="block text-amber-950 uppercase text-[10px] font-extrabold mb-1 tracking-wider">
              📍 Indicaciones y Actividades a Corregir:
            </strong>
            <p className="whitespace-pre-wrap">{propuesta.observaciones}</p>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Trabajo de Graduación</h1>
          <p className="text-muted mt-1 text-sm">
            Completa todos los campos de tu propuesta de <strong className="uppercase">{propuesta.tipo}</strong>.
          </p>
        </div>
        <div className="bg-card-dark text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
          Propuesta #{propuesta.numero} ({propuesta.tipo.toUpperCase()})
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Stepper */}
        <div className="w-full lg:w-72 shrink-0 bg-white border border-border rounded-xl p-5 shadow-xs">
          {/* Estado Actual Badge */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Estado Actual</p>
              <p className="text-xs font-bold text-amber-900">{estadosLabel[propuesta.estado] || propuesta.estado}</p>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${propuesta.estado === "redactando" ? "bg-amber-500 animate-pulse" : "bg-brand-red"}`}></span>
          </div>

          <h2 className="font-bold text-foreground mb-6">Progreso de la Propuesta #{propuesta.numero}</h2>

          <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-4 before:-ml-px before:w-0.5 before:bg-border">
            {steps.map((step) => {
              const active = step.num === currentStep;
              const completed = step.num < currentStep;
              const locked = hasAdvisorObservations
                ? step.num !== defaultStepForAdjustments
                : step.num > maxAllowedStep;

              const innerContent = (
                <>
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors ${
                      active
                        ? "bg-brand-red text-white"
                        : completed
                        ? "bg-emerald-500 text-white"
                        : locked
                        ? "bg-slate-100 text-slate-400 border border-border"
                        : "bg-muted-bg text-muted border border-border"
                    }`}
                  >
                    {completed && !locked ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : locked ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-bold ${
                        active
                          ? "text-brand-red"
                          : completed
                          ? "text-emerald-700"
                          : locked
                          ? "text-slate-400"
                          : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                  </div>
                </>
              );

              const className = `relative flex items-start gap-4 p-3 rounded-lg transition-colors ${
                active ? "bg-red-50 hover:bg-red-50" : locked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"
              }`;

              if (locked) {
                return (
                  <div key={step.num} className={className}>
                    {innerContent}
                  </div>
                );
              }

              return (
                <Link href={`?id=${propuesta.id}&step=${step.num}`} key={step.num} className={className}>
                  {innerContent}
                </Link>
              );
            })}
          </div>

          <Link
            href={`/egresado/redactar/imprimir?id=${propuesta.id}`}
            target="_blank"
            className="mt-8 w-full flex items-center justify-center gap-2 bg-white border border-border hover:bg-muted-bg text-foreground font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Vista Previa
          </Link>

          {/* Criterios de Aprobación */}
          <div className="mt-6 bg-card-dark text-white rounded-xl p-5 relative overflow-hidden shadow-sm">
            <svg className="absolute -right-4 -top-4 w-20 h-20 text-white/5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h3 className="font-bold mb-3 relative z-10 text-xs sm:text-sm uppercase tracking-wider text-slate-200">
              Criterios de Aprobación
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 relative z-10">
              <li className="flex gap-2"><span className="text-brand-red font-bold">•</span> Completar todos los campos obligatorios.</li>
              <li className="flex gap-2"><span className="text-brand-red font-bold">•</span> Adjuntar todos los documentos requeridos.</li>
              <li className="flex gap-2"><span className="text-brand-red font-bold">•</span> Información clara, coherente y verificable.</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Step Form Content */}
        <div className="flex-1 w-full min-w-0">
          {propuesta.estado === "enviada" ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center py-16 space-y-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-800">Tu propuesta está en revisión</h2>
                <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                  Has enviado oficialmente tu propuesta de Trabajo de Graduación. En este momento está siendo evaluada por las autoridades académicas. Ya no es posible modificar los datos de la propuesta.
                </p>
              </div>
              <div className="pt-4 flex justify-center">
                <Link
                  href={`/egresado/redactar/imprimir?id=${propuesta.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ver PDF / Vista Previa
                </Link>
              </div>
            </div>
          ) : propuesta.bloqueada ? (
            <div className="bg-white border border-border rounded-xl p-8 shadow-sm text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-card-dark">En espera de aprobación administrativa</h2>
              <p className="text-muted max-w-md mx-auto">
                Has enviado una solicitud para registrar o actualizar datos empresariales o de supervisor. No puedes avanzar en la redacción de tu propuesta hasta que la administración apruebe los datos.
              </p>
            </div>
          ) : isInvestigacion ? (
            /* RENDER INVESTIGACIÓN STEPS */
            <>
              {currentStep === 1 && (
                <ProyectoPortadaForm
                  propuestaId={propuesta.id}
                  userDetails={userDetails}
                  mesEnvio={mesEnvio}
                  isLocked={isFormLocked}
                  isLeader={isLeader}
                  teamMembers={teamMembers}
                  memberInfo={memberInfo}
                  isInvestigacion={true}
                  initialTitulo={propuesta.titulo}
                />
              )}

              {currentStep === 2 && (
                <ActoresIntervinientesForm
                  propuestaId={propuesta.id}
                  initialData={detallesProj}
                  isLocked={isFormLocked}
                  isReadOnly={!isLeader}
                  isInvestigacion={true}
                />
              )}

              {currentStep === 3 && (
                <CartaProyectoForm
                  propuestaId={propuesta.id}
                  initialData={cartaData}
                  isLocked={isFormLocked}
                  isReadOnly={!isLeader}
                  isInvestigacion={true}
                />
              )}

              {currentStep === 4 && (
                <DescripcionProblemaForm
                  propuestaId={propuesta.id}
                  initialData={detallesProj?.descripcionProblema}
                  isLocked={isFormLocked}
                  isReadOnly={!isLeader}
                  isInvestigacion={true}
                />
              )}

              {currentStep === 5 && (
                <JustificacionProyectoForm
                  propuestaId={propuesta.id}
                  initialData={detallesProj?.justificacion}
                  isLocked={isFormLocked}
                  isReadOnly={!isLeader}
                  isInvestigacion={true}
                />
              )}

              {currentStep === 6 && (
                <ObjetivosProyectoForm
                  propuestaId={propuesta.id}
                  initialObjetivoGeneral={detallesProj?.objetivoGeneral}
                  initialObjetivosEspecificos={detallesProj?.objetivosEspecificos}
                  isLocked={isFormLocked}
                  isReadOnly={!isLeader}
                  isInvestigacion={true}
                  observaciones={propuesta.observaciones}
                />
              )}

              {currentStep === 7 && (
                <DocumentosEstudianteForm
                  propuestaId={propuesta.id}
                  isLocked={isFormLocked || !isLeader}
                  documentosSubidos={documentosSubidos}
                />
              )}
            </>
          ) : isProyecto ? (
            /* RENDER PROYECTO STEPS: en el orden de la ficha (P2). Sin ficha, la base reproduce los 8 pasos de la fase 1. */
            (() => {
              const paso = pasosProyecto[currentStep - 1];
              if (!paso) return null;
              const nav = { pasoSiguiente: currentStep + 1, pasoAnterior: Math.max(1, currentStep - 1) };
              const e = paso.espacio;
              return (
                <div className="space-y-4">
                  {fichaProyecto?.version && (
                    <p className="text-[11px] text-muted">
                      Ficha <span className="font-mono font-bold">{fichaProyecto.version.codigo}</span> · versión {fichaProyecto.version.numero}
                    </p>
                  )}
                  {e.ayuda?.trim() && (
                    <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl text-sm whitespace-pre-wrap">{e.ayuda}</div>
                  )}
                  {paso.tipo === "portada" && (
                    <ProyectoPortadaForm {...nav} propuestaId={propuesta.id} userDetails={userDetails} mesEnvio={mesEnvio} isLocked={isFormLocked}
                      isLeader={isLeader} teamMembers={teamMembers} memberInfo={memberInfo} initialTitulo={propuesta.titulo} />
                  )}
                  {paso.tipo === "actores" && (
                    <ActoresIntervinientesForm {...nav} propuestaId={propuesta.id} initialData={detallesProj} isLocked={isFormLocked} isReadOnly={!isLeader} />
                  )}
                  {paso.tipo === "carta" && (
                    <CartaProyectoForm {...nav} propuestaId={propuesta.id} initialData={cartaData} isLocked={isFormLocked} isReadOnly={!isLeader} />
                  )}
                  {paso.tipo === "problema" && (
                    <DescripcionProblemaForm {...nav} propuestaId={propuesta.id} initialData={detallesProj?.descripcionProblema} isLocked={isFormLocked} isReadOnly={!isLeader} />
                  )}
                  {paso.tipo === "justificacion" && (
                    <JustificacionProyectoForm {...nav} propuestaId={propuesta.id} initialData={detallesProj?.justificacion} isLocked={isFormLocked} isReadOnly={!isLeader} />
                  )}
                  {paso.tipo === "alcance" && (
                    <AlcanceProyectoForm {...nav} propuestaId={propuesta.id} initialData={detallesProj?.alcance} isLocked={isFormLocked} isReadOnly={!isLeader} />
                  )}
                  {paso.tipo === "objetivos" && (
                    <ObjetivosProyectoForm {...nav} propuestaId={propuesta.id} initialObjetivoGeneral={detallesProj?.objetivoGeneral}
                      initialObjetivosEspecificos={detallesProj?.objetivosEspecificos} isLocked={isFormLocked} isReadOnly={!isLeader}
                      observaciones={propuesta.observaciones}
                      minEspecificos={Number(e.parametros.minEspecificos ?? 4)} maxEspecificos={Number(e.parametros.maxEspecificos ?? 6)} />
                  )}
                  {paso.tipo === "texto" && (
                    <TextoEspacioForm key={e.id} propuestaId={propuesta.id} espacioId={e.id} titulo={e.titulo} descripcion={e.descripcion}
                      obligatorio={e.obligatorio} minPalabras={Number(e.parametros.minPalabras) || 0} maxPalabras={Number(e.parametros.maxPalabras) || 0}
                      initialData={respuestasProyecto[e.id]} isLocked={isFormLocked} isReadOnly={!isLeader}
                      pasoSiguiente={currentStep + 1} pasoAnterior={currentStep > 1 ? currentStep - 1 : null} />
                  )}
                  {paso.tipo === "recurso" && esRecurso(e.elemento) && (
                    <RecursoEspacioForm key={e.id} propuestaId={propuesta.id} espacio={{ ...e, elemento: e.elemento }} initialData={respuestasProyecto[e.id]}
                      isLocked={isFormLocked} isReadOnly={!isLeader} pasoSiguiente={currentStep + 1} pasoAnterior={currentStep > 1 ? currentStep - 1 : null} />
                  )}
                  {paso.tipo === "documentos" && (
                    <DocumentosEstudianteForm propuestaId={propuesta.id} isLocked={isFormLocked || !isLeader} documentosSubidos={documentosSubidos} prevStep={currentStep - 1} />
                  )}
                  {paso.tipo === "no_disponible" && (
                    <div className="bg-white border border-border rounded-xl p-6 text-sm text-muted">
                      <h2 className="text-xl font-bold text-card-dark mb-2">{e.titulo}</h2>
                      Este paso de la ficha todavía no tiene formulario para proyecto. Puedes continuar con el siguiente.
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* RENDER PASANTÍA STEPS */
            <div className="bg-white border border-border rounded-xl p-8 shadow-sm">
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">1. Portada</h2>
                  <p className="text-sm text-muted mb-8">Verifica tus datos personales para pasar a la siguiente etapa.</p>
                  <PortadaForm
                    propuestaId={propuesta.id}
                    initialData={{
                      nombreCompleto: userDetails.nombreCompleto,
                      carnet: userDetails.carnet,
                      carrera: userDetails.carrera,
                      mesEnvio,
                      titulo: propuesta.titulo,
                    }}
                  />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">2. Datos empresariales</h2>
                  <p className="text-sm text-muted mb-8">Selecciona la empresa o institución donde realizarás tu pasantía.</p>
                  <DatosEmpresarialesForm
                    propuestaId={propuesta.id}
                    initialEmpresaId={propuesta.empresaId}
                    initialSucursalId={propuesta.sucursalId}
                    empresas={empresasList}
                    sucursales={sucursalesList}
                  />
                </>
              )}

              {currentStep === 3 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">3. Datos de supervisor</h2>
                  <p className="text-sm text-muted mb-8">Selecciona tu supervisor dentro de la empresa elegida.</p>
                  <DatosSupervisorForm
                    propuestaId={propuesta.id}
                    empresaId={propuesta.empresaId}
                    initialSupervisorId={propuesta.supervisorId}
                    supervisores={supervisoresList}
                    sucursales={sucursalesList}
                  />
                </>
              )}

              {currentStep === 4 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">4. Carta de Aceptación</h2>
                  <p className="text-sm text-muted mb-8">Digita los datos de la carta emitida por la empresa para validar tu pasantía.</p>
                  <CartaForm
                    propuestaId={propuesta.id}
                    initialData={cartaData}
                    empresaInfo={empresaInfo}
                    isLocked={isFormLocked}
                  />
                </>
              )}

              {currentStep === 5 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">5. Descripción de Actividades</h2>
                  <p className="text-sm text-muted mb-8">En esta etapa se gestiona y registra las actividades del plan por períodos.</p>
                  <ActividadesForm
                    propuestaId={propuesta.id}
                    initialFechas={{ fechaInicio: cartaData?.fechaInicio || "", fechaFin: cartaData?.fechaFin || "" }}
                    initialActividades={actividadesList}
                    observaciones={propuesta.observaciones}
                  />
                </>
              )}

              {currentStep === 6 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">6. Justificación del proceso</h2>
                  <JustificacionForm
                    propuestaId={propuesta.id}
                    initialData={propuesta.justificacionProceso}
                    isLocked={isFormLocked}
                  />
                </>
              )}

              {currentStep === 7 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">7. Documentos del estudiante</h2>
                  <p className="text-sm text-muted mb-8">Adjunción de los 3 documentos vitales del proceso.</p>
                  <DocumentosEstudianteForm
                    propuestaId={propuesta.id}
                    isLocked={isFormLocked}
                    documentosSubidos={documentosSubidos}
                    prevStep={6}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
