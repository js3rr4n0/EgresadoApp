import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBitacoraPropuesta } from "@/app/actions/bitacora";
import { DESCRIPCION_BITACORA, leerFiltroBitacora, type FiltroBitacora } from "@/lib/bitacoraEventos";
import BitacoraLista from "@/components/BitacoraLista";

export default async function BitacoraAsesorPage({
  params,
  searchParams,
}: {
  params: Promise<{ propuestaId: string }>;
  searchParams: Promise<{ filtro?: string; pagina?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") redirect("/login");

  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) notFound();

  const sp = await searchParams;
  const filtro = leerFiltroBitacora(sp.filtro);
  const res = await getBitacoraPropuesta(id, filtro, Number(sp.pagina) || 1);
  const href = (f: FiltroBitacora, p?: number) => `/asesor/seguimiento/${id}/bitacora?filtro=${f}${p && p > 1 ? `&pagina=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Bitácora del proceso</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            {res.success && res.egresado ? `${res.egresado.nombreCompleto} (${res.egresado.carnet}). ` : ""}
            {DESCRIPCION_BITACORA}
          </p>
        </div>
        <Link
          href={`/asesor/seguimiento/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {!res.success || !res.eventos ? (
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
