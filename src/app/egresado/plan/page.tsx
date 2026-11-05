import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrantesProyecto, propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getPlanTrabajo } from "@/app/actions/planTrabajo";
import PlanTrabajoEquipo from "@/components/proyecto/PlanTrabajoEquipo";

/** Propuesta del egresado (propia o de su equipo) que ya está aprobada: la que tiene plan de trabajo. */
async function propuestaConPlan(userId: number): Promise<number | null> {
  const estados = ["aprobada", "primer_contacto_completado", "en_ejecucion"];
  const [propia] = await db.select({ id: propuestas.id }).from(propuestas)
    .where(and(eq(propuestas.egresadoId, userId), inArray(propuestas.estado, estados))).orderBy(desc(propuestas.id)).limit(1);
  if (propia) return propia.id;
  const [deEquipo] = await db.select({ id: propuestas.id }).from(integrantesProyecto)
    .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
    .where(and(eq(integrantesProyecto.egresadoId, userId), eq(integrantesProyecto.estado, "aceptado"), inArray(propuestas.estado, estados)))
    .orderBy(desc(propuestas.id)).limit(1);
  return deEquipo?.id ?? null;
}

export default async function PlanTrabajoEgresadoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) return null;
  const id = params.id ? Number(params.id) : await propuestaConPlan(session.userId);

  const res = id ? await getPlanTrabajo(id) : null;
  if (!res || !res.success) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-border rounded-2xl text-center space-y-3 shadow-sm">
        <h1 className="text-lg font-bold text-card-dark">Plan de trabajo</h1>
        <p className="text-sm text-muted">
          {res && !res.success ? res.error : "El plan de trabajo se elabora después de que tu propuesta de proyecto sea aprobada."}
        </p>
        <Link href="/egresado" className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl">Volver al panel</Link>
      </div>
    );
  }
  return <PlanTrabajoEquipo key={res.datos.plan.estado} datos={res.datos} />;
}
