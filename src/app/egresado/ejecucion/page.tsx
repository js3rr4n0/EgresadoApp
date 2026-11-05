import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrantesProyecto, propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getEjecucionProyecto } from "@/app/actions/ejecucionProyecto";
import EjecucionProyecto from "@/components/proyecto/EjecucionProyecto";

/** Proyecto en ejecución del egresado (propio o de su equipo). */
async function proyectoEnEjecucion(userId: number): Promise<number | null> {
  const [propia] = await db.select({ id: propuestas.id }).from(propuestas)
    .where(and(eq(propuestas.egresadoId, userId), eq(propuestas.tipo, "proyecto"), eq(propuestas.estado, "en_ejecucion"))).orderBy(desc(propuestas.id)).limit(1);
  if (propia) return propia.id;
  const [deEquipo] = await db.select({ id: propuestas.id }).from(integrantesProyecto)
    .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
    .where(and(eq(integrantesProyecto.egresadoId, userId), eq(integrantesProyecto.estado, "aceptado"), eq(propuestas.estado, "en_ejecucion")))
    .orderBy(desc(propuestas.id)).limit(1);
  return deEquipo?.id ?? null;
}

export default async function EjecucionEgresadoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) return null;
  const id = params.id ? Number(params.id) : await proyectoEnEjecucion(session.userId);
  const res = id ? await getEjecucionProyecto(id) : null;
  if (!res || !res.success) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-border rounded-2xl text-center space-y-3 shadow-sm">
        <h1 className="text-lg font-bold text-card-dark">Ejecución del proyecto</h1>
        <p className="text-sm text-muted">{res && !res.success ? res.error : "No tienes un proyecto en ejecución. En pasantía, tus actividades están en \"Reportes de actividades\"."}</p>
        <Link href="/egresado" className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl">Volver al panel</Link>
      </div>
    );
  }
  return <EjecucionProyecto datos={res.datos} />;
}
