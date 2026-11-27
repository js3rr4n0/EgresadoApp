// D8 (specs/COORDINADOR_ASIGNACION.md): bajas y cambios de asesor, para el coordinador y la administración. Con
// búsqueda, filtros (tipo y estado) y paginado en la dirección.

import Link from "next/link";
import ResolverBaja from "@/components/coordinador/ResolverBaja";
import ResolverCambioAsesor from "@/components/cambioAsesor/ResolverCambioAsesor";
import Paginacion, { paginar } from "@/components/Paginacion";
import { NOMBRE_MODALIDAD, TAMANO_PAGINA, coincideTexto } from "@/lib/filtrosListado";
import { fechaCortaSV } from "@/lib/fechasTexto";
import type { FilaSolicitudCoordinacion } from "@/lib/solicitudesCoordinacionServidor";

type Parametros = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function TablaSolicitudesCoordinacion({
  filas,
  base,
  sp,
  rutaPropuesta,
}: {
  filas: FilaSolicitudCoordinacion[];
  /** Dirección de la página (para filtros y paginado). */
  base: string;
  sp: Parametros;
  rutaPropuesta: (id: number) => string;
}) {
  const q = uno(sp.q).trim();
  const tipo = uno(sp.tipo);
  const estado = uno(sp.estado) || "por_atender";
  const pagina = Math.max(1, parseInt(uno(sp.pagina), 10) || 1);

  const filtradas = filas.filter(
    (f) =>
      coincideTexto(q, f.titulo, f.pide, f.egresado, f.asesor) &&
      (!tipo || f.tipo === tipo) &&
      (estado === "todas" || (estado === "por_atender" ? f.porAtender : !f.porAtender)),
  );
  const { items, paginaActual, totalPaginas } = paginar(filtradas, pagina, TAMANO_PAGINA);
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (tipo) u.set("tipo", tipo);
    if (estado !== "por_atender") u.set("estado", estado);
    if (p > 1) u.set("pagina", String(p));
    const qs = u.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const select = "h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-gray-800 focus:border-brand-red focus:outline-none";
  const porAtender = filas.filter((f) => f.porAtender).length;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-bold text-card-dark">Bajas y cambios de asesor</h2>
          <p className="text-xs text-muted">
            Las atienden el coordinador de la propuesta o la administración; cuando uno la resuelve, deja de estar pendiente para el
            otro y queda quién lo hizo.
          </p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold ${porAtender ? "bg-brand-red text-white" : "bg-gray-100 text-gray-600"}`}>
          {porAtender === 1 ? "1 por atender" : `${porAtender} por atender`}
        </span>
      </div>

      <form action={base} method="get" className="flex flex-wrap items-end gap-2" role="search">
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Buscar</span>
          <input type="search" name="q" defaultValue={q} placeholder="Buscar por título, egresado o asesor" className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-brand-red focus:outline-none" />
        </label>
        <label>
          <span className="sr-only">Tipo</span>
          <select name="tipo" defaultValue={tipo} className={select}>
            <option value="">Todos los tipos</option>
            <option value="cambio">Cambio de asesor</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Estado</span>
          <select name="estado" defaultValue={estado} className={select}>
            <option value="por_atender">Por atender</option>
            <option value="resueltas">Resueltas o en curso</option>
            <option value="todas">Todas</option>
          </select>
        </label>
        <button type="submit" className="h-9 rounded-lg bg-gray-900 px-4 text-xs font-bold text-white hover:bg-gray-800">Filtrar</button>
      </form>

      {filtradas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-gray-50 py-8 text-center text-sm text-gray-600">
          {filas.length === 0 ? "No hay solicitudes de baja ni de cambio de asesor." : estado === "por_atender" && !q && !tipo ? "No hay solicitudes por atender." : "Ninguna solicitud coincide con los filtros."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Propuesta</th>
                <th className="px-3 py-2.5">Motivo</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((f) => (
                <tr key={f.clave} className="align-top">
                  <td className="whitespace-nowrap px-3 py-3 text-gray-700">{fechaCortaSV(f.fecha)}</td>
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-gray-900">{f.tipo === "baja" ? "Baja" : "Cambio de asesor"}</span>
                    <span className="block text-[11px] text-gray-500">Pide: {f.pide}</span>
                  </td>
                  <td className="max-w-[18rem] px-3 py-3">
                    <Link href={rutaPropuesta(f.propuestaId)} className="block font-semibold text-gray-900 hover:text-brand-red hover:underline">
                      {f.titulo}
                    </Link>
                    <span className="block text-[11px] text-gray-500">
                      {NOMBRE_MODALIDAD[f.modalidad] ?? f.modalidad}
                      {f.egresado ? ` · ${f.egresado}` : ""} · Asesor: {f.asesor}
                    </span>
                  </td>
                  <td className="max-w-[20rem] px-3 py-3 text-xs text-gray-800">
                    <span className="line-clamp-3 whitespace-pre-wrap">{f.motivo}</span>
                    {f.respuesta && <span className="mt-1 block text-gray-500">Respuesta: {f.respuesta}</span>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${f.porAtender ? "border-amber-300 bg-amber-50 text-amber-900" : "border-gray-300 bg-white text-gray-700"}`}>
                      {f.estadoTexto}
                    </span>
                    {f.resueltoPor && <span className="mt-1 block text-[11px] text-gray-500">Atendió: {f.resueltoPor}</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {f.porAtender &&
                      (f.tipo === "baja" ? (
                        <ResolverBaja id={f.id} titulo={f.titulo} asesor={f.asesor} egresado={f.egresado ?? ""} motivo={f.motivo} />
                      ) : (
                        <ResolverCambioAsesor
                          id={f.id}
                          estado={f.estadoCambio!}
                          titulo={f.titulo}
                          solicitante={f.pide.replace(/ \((egresado|asesor)\)$/, "")}
                          rolSolicitante={f.rolSolicitante!}
                          asesorActual={f.asesor}
                          motivo={f.motivo}
                        />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} totalElementos={filtradas.length} tamanoPagina={TAMANO_PAGINA} construirHref={href} />
    </section>
  );
}
