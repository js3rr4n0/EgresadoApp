import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBitacoraAsesor } from "@/app/actions/bitacora";
import { leerFiltroBitacora, type FiltroBitacora } from "@/lib/bitacoraEventos";
import BitacoraLista from "@/components/BitacoraLista";

export default async function BitacoraAsesorCoordinadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ asesorId: string }>;
  searchParams: Promise<{ filtro?: string; pagina?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) redirect("/login");

  const { asesorId } = await params;
  const id = Number(asesorId);
  if (!Number.isFinite(id)) notFound();

  const sp = await searchParams;
  const filtro = leerFiltroBitacora(sp.filtro);
  const res = await getBitacoraAsesor(id, filtro, Number(sp.pagina) || 1);
  const href = (f: FiltroBitacora, p?: number) => `/coordinador/seguimiento/asesor/${id}?filtro=${f}${p && p > 1 ? `&pagina=${p}` : ""}`;
  const egresadoPorPropuesta = res.success ? Object.fromEntries(res.egresados.map((e) => [e.propuestaId, e.nombreCompleto])) : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">
            Bitácora del asesor{res.success && res.asesor ? `: ${res.asesor.nombreCompleto}` : ""}
          </h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            Actividad registrada en los procesos de todos los egresados en pasantía que atiende el asesor.
          </p>
        </div>
        <Link
          href="/coordinador/seguimiento"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {!res.success || !res.eventos ? (
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>
      ) : (
        <>
          {res.egresados && res.egresados.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-bold uppercase text-slate-400">Egresados:</span>
              {res.egresados.map((e) => (
                <Link
                  key={e.propuestaId}
                  href={`/coordinador/seguimiento/bitacora/${e.propuestaId}`}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                >
                  {e.nombreCompleto} ({e.carnet})
                </Link>
              ))}
            </div>
          )}
          <BitacoraLista
            eventos={res.eventos}
            filtro={filtro}
            pagina={res.pagina!}
            totalPaginas={res.totalPaginas!}
            total={res.total!}
            construirHref={href}
            egresadoPorPropuesta={egresadoPorPropuesta}
          />
        </>
      )}
    </div>
  );
}
