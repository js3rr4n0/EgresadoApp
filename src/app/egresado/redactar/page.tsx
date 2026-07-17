import Link from "next/link";
import { getActivePropuesta } from "@/app/actions/propuestas";
import { getCartaAceptacion } from "@/app/actions/carta";
import { getActividades } from "@/app/actions/actividades";
import PortadaForm from "@/components/PortadaForm";
import CartaForm from "@/components/CartaForm";
import ActividadesForm from "@/components/ActividadesForm";
import JustificacionForm from "@/components/JustificacionForm";
import DocumentosEstudianteForm from "@/components/DocumentosEstudianteForm";
import DatosEmpresarialesForm from "@/components/DatosEmpresarialesForm";
import { db } from "@/lib/db";
import { empresas } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";

export default async function EgresadoPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const params = await searchParams;
  const currentStep = parseInt(params.step || "1");
  const data = await getActivePropuesta();

  if (!data) {
    return <div className="p-8 text-center text-muted">Error cargando sesión.</div>;
  }

  if ('error' in data) {
    return (
      <div className="p-12 text-center border border-amber-200 bg-amber-50 rounded-xl mt-8">
        <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h2 className="text-xl font-bold text-amber-800 mb-2">No hay periodo activo</h2>
        <p className="text-amber-700">{data.error} Contacte a administración.</p>
      </div>
    );
  }

  const { propuesta, userDetails, mesEnvio } = data;
  let cartaData = null;
  let empresasList: any[] = [];
  let sucursalesList: any[] = [];
  let empresaInfo = null;
  
  if (currentStep === 4) {
    cartaData = await getCartaAceptacion(propuesta.id);
    if (propuesta.empresaId && propuesta.supervisorId) {
      const { empresas, supervisores } = await import("@/lib/schema");
      const { eq } = await import("drizzle-orm");
      const empresaRows = await db.select().from(empresas).where(eq(empresas.id, propuesta.empresaId));
      const supervisorRows = await db.select().from(supervisores).where(eq(supervisores.id, propuesta.supervisorId));
      if (empresaRows.length > 0 && supervisorRows.length > 0) {
        empresaInfo = {
          nombre: empresaRows[0].nombre,
          supervisor: `${supervisorRows[0].nombres} ${supervisorRows[0].apellidos}`,
          supervisorCargo: supervisorRows[0].cargo
        };
      }
    }
  }

  let actividadesList: any[] = [];
  if (currentStep === 5) {
    cartaData = await getCartaAceptacion(propuesta.id);
    actividadesList = await getActividades(propuesta.id);
  }

  let documentosSubidos: any[] = [];
  if (currentStep === 7) {
    const { documentosEgresado } = await import("@/lib/schema");
    documentosSubidos = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, propuesta.egresadoId));
  }
  
  if (currentStep === 2) {
    // Order alphabetically
    const { sucursales } = await import("@/lib/schema");
    empresasList = await db.select().from(empresas).orderBy(asc(empresas.nombre));
    sucursalesList = await db.select().from(sucursales).orderBy(asc(sucursales.nombre));
  }

  // Mapa de estados para etiquetas visuales
  const estadosLabel: Record<string, string> = {
    redactando: "Redactando Propuesta",
    enviada: "Enviada a Revisión",
    rechazada: "Propuesta Rechazada",
    aprobada: "Propuesta Aprobada",
  };

  const steps = [
    { num: 1, title: "Portada", desc: "Información general del trabajo" },
    { num: 2, title: "Datos empresariales", desc: "Información de la institución" },
    { num: 3, title: "Datos de supervisor", desc: "Información del supervisor" },
    { num: 4, title: "Carta de Aceptación", desc: "Documento de aceptación" },
    { num: 5, title: "Descripción de actividades", desc: "Actividades que realizarás" },
    { num: 6, title: "Justificación del proceso", desc: "Justificación y objetivos" },
    { num: 7, title: "Documentos del estudiante", desc: "Documentos requeridos" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Trabajo de Graduación</h1>
          <p className="text-muted mt-1 text-sm">
            Completa todos los campos de tu propuesta de {propuesta.tipo}.
          </p>
        </div>
        <div className="bg-card-dark text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
          Propuesta #{propuesta.numero}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column - Stepper */}
        <div className="w-full lg:w-72 shrink-0 bg-white border border-border rounded-xl p-5">
          <h2 className="font-bold text-foreground mb-6">Progreso de la Propuesta</h2>
          
          <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-4 before:-ml-px before:w-0.5 before:bg-border">
            {steps.map((step) => {
              const active = step.num === currentStep;
              const completed = step.num < currentStep;
              return (
                <Link 
                  href={`?step=${step.num}`}
                  key={step.num} 
                  className={`relative flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors ${active ? "bg-red-50 hover:bg-red-50" : ""}`}
                >
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors ${
                    active ? "bg-brand-red text-white" : completed ? "bg-emerald-500 text-white" : "bg-muted-bg text-muted border border-border"
                  }`}>
                    {completed ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : step.num}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${active ? "text-brand-red" : completed ? "text-emerald-700" : "text-foreground"}`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <button className="mt-8 w-full flex items-center justify-center gap-2 bg-white border border-border hover:bg-muted-bg text-foreground font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Vista Previa
          </button>
        </div>

        <div className="flex-1 bg-white border border-border rounded-xl p-8 shadow-sm">
          {propuesta.bloqueada ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-card-dark">En espera de aprobación de empresa</h2>
              <p className="text-muted max-w-md mx-auto">
                Has enviado una solicitud para registrar o actualizar una empresa. No puedes avanzar en la redacción de tu propuesta hasta que la administración apruebe los datos.
              </p>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">1. Portada</h2>
                  <p className="text-sm text-muted mb-8">Verifica tus datos personales para pasar a la siguiente etapa.</p>
                  <PortadaForm 
                    initialData={{
                      nombreCompleto: userDetails.nombreCompleto,
                      carnet: userDetails.carnet,
                      carrera: userDetails.carrera,
                      mesEnvio,
                    }}
                  />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">2. Datos empresariales</h2>
                  <p className="text-sm text-muted mb-8">Selecciona la empresa o institución donde realizarás tu pasantía. Al seleccionarla, se cargarán automáticamente los datos correspondientes.</p>
                  <DatosEmpresarialesForm 
                    propuestaId={propuesta.id}
                    initialEmpresaId={propuesta.empresaId}
                    initialSucursalId={propuesta.sucursalId}
                    empresas={empresasList}
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
                  />
                </>
              )}

              {currentStep === 6 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">6. Justificación del proceso</h2>
                  <JustificacionForm 
                    propuestaId={propuesta.id}
                    initialData={propuesta.justificacionProceso}
                    isLocked={propuesta.bloqueada || propuesta.estado !== "redactando"}
                  />
                </>
              )}

              {currentStep === 7 && (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-2">7. Documentos del estudiante</h2>
                  <p className="text-sm text-muted mb-8">Adjunción de los 3 documentos vitales del proceso.</p>
                  <DocumentosEstudianteForm 
                    propuestaId={propuesta.id}
                    isLocked={propuesta.bloqueada || propuesta.estado !== "redactando"}
                    documentosSubidos={documentosSubidos}
                  />
                </>
              )}
            </>
          )}

          {currentStep !== 1 && currentStep !== 2 && currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && currentStep !== 7 && (
            <div className="text-center py-16">
              <h3 className="text-lg font-bold text-card-dark">Paso en construcción</h3>
            </div>
          )}
        </div>

        {/* Right Column - Status & Cards */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          {/* Status Card */}
          <div className="bg-card-yellow rounded-xl p-5 border border-yellow-200 shadow-sm">
            <p className="text-xs font-bold text-yellow-800 tracking-wider mb-2 uppercase">Estado Actual</p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full shrink-0 ${propuesta.estado === 'redactando' ? 'bg-amber-500' : 'bg-brand-red'}`}></span>
              <p className="text-amber-700 font-bold">{estadosLabel[propuesta.estado] || propuesta.estado}</p>
            </div>
          </div>

          {/* Criteria Card */}
          <div className="bg-card-dark text-white rounded-xl p-6 relative overflow-hidden shadow-sm">
            <svg className="absolute -right-4 -top-4 w-24 h-24 text-white/5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h3 className="font-bold mb-4 relative z-10">Criterios de Aprobación</h3>
            <ul className="space-y-3 text-sm text-slate-300 relative z-10">
              <li className="flex gap-2"><span className="text-brand-red font-bold mt-0.5">•</span> Completar todos los campos obligatorios.</li>
              <li className="flex gap-2"><span className="text-brand-red font-bold mt-0.5">•</span> Adjuntar todos los documentos requeridos.</li>
              <li className="flex gap-2"><span className="text-brand-red font-bold mt-0.5">•</span> Información clara, coherente y verificable.</li>
            </ul>
          </div>

          {/* Help Card */}
          <div className="bg-[#fef9eb] rounded-xl p-6 border border-amber-100 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">¿Necesitas ayuda?</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Consulta la guía para la elaboración de propuestas de pasantía <a href="#" className="font-bold text-brand-red hover:underline">aquí</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
