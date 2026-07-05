import { getActivePropuesta } from "@/app/actions/propuestas";
import PortadaForm from "@/components/PortadaForm";

export default async function EgresadoPage() {
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

  // Mapa de estados para etiquetas visuales
  const estadosLabel: Record<string, string> = {
    redactando: "Redactando Propuesta",
    enviada: "Enviada a Revisión",
    rechazada: "Propuesta Rechazada",
    aprobada: "Propuesta Aprobada",
  };

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
            {[
              { num: 1, title: "Portada", desc: "Información general del trabajo", active: true },
              { num: 2, title: "Carta de Aceptación", desc: "Documento de aceptación", active: false },
              { num: 3, title: "Datos empresariales", desc: "Información de la institución", active: false },
              { num: 4, title: "Descripción de actividades", desc: "Actividades que realizarás", active: false },
              { num: 5, title: "Justificación del proceso", desc: "Justificación y objetivos", active: false },
              { num: 6, title: "Documentación del estudiante", desc: "Documentos requeridos", active: false },
            ].map((step, idx) => (
              <div key={idx} className={`relative flex items-start gap-4 p-3 rounded-lg ${step.active ? "bg-red-50" : ""}`}>
                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                  step.active ? "bg-brand-red text-white" : "bg-muted-bg text-muted border border-border"
                }`}>
                  {step.num}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${step.active ? "text-brand-red" : "text-foreground"}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-8 w-full flex items-center justify-center gap-2 bg-white border border-border hover:bg-muted-bg text-foreground font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Vista Previa
          </button>
        </div>

        {/* Middle Column - Form */}
        <div className="flex-1 bg-white border border-border rounded-xl p-8">
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
              <li className="flex gap-2"><span className="text-brand-red font-bold mt-0.5">•</span> Aprobación del asesor metodológico.</li>
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
