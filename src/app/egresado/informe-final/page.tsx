import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrantesProyecto, propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getInformeFinal } from "@/app/actions/informeFinalFicha";
import InformeFinalEquipo from "@/components/proyecto/InformeFinalEquipo";

/** Investigación o proyecto en ejecución del egresado, propio o de su equipo (H7: proyecto también tiene informe final). */
const CON_INFORME_FINAL = ["investigacion", "proyecto"];
async function trabajoEnEjecucion(userId: number): Promise<number | null> {
  const [propia] = await db.select({ id: propuestas.id }).from(propuestas)
    .where(and(eq(propuestas.egresadoId, userId), inArray(propuestas.tipo, CON_INFORME_FINAL), inArray(propuestas.estado, ["en_ejecucion"]))).orderBy(desc(propuestas.id)).limit(1);
  if (propia) return propia.id;
  const [deEquipo] = await db.select({ id: propuestas.id }).from(integrantesProyecto)
    .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
    .where(and(eq(integrantesProyecto.egresadoId, userId), eq(integrantesProyecto.estado, "aceptado"), inArray(propuestas.tipo, CON_INFORME_FINAL), eq(propuestas.estado, "en_ejecucion")))
    .orderBy(desc(propuestas.id)).limit(1);
  return deEquipo?.id ?? null;
}

export default async function InformeFinalEgresadoPage({ searchParams }: { searchParams: Promise<{ id?: string; cap?: string }> }) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) return null;
  const id = params.id ? Number(params.id) : await trabajoEnEjecucion(session.userId);
  const res = id ? await getInformeFinal(id) : null;
  if (!res || !res.success) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-border rounded-2xl text-center space-y-3 shadow-sm">
        <h1 className="text-lg font-bold text-card-dark">Informe final</h1>
        <p className="text-sm text-muted">{res && !res.success ? res.error : "El informe final por capítulos se redacta durante la ejecución del proyecto o de la investigación."}</p>
        <Link href="/egresado" className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl">Volver al panel</Link>
      </div>
    );
  }
  return <InformeFinalEquipo datos={res.datos} capitulo={Number(params.cap) || 1} base={`?id=${res.datos.plan.propuesta.id}`}
    exportar={{ pdf: `/egresado/informe-final/imprimir?id=${res.datos.plan.propuesta.id}`, word: `/api/informe-final/${res.datos.plan.propuesta.id}/word` }} />;
}
