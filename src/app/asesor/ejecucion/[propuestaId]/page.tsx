import Link from "next/link";
import { getEjecucionProyecto } from "@/app/actions/ejecucionProyecto";
import EjecucionProyecto from "@/components/proyecto/EjecucionProyecto";

export default async function EjecucionAsesorPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  const { propuestaId } = await params;
  const id = Number(propuestaId);
  const res = Number.isInteger(id) ? await getEjecucionProyecto(id) : null;
  return (
    <div className="space-y-4">
      <Link href={`/asesor/propuestas/${propuestaId}`} className="text-sm text-gray-500 hover:text-brand-red">← Volver a la propuesta</Link>
      {res && res.success ? (
        <EjecucionProyecto datos={res.datos} />
      ) : (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-border rounded-2xl text-center shadow-sm">
          <h1 className="text-lg font-bold text-card-dark mb-2">Ejecución del proyecto</h1>
          <p className="text-sm text-muted">{res && !res.success ? res.error : "Propuesta inválida."}</p>
        </div>
      )}
    </div>
  );
}
