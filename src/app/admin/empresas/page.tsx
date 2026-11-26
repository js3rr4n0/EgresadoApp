import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import EmpresasManager, { type NotasEmpresa } from "@/components/EmpresasManager";
import { valoracionesDeEmpresas } from "@/lib/valoracionesServidor";
import { getEmpresas } from "@/app/actions/empresas";
import { leerProcesosEmpresas } from "@/lib/procesosEmpresas";
import { calcularEstadisticas, type EstadisticasEmpresa, type ProcesoEmpresa } from "@/lib/estadisticasEmpresas";
import { isoDia } from "@/lib/seguimientoCohortes";
import { leerReportesVigentes } from "@/lib/bitacoraEmpresaServidor";

export const metadata = {
  title: "Gestión de Empresas | Admin",
};

export const dynamic = "force-dynamic";

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const session = await getSession();

  if (!session || session.rol !== "admin") {
    redirect("/login");
  }

  const [{ success, data, error }, procesos, reportes, valoracionesEmp, { editar }] = await Promise.all([
    getEmpresas(),
    leerProcesosEmpresas(),
    leerReportesVigentes(),
    valoracionesDeEmpresas(),
    searchParams,
  ]);
  const notas: Record<number, NotasEmpresa> = {};
  for (const [id, v] of Object.entries(valoracionesEmp)) {
    notas[Number(id)] = { egresados: v.egresados.promedio, asesores: v.asesores.promedio, general: v.general };
  }

  if (!success) {
    return (
      <div className="w-full text-center py-20 text-red-500 font-bold">
        {error}
      </div>
    );
  }

  const porEmpresa = new Map<number, ProcesoEmpresa[]>();
  procesos.forEach((p) => porEmpresa.set(p.empresaId, [...(porEmpresa.get(p.empresaId) ?? []), p]));
  const hoy = isoDia(new Date());
  const estadisticas: Record<number, EstadisticasEmpresa> = {};
  porEmpresa.forEach((lista, id) => (estadisticas[id] = calcularEstadisticas(lista, hoy)));

  const editarId = editar ? Number(editar) : null;

  return (
    <div className="w-full">
      <EmpresasManager initialEmpresas={data || []} estadisticas={estadisticas} reportes={reportes} notas={notas} editarId={Number.isFinite(editarId) ? editarId : null} />
    </div>
  );
}
