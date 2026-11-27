import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { cuposAsesores } from "@/lib/cuposAsesoresServidor";
import { CUPO_POR_DEFECTO, NOMBRE_ESTADO_CUPO, type EstadoCupo } from "@/lib/configCohorte";
import { coincideTexto } from "@/lib/filtrosListado";
import { nombreEstado } from "@/lib/historialEstados";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cupos de asesores | Coordinación" };

const CLASE_ESTADO: Record<EstadoCupo, string> = {
  disponible: "border-green-200 bg-green-50 text-green-800",
  casi_lleno: "border-amber-300 bg-amber-50 text-amber-900",
  lleno: "border-red-200 bg-red-50 text-red-800",
};

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * D5 (specs/COORDINADOR_ASIGNACION.md): cuántos procesos tiene cada asesor frente a su cupo, por carrera, para saber
 * quién puede recibir más propuestas.
 */
export default async function CuposPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const sp = await searchParams;
  const q = uno(sp.q).trim();
  const estado = uno(sp.estado) as EstadoCupo | "";
  const datos = await cuposAsesores({ id: session.userId, rol: session.rol }, Number(uno(sp.cohorte)) || undefined);

  const carreras = datos.carreras.map((c) => ({
    ...c,
    visibles: c.asesores.filter((a) => coincideTexto(q, a.nombre, a.correo) && (!estado || a.estado === estado)),
  }));
  const unicos = new Map(datos.carreras.flatMap((c) => c.asesores).map((a) => [a.id, a]));
  const resumen = {
    asesores: unicos.size,
    disponibles: [...unicos.values()].reduce((n, a) => n + a.disponibles, 0),
    llenos: [...unicos.values()].filter((a) => a.estado === "lleno").length,
  };
  const select = "h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-gray-800 focus:border-brand-red focus:outline-none";

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Cupos de asesores">
        Procesos en curso y solicitudes pendientes de cada asesor frente a su cupo (por defecto, {CUPO_POR_DEFECTO}). A un asesor con el cupo lleno no se le pueden enviar solicitudes. El cupo se cambia en la configuración de la cohorte.
      </EncabezadoCoordinacion>

      <form action="/coordinador/cupos" method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 shadow-sm" role="search">
        {datos.cohortes.length > 0 && (
          <label>
            <span className="sr-only">Cohorte</span>
            <select name="cohorte" defaultValue={datos.cohorte?.id ?? ""} className={select}>
              {datos.cohortes.map((c) => <option key={c.id} value={c.id}>Cohorte {c.nombre}</option>)}
            </select>
          </label>
        )}
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Buscar asesor</span>
          <input type="search" name="q" defaultValue={q} placeholder="Buscar asesor" className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-brand-red focus:outline-none" />
        </label>
        <label>
          <span className="sr-only">Estado del cupo</span>
          <select name="estado" defaultValue={estado} className={select}>
            <option value="">Cupo: todos</option>
            {(Object.keys(NOMBRE_ESTADO_CUPO) as EstadoCupo[]).map((e) => <option key={e} value={e}>{NOMBRE_ESTADO_CUPO[e]}</option>)}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-gray-900 px-4 text-xs font-bold text-white hover:bg-gray-800">Filtrar</button>
        {(q || estado) && (
          <Link href={`/coordinador/cupos${datos.cohorte ? `?cohorte=${datos.cohorte.id}` : ""}`} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">
            Limpiar
          </Link>
        )}
      </form>

      {datos.sinConfiguracion || !datos.carreras.length ? (
        <p className="rounded-xl border border-dashed border-border bg-white py-10 text-center text-sm text-gray-600">
          {datos.cohortes.length === 0
            ? "Ninguna cohorte tiene configuración de asesores todavía."
            : "No apareces como coordinador en la configuración de esta cohorte, o tus carreras no tienen asesores configurados."}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { etiqueta: "Asesores", valor: resumen.asesores },
              { etiqueta: "Lugares disponibles", valor: resumen.disponibles },
              { etiqueta: "Con el cupo lleno", valor: resumen.llenos },
            ].map((d) => (
              <div key={d.etiqueta} className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{d.etiqueta}</dt>
                <dd className="text-2xl font-bold text-card-dark">{d.valor}</dd>
              </div>
            ))}
          </dl>

          {carreras.map((c, i) => (
            <section key={`${c.facultad}-${c.id}-${i}`} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
                <div>
                  <h2 className="font-bold text-card-dark">{c.nombre}</h2>
                  <p className="text-xs text-muted">{c.facultad} · {c.asesores.length} asesor{c.asesores.length === 1 ? "" : "es"}</p>
                </div>
                <p className={`text-sm font-bold ${c.disponibles === 0 ? "text-red-800" : "text-gray-800"}`}>
                  {c.disponibles} lugar{c.disponibles === 1 ? "" : "es"} disponible{c.disponibles === 1 ? "" : "s"}
                </p>
              </header>
              {c.visibles.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-600">
                  {c.asesores.length === 0 ? "Esta carrera no tiene asesores en la configuración de la cohorte." : "Ningún asesor coincide con los filtros."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                      <tr>
                        <th className="px-4 py-2">Asesor</th>
                        <th className="px-3 py-2 text-right">En curso</th>
                        <th className="px-3 py-2 text-right">Solicitudes pendientes</th>
                        <th className="px-3 py-2 text-right">Cupo</th>
                        <th className="px-3 py-2 text-right">Disponibles</th>
                        <th className="px-4 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {c.visibles.map((a) => (
                        <tr key={a.id} className="align-top">
                          <td className="px-4 py-2.5">
                            <span className="block font-semibold text-gray-900">{a.nombre}</span>
                            <span className="block text-[11px] text-muted">{a.correo}{a.todasLasCarreras ? " · todas las carreras de la facultad" : ""}</span>
                            {a.procesos.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-[11px] font-bold text-gray-600 hover:text-brand-red">Ver sus {a.procesos.length} procesos</summary>
                                <ul className="mt-1 space-y-0.5 text-[11px] text-gray-700">
                                  {a.procesos.map((p) => (
                                    <li key={`${p.tipo}-${p.propuestaId}`}>
                                      N.º {p.numero} · {p.titulo} · {p.tipo === "pendiente" ? "solicitud pendiente" : nombreEstado(p.estado)}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{a.activos}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{a.pendientes}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{a.cupo}</td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums">{a.disponibles}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${CLASE_ESTADO[a.estado]}`}>{NOMBRE_ESTADO_CUPO[a.estado]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
          <p className="text-xs text-muted">
            Un asesor que atiende varias carreras aparece en cada una con su carga total; por eso la suma de lugares de las carreras
            puede ser mayor que el total.
          </p>
        </>
      )}
    </div>
  );
}
