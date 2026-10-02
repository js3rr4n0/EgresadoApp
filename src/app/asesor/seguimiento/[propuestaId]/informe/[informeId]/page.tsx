import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { formatearFechaHoraElSalvador } from "@/lib/periodosPasantia";
import { getEnvioInformeMensual } from "@/app/actions/informesMensuales";
import { getNotasSeguimiento } from "@/app/actions/comentariosAsesor";
import { getInformeVisita } from "@/app/actions/informeVisita";
import { leerComentarios, validarComentariosCompletos } from "@/lib/comentariosAsesor";
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
        {res.error || "No se pudo cargar el informe."}
      </div>
    );
  }

  const [notasRes, visitaRes] = await Promise.all([
    getNotasSeguimiento(Number(propuestaId)),
    res.informe.numero === 3 ? getInformeVisita(Number(propuestaId)) : Promise.resolve(null),
  ]);
  const notasSemanales =
    notasRes.success && notasRes.notas
      ? notasRes.notas.filter((n) => n.periodo === res.informe!.numero).map((n) => ({ semana: n.semana, nota: n.nota }))
      : [];
  const comentarios = leerComentarios(res.informe.comentariosDecanato);
  const visita =
    res.informe.numero === 3
      ? { requerida: true, completada: !!(visitaRes && visitaRes.success && visitaRes.visita?.estado === "completado") }
      : { requerida: false, completada: true };

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
      comentarios={comentarios}
      comentariosCompletos={validarComentariosCompletos(comentarios).length === 0}
      notasSemanales={notasSemanales}
      visita={visita}
    />
  );
}
