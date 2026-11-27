import { getDetallePropuestaAsesor } from "@/app/actions/asesor";
import { getOrCreateInformePrimerContacto } from "@/app/actions/informes";
import Link from "next/link";
import PropuestaProgresoClient from "./PropuestaProgresoClient";
import FortalezaResumen from "@/components/fortaleza/FortalezaResumen";
import PedirCambioAsesor from "@/components/cambioAsesor/PedirCambioAsesor";
import { ultimoCambio } from "@/lib/cambioAsesorServidor";
import { ESTADOS_CAMBIO_PERMITIDO } from "@/lib/cambioAsesor";
import { getSession } from "@/lib/session";
import ConstanciaSinSupervisor from "@/components/revisarPropuesta/ConstanciaSinSupervisor";
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

  // D8: cambio de asesor, solo si la propuesta es suya y está en un estado que lo permite
  const sesion = await getSession();
  const propD8 = (res.data as { propuesta: { estado: string; asesorId: number | null } }).propuesta;
  const cambioPosible = !!sesion && propD8.asesorId === sesion.userId && ESTADOS_CAMBIO_PERMITIDO.includes(propD8.estado);

  // Proyecto con ficha (P3): el plan de trabajo del equipo se revisa en su propia pantalla.
  const estadoPlan = await estadoPlanDePropuesta(pId);
  // Investigación (H22): el protocolo se envía y se dictamina junto con el plan.
  const queEs = (res.data as { propuesta: { tipo: string } }).propuesta.tipo === "investigacion" ? "el protocolo y el plan de trabajo" : "el plan de trabajo";
  const textoPlan: Record<string, string> = {
    sin_plan: `El equipo todavía no ha empezado ${queEs}.`,
    redactando: `El equipo está elaborando ${queEs}.`,
    enviado: `El equipo envió ${queEs}: está pendiente de tu revisión.`,
    observado: `Pediste ajustes ${queEs === "el plan de trabajo" ? "al plan de trabajo" : "al protocolo y al plan de trabajo"}; el equipo los está corrigiendo.`,
    aprobado: `Aprobaste ${queEs}.`,
  };

  return (
    <>
      {/* El plan se elabora después de aprobada la propuesta (H17): antes no se muestra su estado. */}
      {estadoPlan && !(estadoPlan === "sin_plan" && !["aprobada", "primer_contacto_completado", "en_ejecucion"].includes((res.data as { propuesta: { estado: string } }).propuesta.estado)) && (
        <div className={`mb-4 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${estadoPlan === "enviado" ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
          <div>
            <p className="text-sm font-bold text-slate-900">Plan de trabajo del equipo</p>
            <p className="text-xs text-slate-600">{textoPlan[estadoPlan] ?? estadoPlan}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {estadoPlan !== "sin_plan" && (
              <Link href={`/asesor/plan/${pId}`} className="bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl">
                {estadoPlan === "enviado" ? "Revisar plan" : "Ver plan"}
              </Link>
            )}
            {estadoPlan === "aprobado" && (
              <Link href={`/asesor/ejecucion/${pId}`} className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
                Ejecución del equipo
              </Link>
            )}
          </div>
        </div>
      )}
      {/* D8: el asesor puede pedir que se asigne otro asesor */}
      {cambioPosible && (
        <div className="mb-4">
          <PedirCambioAsesor propuestaId={pId} quien="asesor" asesorActual={sesion!.nombreCompleto} ultimo={await ultimoCambio(pId)} />
        </div>
      )}
      {/* R3: fortaleza de la propuesta (problema, justificación y alcance) */}
      <div className="mb-4 space-y-4">
        {/* D2: constancia si trabaja sin supervisor empresarial */}
        <ConstanciaSinSupervisor propuestaId={pId} />
        <FortalezaResumen propuestaId={pId} paraAsesor />
      </div>
      <PropuestaProgresoClient
        estadoPlan={estadoPlan}
        data={res.data as any}
        informeData={informeData}
      />
    </>
  );
}
