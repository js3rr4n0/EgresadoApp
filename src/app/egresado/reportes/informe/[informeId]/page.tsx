import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { formatearFechaHoraElSalvador, esInformeFinal } from "@/lib/periodosPasantia";
import { leerCartaFinalizacion } from "@/lib/informeFinal";
import { getEnvioInformeMensual } from "@/app/actions/informesMensuales";
import EnvioInformeClient from "./EnvioInformeClient";

export default async function EnvioInformePage({ params }: { params: Promise<{ informeId: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const { informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) notFound();

  const res = await getEnvioInformeMensual(id);
  if (!res.success || !res.informe || !res.requisitos) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe."}
      </div>
    );
  }

  const carta = leerCartaFinalizacion(res.informe.cartaFinalizacion);
  return (
    <EnvioInformeClient
      final={
        esInformeFinal(res.informe.numero)
          ? {
              agradecimientos: res.informe.agradecimientos ?? "",
              carta: carta ? { nombre: carta.nombre, url: carta.url } : null,
              cartaVerificada: !!res.informe.cartaFinalizacionVerificadaEn,
            }
          : null
      }
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
      requisitos={res.requisitos}
      advertencias={res.advertencias ?? []}
      paginasEstimadas={res.paginasEstimadas ?? 0}
      puedeEnviar={!!res.puedeEnviar}
    />
  );
}
