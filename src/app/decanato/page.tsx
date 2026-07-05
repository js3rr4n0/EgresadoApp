import { getSession } from "@/lib/session";

export default async function DecanatoPage() {
  const session = await getSession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Decanato</h1>
        <p className="text-muted mt-1">
          Bienvenido, {session?.nombreCompleto}. Revisa y aprueba propuestas y empresas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Propuestas Pendientes", value: "—", color: "from-emerald-500 to-emerald-600" },
          { label: "Empresas por Verificar", value: "—", color: "from-amber-500 to-amber-600" },
          { label: "Aprobadas este Periodo", value: "—", color: "from-blue-500 to-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-sm text-muted font-medium">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">
              <span className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center py-16 rounded-xl border-2 border-dashed border-border">
        <h3 className="text-lg font-semibold text-foreground">Módulos en construcción</h3>
        <p className="text-muted text-sm mt-1">Las colas de revisión se implementarán en la Fase 6.</p>
      </div>
    </div>
  );
}
