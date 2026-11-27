import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { NOMBRE_ESTADO_EGRESADO, propuestasPorRecibir, type EstadoEgresado } from "@/lib/porRecibirServidor";
import Paginacion, { paginar } from "@/components/Paginacion";
import { NOMBRE_MODALIDAD, TAMANO_PAGINA, coincideTexto } from "@/lib/filtrosListado";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuestas por recibir | Coordinación" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const CLASE_ESTADO: Record<EstadoEgresado, string> = {
  enviada: "border-green-200 bg-green-50 text-green-800",
  devuelta: "border-amber-300 bg-amber-50 text-amber-900",
  en_redaccion: "border-gray-300 bg-white text-gray-800",
  sin_propuesta: "border-red-200 bg-red-50 text-red-800",
};

/**
 * D6 (specs/COORDINADOR_ASIGNACION.md): cuántos egresados de la cohorte ya enviaron su propuesta y cuántos faltan, por
 * carrera, junto a los lugares disponibles de los asesores. Solo lectura.
 */
export default async function PorRecibirPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const sp = await searchParams;
  const q = uno(sp.q).trim();
  const carrera = uno(sp.carrera);
  // Por defecto, solo los que faltan
  const estado = (uno(sp.estado) || "pendientes") as EstadoEgresado | "pendientes" | "todos";
  const pagina = Math.max(1, parseInt(uno(sp.pagina), 10) || 1);
  const datos = await propuestasPorRecibir({ id: session.userId, rol: session.rol }, Number(uno(sp.cohorte)) || undefined);

  const total = datos.carreras.reduce(
    (t, c) => ({ registrados: t.registrados + c.registrados, enviadas: t.enviadas + c.enviadas, porRecibir: t.porRecibir + c.porRecibir }),
    { registrados: 0, enviadas: 0, porRecibir: 0 },
  );
  // Solo las carreras con egresados registrados; las demás se mencionan abajo de la tabla
  const conEgresados = datos.carreras.filter((c) => c.registrados > 0);
  const sinEgresados = datos.carreras.length - conEgresados.length;
  const filtrados = datos.egresados.filter(
    (e) =>
      coincideTexto(q, e.nombre, e.carnet, e.correo) &&
      (!carrera || String(e.carreraId) === carrera) &&
      (estado === "todos" || (estado === "pendientes" ? e.estado !== "enviada" : e.estado === estado)),
  );
  const { items, paginaActual, totalPaginas } = paginar(filtrados, pagina, TAMANO_PAGINA);
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (datos.cohorte) u.set("cohorte", String(datos.cohorte.id));
    if (q) u.set("q", q);
    if (carrera) u.set("carrera", carrera);
    if (estado !== "pendientes") u.set("estado", estado);
    if (p > 1) u.set("pagina", String(p));
    return `/coordinador/por-recibir?${u.toString()}`;
  };
  const select = "h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-gray-800 focus:border-brand-red focus:outline-none";

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Propuestas por recibir">
        Egresados de la cohorte en tus carreras: cuántos ya enviaron su propuesta, cuántos la están redactando y cuántos no han empezado, junto a los lugares que les quedan a los asesores. En grupo cuenta cada integrante.
      </EncabezadoCoordinacion>

      {datos.sinConfiguracion || !datos.cohorte ? (
        <p className="rounded-xl border border-dashed border-border bg-white py-10 text-center text-sm text-gray-600">
          {datos.cohortes.length === 0 ? "Ninguna cohorte tiene configuración todavía." : "No apareces como coordinador en la configuración de esta cohorte."}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { etiqueta: "Egresados registrados", valor: total.registrados },
              { etiqueta: "Ya enviaron", valor: total.enviadas },
              { etiqueta: "Por recibir", valor: total.porRecibir },
              { etiqueta: "Lugares de asesores", valor: datos.lugaresTotales },
            ].map((d) => (
              <div key={d.etiqueta} className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{d.etiqueta}</dt>
                <dd className="text-2xl font-bold text-card-dark">{d.valor}</dd>
              </div>
            ))}
          </dl>

          <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <header className="border-b border-border px-5 py-3">
              <h2 className="font-bold text-card-dark">Por carrera · cohorte {datos.cohorte.nombre}</h2>
              <p className="text-xs text-muted">
                Los lugares son los que les quedan a los asesores de la carrera (página «Cupos de asesores»). Una propuesta de grupo
                ocupa un solo lugar, así que la demanda real puede ser menor que los egresados por recibir.
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Carrera</th>
                    <th className="px-3 py-2 text-right">Registrados</th>
                    <th className="px-3 py-2 text-right">Enviaron</th>
                    <th className="px-3 py-2 text-right">En redacción</th>
                    <th className="px-3 py-2 text-right">Devueltas</th>
                    <th className="px-3 py-2 text-right">Sin empezar</th>
                    <th className="px-3 py-2 text-right">Por recibir</th>
                    <th className="px-3 py-2 text-right">Lugares</th>
                    <th className="px-4 py-2">¿Alcanza?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {conEgresados.map((c) => {
                    const falta = c.porRecibir - c.lugaresDisponibles;
                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{c.nombre}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.registrados}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.enviadas}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.enRedaccion}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.devueltas}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.sinEmpezar}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{c.porRecibir}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.lugaresDisponibles}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {c.porRecibir === 0 ? (
                            <span className="text-gray-600">Nada por recibir</span>
                          ) : falta > 0 ? (
                            <span className="font-bold text-red-800">Faltan {falta} lugar{falta === 1 ? "" : "es"}</span>
                          ) : (
                            <span className="text-green-800">Alcanza</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(sinEgresados > 0 || conEgresados.length === 0) && (
              <p className="border-t border-border px-5 py-2.5 text-xs text-muted">
                {conEgresados.length === 0
                  ? "Ninguna de tus carreras tiene egresados registrados en esta cohorte."
                  : `${sinEgresados} carrera${sinEgresados === 1 ? "" : "s"} sin egresados registrados en esta cohorte no se muestra${sinEgresados === 1 ? "" : "n"}.`}
              </p>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="font-bold text-card-dark">Egresados</h2>
            <form action="/coordinador/por-recibir" method="get" className="flex flex-wrap items-end gap-2" role="search">
              <input type="hidden" name="cohorte" value={datos.cohorte.id} />
              <label className="min-w-[14rem] flex-1">
                <span className="sr-only">Buscar egresado</span>
                <input type="search" name="q" defaultValue={q} placeholder="Buscar por nombre, carnet o correo" className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-brand-red focus:outline-none" />
              </label>
              {conEgresados.length > 1 && (
                <label>
                  <span className="sr-only">Carrera</span>
                  <select name="carrera" defaultValue={carrera} className={select}>
                    <option value="">Todas las carreras</option>
                    {conEgresados.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span className="sr-only">Estado</span>
                <select name="estado" defaultValue={estado} className={select}>
                  <option value="pendientes">Solo los que faltan</option>
                  <option value="todos">Todos</option>
                  {(Object.keys(NOMBRE_ESTADO_EGRESADO) as EstadoEgresado[]).map((e) => <option key={e} value={e}>{NOMBRE_ESTADO_EGRESADO[e]}</option>)}
                </select>
              </label>
              <button type="submit" className="h-9 rounded-lg bg-gray-900 px-4 text-xs font-bold text-white hover:bg-gray-800">Filtrar</button>
              {datos.cohortes.length > 1 && (
                <span className="ml-auto flex flex-wrap gap-1.5 text-xs">
                  {datos.cohortes.map((c) => (
                    <Link
                      key={c.id}
                      href={`/coordinador/por-recibir?cohorte=${c.id}`}
                      className={`rounded-lg border px-2.5 py-1.5 font-bold ${c.id === datos.cohorte!.id ? "border-gray-900 bg-gray-900 text-white" : "border-border text-gray-700 hover:bg-gray-50"}`}
                    >
                      {c.nombre}
                    </Link>
                  ))}
                </span>
              )}
            </form>

            {filtrados.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-gray-50 py-8 text-center text-sm text-gray-600">
                {datos.egresados.length === 0 ? "No hay egresados registrados en esta cohorte para tus carreras." : "Ningún egresado coincide con los filtros."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Egresado</th>
                      <th className="px-3 py-2">Carrera</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Propuesta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((e) => (
                      <tr key={e.id} className="align-top">
                        <td className="px-3 py-2.5">
                          <span className="block font-semibold text-gray-900">{e.nombre}</span>
                          <span className="block text-[11px] text-muted">{[e.carnet, e.correo].filter(Boolean).join(" · ")}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-800">{e.carrera}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${CLASE_ESTADO[e.estado]}`}>{NOMBRE_ESTADO_EGRESADO[e.estado]}</span>
                        </td>
                        <td className="max-w-[20rem] px-3 py-2.5 text-xs text-gray-700">
                          {e.propuesta ? (
                            <>
                              {NOMBRE_MODALIDAD[e.propuesta.tipo] ?? e.propuesta.tipo} · N.º {e.propuesta.numero}
                              {e.enGrupo ? " · en grupo" : ""}
                              {e.propuesta.titulo && <span className="block text-gray-500">{e.propuesta.titulo}</span>}
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={filtrados.length} tamanoPagina={TAMANO_PAGINA} construirHref={href} />
          </section>
        </>
      )}
    </div>
  );
}
