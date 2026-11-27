import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { asesoresPorEmpresa } from "@/lib/asesoresPorEmpresaServidor";
import Paginacion, { paginar } from "@/components/Paginacion";
import { TAMANO_PAGINA, coincideTexto } from "@/lib/filtrosListado";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asesores por empresa | Coordinación" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * D7 (specs/COORDINADOR_ASIGNACION.md): empresas con propuestas de tus carreras, sus datos de contacto, cuántos
 * procesos tienen y qué asesores trabajan con ellas. Solo lectura.
 */
export default async function AsesoresPorEmpresaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const sp = await searchParams;
  const q = uno(sp.q).trim();
  const cohorteParam = uno(sp.cohorte) || "todas";
  const estado = uno(sp.estado);
  const pagina = Math.max(1, parseInt(uno(sp.pagina), 10) || 1);
  const datos = await asesoresPorEmpresa({ id: session.userId, rol: session.rol }, cohorteParam === "todas" ? "todas" : Number(cohorteParam) || "todas");

  const filtradas = datos.empresas.filter(
    (e) =>
      coincideTexto(q, e.nombre, e.area, e.direccion, ...e.asesores.map((a) => a.nombre)) &&
      (!estado || (estado === "en_curso" ? e.propuestas.enCurso > 0 : estado === "sin_asesor" ? e.asesores.length === 0 : estado === "deshabilitada" ? !e.habilitada : true)),
  );
  const { items, paginaActual, totalPaginas } = paginar(filtradas, pagina, TAMANO_PAGINA);
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (cohorteParam !== "todas") u.set("cohorte", cohorteParam);
    if (q) u.set("q", q);
    if (estado) u.set("estado", estado);
    if (p > 1) u.set("pagina", String(p));
    const qs = u.toString();
    return qs ? `/coordinador/empresas?${qs}` : "/coordinador/empresas";
  };
  const totalAsesores = new Set(datos.empresas.flatMap((e) => e.asesores.map((a) => a.id))).size;
  const select = "h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-gray-800 focus:border-brand-red focus:outline-none";

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Asesores por empresa">
        Empresas donde trabajan los egresados de tus carreras: sus datos de contacto, cuántas propuestas tienen (en curso y en espera de asesor) y qué asesores las atienden. El catálogo lo actualiza la administración.
      </EncabezadoCoordinacion>

      <form action="/coordinador/empresas" method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 shadow-sm" role="search">
        <label>
          <span className="sr-only">Cohorte</span>
          <select name="cohorte" defaultValue={cohorteParam} className={select}>
            <option value="todas">Todas las cohortes</option>
            {datos.cohortes.map((c) => <option key={c.id} value={c.id}>Cohorte {c.nombre}</option>)}
          </select>
        </label>
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Buscar</span>
          <input type="search" name="q" defaultValue={q} placeholder="Buscar empresa, área, dirección o asesor" className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-brand-red focus:outline-none" />
        </label>
        <label>
          <span className="sr-only">Mostrar</span>
          <select name="estado" defaultValue={estado} className={select}>
            <option value="">Todas las empresas</option>
            <option value="en_curso">Con procesos en curso</option>
            <option value="sin_asesor">Sin asesor todavía</option>
            <option value="deshabilitada">Deshabilitadas en el catálogo</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-gray-900 px-4 text-xs font-bold text-white hover:bg-gray-800">Filtrar</button>
        {(q || estado || cohorteParam !== "todas") && (
          <Link href="/coordinador/empresas" className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      {datos.sinConfiguracion ? (
        <p className="rounded-xl border border-dashed border-border bg-white py-10 text-center text-sm text-gray-600">No apareces como coordinador en la configuración de la cohorte.</p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { etiqueta: "Empresas", valor: datos.empresas.length },
              { etiqueta: "Propuestas", valor: datos.empresas.reduce((n, e) => n + e.propuestas.total, 0) },
              { etiqueta: "Asesores trabajando con ellas", valor: totalAsesores },
            ].map((d) => (
              <div key={d.etiqueta} className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{d.etiqueta}</dt>
                <dd className="text-2xl font-bold text-card-dark">{d.valor}</dd>
              </div>
            ))}
          </dl>

          {filtradas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-white py-10 text-center text-sm text-gray-600">
              {datos.empresas.length === 0 ? "No hay propuestas con empresa en tus carreras para esta cohorte." : "Ninguna empresa coincide con los filtros."}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((e) => (
                <section key={e.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-card-dark">{e.nombre}</h2>
                      <p className="text-xs text-muted">
                        {[e.area, e.direccion, e.sucursales ? `${e.sucursales} sucursal${e.sucursales === 1 ? "" : "es"}` : null].filter(Boolean).join(" · ") || "Sin datos de área ni dirección"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${e.habilitada ? "border-gray-300 bg-white text-gray-700" : "border-red-200 bg-red-50 text-red-800"}`}>
                        {e.habilitada ? "Habilitada" : "Deshabilitada"}
                      </span>
                      {e.verificada && <span className="rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-800">Verificada</span>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Contacto principal</p>
                      {e.contacto ? (
                        <div className="mt-0.5 text-sm">
                          <p className="font-semibold text-gray-900">{e.contacto.nombre}</p>
                          <p className="text-xs text-gray-600">{[e.contacto.papel, e.contacto.cargo].filter(Boolean).join(" · ")}</p>
                          <p className="text-xs text-gray-600">{[e.contacto.correo, e.contacto.telefono].filter(Boolean).join(" · ")}</p>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm text-muted">Sin firmantes ni supervisores registrados.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Propuestas</p>
                      <p className="mt-0.5 text-sm text-gray-900">
                        <span className="font-bold">{e.propuestas.total}</span> en total · {e.propuestas.enCurso} en curso · {e.propuestas.enEspera} en espera de asesor
                      </p>
                      <p className="text-xs text-gray-600">Cohortes: {e.cohortes.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Asesores ({e.asesores.length})</p>
                      {e.asesores.length ? (
                        <ul className="mt-0.5 space-y-0.5 text-sm">
                          {e.asesores.map((a) => (
                            <li key={a.id}>
                              <span className="font-semibold text-gray-900">{a.nombre}</span>
                              <span className="text-xs text-gray-600"> · {a.total} propuesta{a.total === 1 ? "" : "s"}{a.enCurso ? `, ${a.enCurso} en curso` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-0.5 text-sm text-muted">Ningún asesor todavía.</p>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
          <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={filtradas.length} tamanoPagina={TAMANO_PAGINA} construirHref={href} />
        </>
      )}
    </div>
  );
}
