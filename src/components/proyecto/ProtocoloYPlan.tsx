// Investigación (entrega I3): el protocolo y el plan de trabajo se elaboran y se envían juntos. Pestañas para el
// equipo (/egresado/plan) y el asesor (/asesor/plan/[id]). Sin protocolo en la ficha, se muestra solo el plan.
import Link from "next/link";
import type { DatosPlan } from "@/app/actions/planTrabajo";
import { getProtocolo } from "@/app/actions/protocolo";
import PlanTrabajoEquipo from "./PlanTrabajoEquipo";
import ProtocoloEquipo from "./ProtocoloEquipo";

export default async function ProtocoloYPlan({ datos, tab, paso, consulta }: { datos: DatosPlan; tab?: string; paso?: string; consulta: string }) {
  if (!datos.protocolo) return <PlanTrabajoEquipo key={datos.plan.estado} datos={datos} />;
  const pestana = tab === "plan" ? "plan" : "protocolo";
  const prot = await getProtocolo(datos.propuesta.id);
  const sep = consulta ? "&" : "?";
  const href = (t: string) => `${consulta}${sep}tab=${t}`;
  const pendientes = prot.success ? prot.datos.problemas.length + Object.keys(prot.datos.precargas).length : 0;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Protocolo y plan de trabajo" className="flex gap-1 border-b border-gray-200">
        {[
          { id: "protocolo", texto: datos.protocolo.nombre, marca: pendientes },
          { id: "plan", texto: "Plan de trabajo (cronograma)", marca: 0 },
        ].map((t) => (
          <Link key={t.id} role="tab" aria-selected={pestana === t.id} href={href(t.id)}
            className={`px-3.5 py-2.5 text-sm font-bold border-b-2 -mb-px flex items-center gap-1.5 ${pestana === t.id ? "border-brand-red text-brand-red" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {t.texto}
            {t.marca > 0 && <span className="text-xs rounded-full px-1.5 py-0.5 bg-amber-100 text-amber-800">{t.marca}</span>}
          </Link>
        ))}
      </div>
      {pestana === "plan" ? (
        <PlanTrabajoEquipo key={datos.plan.estado} datos={datos} />
      ) : prot.success ? (
        <ProtocoloEquipo datos={prot.datos} plan={datos} paso={Number(paso) || 1} base={href("protocolo")} />
      ) : (
        <p className="text-sm text-muted">{prot.error}</p>
      )}
    </div>
  );
}
