import Link from "next/link";
import { getInformeFinal } from "@/app/actions/informeFinalFicha";
import InformeFinalEquipo from "@/components/proyecto/InformeFinalEquipo";

export default async function InformeFinalAsesorPage({ params, searchParams }: { params: Promise<{ propuestaId: string }>; searchParams: Promise<{ cap?: string }> }) {
  const { propuestaId } = await params;
  const { cap } = await searchParams;
  const id = Number(propuestaId);
  const res = Number.isInteger(id) ? await getInformeFinal(id) : null;
  return (
    <div className="space-y-4">
      <Link href={`/asesor/ejecucion/${propuestaId}`} className="text-sm text-gray-500 hover:text-brand-red">← Volver a la ejecución</Link>
      {res && res.success ? (
        <InformeFinalEquipo datos={res.datos} capitulo={Number(cap) || 1} base="?v=1"
          exportar={{ pdf: `/asesor/informe-final/${propuestaId}/imprimir`, word: `/api/informe-final/${propuestaId}/word` }} />
      ) : (
        <p className="text-sm text-muted">{res && !res.success ? res.error : "Propuesta inválida."}</p>
      )}
    </div>
  );
}
