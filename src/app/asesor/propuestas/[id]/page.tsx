import { getDetallePropuestaAsesor } from "@/app/actions/asesor";
import { getOrCreateInformePrimerContacto } from "@/app/actions/informes";
import Link from "next/link";
import PropuestaProgresoClient from "./PropuestaProgresoClient";
import { estadoPlanDePropuesta } from "@/app/actions/planTrabajo";

export default async function AsesorPropuestaProgresoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const pId = parseInt(p.id, 10);
  if (isNaN(pId)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">ID de Propuesta Inválido</h2>
        <p className="text-xs text-slate-500">La propuesta solicitada no existe o el identificador es incorrecto.</p>
        <Link
          href="/asesor"
          className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          Volver a Mis Propuestas
        </Link>
      </div>
    );
  }

  const res = await getDetallePropuestaAsesor(pId);
  if (!res || !res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No se pudo cargar la propuesta #{pId}</h2>
        <p className="text-xs text-slate-500">
          {res?.error || "Es posible que la propuesta no exista o requiera asignación de asesor."}
        </p>
        <Link
          href="/asesor"
          className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          Volver al Panel de Asesor
        </Link>
      </div>
    );
  }

  let informeData = null;
  try {
    const informeRes = await getOrCreateInformePrimerContacto(pId);
    if (informeRes && informeRes.success) {
      informeData = informeRes.informe;
    }
  } catch (err) {
    console.error("Error al obtener informe de primer contacto:", err);
  }

  // Proyecto con ficha (P3): el plan de trabajo del equipo se revisa en su propia pantalla.
  const estadoPlan = await estadoPlanDePropuesta(pId);
  const textoPlan: Record<string, string> = {
    sin_plan: "El equipo todavía no ha empezado su plan de trabajo.",
    redactando: "El equipo está elaborando su plan de trabajo.",
    enviado: "El equipo envió su plan de trabajo: está pendiente de tu revisión.",
    observado: "Pediste ajustes al plan de trabajo; el equipo los está corrigiendo.",
    aprobado: "Aprobaste el plan de trabajo del equipo.",
  };

  return (
    <>
      {estadoPlan && (
        <div className={`mb-4 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${estadoPlan === "enviado" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
          <div>
            <p className="text-sm font-bold text-slate-900">Plan de trabajo del equipo</p>
            <p className="text-xs text-slate-600">{textoPlan[estadoPlan] ?? estadoPlan}</p>
          </div>
          {estadoPlan !== "sin_plan" && (
            <Link href={`/asesor/plan/${pId}`} className="bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              {estadoPlan === "enviado" ? "Revisar plan" : "Ver plan"}
            </Link>
          )}
        </div>
      )}
      <PropuestaProgresoClient
        data={res.data as any}
        informeData={informeData}
      />
    </>
  );
}
