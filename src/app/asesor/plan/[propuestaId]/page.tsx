import Link from "next/link";
import { getPlanTrabajo } from "@/app/actions/planTrabajo";
import PlanTrabajoEquipo from "@/components/proyecto/PlanTrabajoEquipo";

export default async function PlanTrabajoAsesorPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const id = Number(propuestaId);
  const res = Number.isInteger(id) ? await getPlanTrabajo(id) : null;
  return (
    <div className="space-y-4">
      <Link href={`/asesor/propuestas/${propuestaId}`} className="text-sm text-gray-500 hover:text-brand-red">← Volver a la propuesta</Link>
      {res && res.success ? (
        <PlanTrabajoEquipo key={res.datos.plan.estado} datos={res.datos} />
      ) : (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-border rounded-2xl text-center shadow-sm">
          <h1 className="text-lg font-bold text-card-dark mb-2">Plan de trabajo</h1>
          <p className="text-sm text-muted">{res && !res.success ? res.error : "Propuesta inválida."}</p>
        </div>
      )}
    </div>
  );
}
