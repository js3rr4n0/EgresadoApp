import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getBitacoraPropuesta } from "@/app/actions/bitacora";
import { DESCRIPCION_BITACORA, leerFiltroBitacora, type FiltroBitacora } from "@/lib/bitacoraEventos";
import BitacoraLista from "@/components/BitacoraLista";

export default async function BitacoraEgresadoPage({ searchParams }: { searchParams: Promise<{ filtro?: string; pagina?: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") redirect("/login");

  const sp = await searchParams;
  const filtro = leerFiltroBitacora(sp.filtro);

  const [prop] = await db
    .select({ id: propuestas.id })
    .from(propuestas)
    .where(and(eq(propuestas.egresadoId, session.userId), eq(propuestas.tipo, "pasantia"), eq(propuestas.estado, "en_ejecucion")))
    .limit(1);

  const res = prop ? await getBitacoraPropuesta(prop.id, filtro, Number(sp.pagina) || 1) : null;
  const href = (f: FiltroBitacora, p?: number) => `/egresado/reportes/bitacora?filtro=${f}${p && p > 1 ? `&pagina=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Bitácora del proceso</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">{DESCRIPCION_BITACORA}</p>
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver a reportes de actividades
        </Link>
      </div>

      {!res ? (
        <p className="text-xs text-slate-500 font-semibold">La bitácora se habilita cuando su pasantía se encuentra en ejecución.</p>
      ) : !res.success || !res.eventos ? (
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>
      ) : (
        <BitacoraLista
          eventos={res.eventos}
          filtro={filtro}
          pagina={res.pagina!}
          totalPaginas={res.totalPaginas!}
          total={res.total!}
          construirHref={href}
        />
      )}
    </div>
  );
}
