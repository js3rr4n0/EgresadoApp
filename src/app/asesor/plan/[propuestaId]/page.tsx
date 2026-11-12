import Link from "next/link";
import { getPlanTrabajo } from "@/app/actions/planTrabajo";
import ProtocoloYPlan from "@/components/proyecto/ProtocoloYPlan";

export default async function PlanTrabajoAsesorPage({ params, searchParams }: { params: Promise<{ propuestaId: string }>; searchParams: Promise<{ tab?: string; paso?: string }> }) {
  const { propuestaId } = await params;
  const { tab, paso } = await searchParams;
  const id = Number(propuestaId);
  const res = Number.isInteger(id) ? await getPlanTrabajo(id) : null;
  return (
    <div className="space-y-4">
      <Link href={`/asesor/propuestas/${propuestaId}`} className="text-sm text-gray-500 hover:text-brand-red">← Volver a la propuesta</Link>
      {res && res.success ? (
        <ProtocoloYPlan datos={res.datos} tab={tab} paso={paso} consulta="" />
      ) : (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-border rounded-2xl text-center shadow-sm">
          <h1 className="text-lg font-bold text-card-dark mb-2">Plan de trabajo</h1>
          <p className="text-sm text-muted">{res && !res.success ? res.error : "Propuesta inválida."}</p>
        </div>
      )}
    </div>
  );
}
