import { getSession } from "@/lib/session";

export default async function AsesorPage() {
  const session = await getSession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Panel de Asesor</h1>
        <p className="text-muted mt-1">
          Bienvenido, {session?.nombreCompleto}. Gestiona las propuestas asignadas y planes de trabajo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: "Propuestas Asignadas", value: "—", color: "from-violet-500 to-violet-600" },
          { label: "Planes de Trabajo", value: "—", color: "from-blue-500 to-blue-600" },
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
        <p className="text-muted text-sm mt-1">Los planes de trabajo se implementarán en la Fase 7.</p>
      </div>
    </div>
  );
}
