import { getSession } from "@/lib/session";

export default async function EgresadoPage() {
  const session = await getSession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mi Dashboard</h1>
        <p className="text-muted mt-1">
          Bienvenido, {session?.nombreCompleto}. Sube tus documentos y gestiona tus propuestas de graduación.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Documentos Subidos", value: "0 / 3", color: "from-amber-500 to-amber-600" },
          { label: "Propuestas Creadas", value: "0 / 3", color: "from-blue-500 to-blue-600" },
          { label: "Estado Actual", value: "Pendiente", color: "from-violet-500 to-violet-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-muted font-medium">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">
              <span className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Next steps guidance */}
      <div className="mt-8 rounded-xl bg-amber-500/5 border border-amber-500/20 p-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Próximos pasos
        </h3>
        <p className="text-sm text-muted mt-2">
          Para crear una propuesta, primero debes subir tus <strong>3 documentos obligatorios</strong>: carta de servicio social, certificación de notas y comprobante de pago TG.
        </p>
      </div>

      <div className="mt-8 text-center py-12 rounded-xl border-2 border-dashed border-border">
        <h3 className="text-lg font-semibold text-foreground">Gate de documentos</h3>
        <p className="text-muted text-sm mt-1">El sistema de carga de documentos se implementará en la Fase 4.</p>
      </div>
    </div>
  );
}
