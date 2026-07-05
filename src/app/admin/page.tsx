import { getSession } from "@/lib/session";

export default async function AdminDashboard() {
  const session = await getSession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Panel de Administración
        </h1>
        <p className="text-muted mt-1">
          Bienvenido, {session?.nombreCompleto}. Gestiona usuarios, empresas y periodos académicos.
        </p>
      </div>

      {/* Stats grid — placeholder for F3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Usuarios Activos", value: "—", color: "from-blue-500 to-blue-600" },
          { label: "Empresas Habilitadas", value: "—", color: "from-emerald-500 to-emerald-600" },
          { label: "Propuestas Enviadas", value: "—", color: "from-violet-500 to-violet-600" },
          { label: "Periodo Activo", value: "—", color: "from-amber-500 to-amber-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-card border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-muted font-medium">{stat.label}</p>
            <p className="text-3xl font-bold mt-2 bg-gradient-to-r bg-clip-text text-transparent" style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`}} >
              <span className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="mt-12 text-center py-16 rounded-xl border-2 border-dashed border-border">
        <svg className="w-12 h-12 mx-auto text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <h3 className="text-lg font-semibold text-foreground">
          Módulos en construcción
        </h3>
        <p className="text-muted text-sm mt-1">
          Los módulos de administración se implementarán en la Fase 3.
        </p>
      </div>
    </div>
  );
}
