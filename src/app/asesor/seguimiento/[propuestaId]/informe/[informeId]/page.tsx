import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { formatearFechaHoraElSalvador } from "@/lib/periodosPasantia";
import { getEnvioInformeMensual } from "@/app/actions/informesMensuales";
import RevisionInformeClient from "./RevisionInformeClient";

export default async function RevisionInformePage({
  params,
}: {
  params: Promise<{ propuestaId: string; informeId: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { propuestaId, informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) notFound();

  const res = await getEnvioInformeMensual(id);
  if (!res.success || !res.informe || !res.actividadesMes) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe mensual."}
      </div>
    );
  }

  return (
    <RevisionInformeClient
      propuestaId={Number(propuestaId)}
      informe={{
        id: res.informe.id,
        numero: res.informe.numero,
        estado: res.informe.estado,
        fechaLimite: res.informe.fechaLimite,
        enviadoEn: formatearFechaHoraElSalvador(res.informe.enviadoEn),
        cumplimiento: res.informe.cumplimiento,
        comentarioAsesor: res.informe.comentarioAsesor,
      }}
      periodo={res.periodo ? { inicio: res.periodo.inicio, fin: res.periodo.fin } : null}
      actividades={res.actividadesMes}
    />
  );
}
