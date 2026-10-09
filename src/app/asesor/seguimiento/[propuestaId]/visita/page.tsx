import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeVisita } from "@/app/actions/informeVisita";
import { formatearFechaHoraElSalvador, hoyISOElSalvador } from "@/lib/periodosPasantia";
import { cuentaRegresivaVisita } from "@/lib/formularioVisita";
import InformeVisitaClient from "./InformeVisitaClient";

export default async function InformeVisitaPage({ params }: { params: Promise<{ propuestaId: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) notFound();

  const res = await getInformeVisita(id);
  if (!res.success || !res.visita || !res.datos) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe de visita."}
      </div>
    );
  }

  return (
    <InformeVisitaClient
      propuestaId={id}
      datos={res.datos}
      cuentaRegresiva={cuentaRegresivaVisita(
        res.ventanaVisita?.inicioPasantia ?? null,
        hoyISOElSalvador(),
        res.visita.estado === "completado"
      )}
      autorizacion={res.autorizacion ?? null}
      estado={res.visita.estado}
      respuestasIniciales={res.visita.respuestas}
      fotos={res.visita.fotos}
      completadoEn={formatearFechaHoraElSalvador(res.visita.completadoEn)}
      puedeEditar={!!res.puedeEditar}
    />
  );
}
