import { getEjecucionProyecto } from "@/app/actions/ejecucionProyecto";
import { aplanar } from "@/lib/fichas/planTrabajo";
import RegistroActividadProyecto from "@/components/proyecto/RegistroActividadProyecto";

export default async function RevisionActividadProyectoPage({
  params,
  searchParams,
}: {
  params: Promise<{ propuestaId: string }>;
  searchParams: Promise<{ nodo?: string; periodo?: string }>;
}) {
  const { propuestaId } = await params;
  const { nodo, periodo } = await searchParams;
  const res = await getEjecucionProyecto(Number(propuestaId));
  const p = Number(periodo);
  if (!res.success) return <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>;
  if (!nodo || !aplanar(res.datos.plan.plan.arbol).some((n) => n.id === nodo) || !Number.isInteger(p) || p < 1 || p > res.datos.periodos.length) {
    return <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">No se encontró la actividad.</div>;
  }
  return <RegistroActividadProyecto key={`${nodo}-${p}`} datos={res.datos} nodoId={nodo} periodo={p} />;
}
