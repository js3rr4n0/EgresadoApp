import { getEjecucionProyecto } from "@/app/actions/ejecucionProyecto";
import { getArchivosEntrega } from "@/app/actions/entregasObjetivo";
import EntregaObjetivoProyecto from "@/components/proyecto/EntregaObjetivoProyecto";

// Revisión de los productos de un objetivo específico (notas del 13-nov-2026).
export default async function RevisionEntregaObjetivoPage({
  params,
  searchParams,
}: {
  params: Promise<{ propuestaId: string }>;
  searchParams: Promise<{ nodo?: string }>;
}) {
  const { propuestaId } = await params;
  const { nodo } = await searchParams;
  const res = await getEjecucionProyecto(Number(propuestaId));
  if (!res.success) return <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>;
  if (res.datos.productos === "no" || !nodo || !res.datos.plan.plan.arbol.hijos.some((n) => n.id === nodo)) {
    return <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">No se encontró el objetivo.</div>;
  }
  const entrega = res.datos.entregas.find((e) => e.nodoId === nodo);
  const archivos = entrega ? await getArchivosEntrega(res.datos.plan.propuesta.id, [entrega.id]) : [];
  return <EntregaObjetivoProyecto key={nodo} datos={res.datos} objetivoId={nodo} archivos={archivos} />;
}
