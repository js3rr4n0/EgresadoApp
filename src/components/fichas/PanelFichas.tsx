"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EstadoVersion, Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD, EstadoVersionBadge } from "./comunes";
import NuevaFichaModal from "./NuevaFichaModal";
import CatalogoElementos from "./CatalogoElementos";

export interface FilaFicha {
  id: number;
  codigo: string | null;
  nombre: string;
  modalidad: Modalidad;
  esBase: boolean;
  alcance: string;
  facultadId: number | null;
  carreraId: number | null;
  vigente: number | null;
  borrador: number | null;
  versiones: { id: number; numero: number; estado: EstadoVersion }[];
  actualizada: string;
}

type Filtro = "todas" | "borradores" | "habilitadas" | "deshabilitadas";

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: "todas", texto: "Todas" },
  { id: "borradores", texto: "Borradores" },
  { id: "habilitadas", texto: "Habilitadas" },
  { id: "deshabilitadas", texto: "Deshabilitadas" },
];

function cumple(f: FilaFicha, filtro: Filtro) {
  if (filtro === "borradores") return f.borrador !== null;
  if (filtro === "habilitadas") return f.vigente !== null;
  if (filtro === "deshabilitadas") return f.versiones.length > 0 && f.versiones.every((v) => v.estado === "retirada");
  return true;
}

export default function PanelFichas({
  filas,
  facultades,
  carreras,
}: {
  filas: FilaFicha[];
  facultades: { id: number; nombre: string; codigo: string | null }[];
  carreras: { id: number; nombre: string; codigo: string | null; facultadId: number }[];
}) {
  const [vista, setVista] = useState<"fichas" | "catalogo">("fichas");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [modalidad, setModalidad] = useState<Modalidad | "">("");
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        cumple(f, filtro) &&
        (!modalidad || f.modalidad === modalidad) &&
        (!q || `${f.codigo ?? ""} ${f.nombre} ${f.alcance}`.toLowerCase().includes(q))
    );
  }, [filas, filtro, modalidad, busqueda]);

  const origenes = filas.flatMap((f) =>
    f.versiones
      .filter((v) => v.estado !== "borrador")
      .map((v) => ({ versionId: v.id, modalidad: f.modalidad, etiqueta: `${f.codigo ?? f.nombre} — versión ${v.numero}`, esBase: f.esBase }))
  );
  const existentes = filas.filter((f) => !f.esBase).map((f) => ({ id: f.id, codigo: f.codigo, modalidad: f.modalidad, facultadId: f.facultadId, carreraId: f.carreraId }));

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fichas de trabajos de graduación</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Cada ficha define cómo se realiza un tipo de trabajo: su propuesta, su ejecución, su cierre y quién participa en cada paso.
          </p>
        </div>
        <NuevaFichaModal origenes={origenes} existentes={existentes} facultades={facultades} carreras={carreras} />
      </div>

      <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
        {(["fichas", "catalogo"] as const).map((v) => (
          <button key={v} role="tab" type="button" aria-selected={vista === v} onClick={() => setVista(v)}
            className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${vista === v ? "border-brand-red text-brand-red" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {v === "fichas" ? `Fichas (${filas.length})` : "Catálogo de elementos"}
          </button>
        ))}
      </div>

      {vista === "catalogo" ? (
        <CatalogoElementos />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {FILTROS.map((f) => {
                const n = filas.filter((x) => cumple(x, f.id)).length;
                return (
                  <button key={f.id} type="button" onClick={() => setFiltro(f.id)} aria-pressed={filtro === f.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${filtro === f.id ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                    {f.texto} <span className={filtro === f.id ? "text-gray-300" : "text-gray-400"}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="filtro-modalidad">Modalidad</label>
              <select id="filtro-modalidad" value={modalidad} onChange={(e) => setModalidad(e.target.value as Modalidad | "")}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="">Todas las modalidades</option>
                {(Object.keys(ETIQUETA_MODALIDAD) as Modalidad[]).map((m) => <option key={m} value={m}>{ETIQUETA_MODALIDAD[m]}</option>)}
              </select>
              <label className="sr-only" htmlFor="filtro-buscar">Buscar</label>
              <input id="filtro-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código o carrera"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full sm:w-56" />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-2.5 text-sm">
            <strong>Vista previa del constructor.</strong> Los egresados todavía usan el asistente actual; las fichas se conectarán a su proceso en la entrega 4.
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[56rem]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Código</th>
                  <th className="text-left font-bold px-4 py-3">Ficha</th>
                  <th className="text-left font-bold px-4 py-3">Estado</th>
                  <th className="text-left font-bold px-4 py-3" title="Se asignan en la entrega 3">Cohortes</th>
                  <th className="text-left font-bold px-4 py-3" title="Se cuentan en la entrega 4">Procesos</th>
                  <th className="text-left font-bold px-4 py-3">Actualizada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/60 align-top">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 rounded px-2 py-1 whitespace-nowrap">{f.codigo ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-800">{ETIQUETA_MODALIDAD[f.modalidad]}</div>
                      <div className="text-xs text-gray-500">{f.esBase ? "Ficha base · funcionamiento actual · solo lectura" : f.alcance}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {f.vigente !== null && <EstadoVersionBadge estado="habilitada" texto={`v${f.vigente} habilitada`} />}
                        {f.borrador !== null && <EstadoVersionBadge estado="borrador" texto={`v${f.borrador} borrador`} />}
                        {f.vigente === null && f.borrador === null && <EstadoVersionBadge estado="retirada" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{f.esBase ? "Todas (fase 1)" : "Sin asignar"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">—</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(f.actualizada).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/bloques-propuestas/${f.id}`} className="inline-flex items-center gap-1 text-brand-red font-bold hover:underline whitespace-nowrap">
                        {f.borrador !== null && !f.esBase ? "Editar" : "Abrir"} →
                      </Link>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">No hay fichas con este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Las columnas Cohortes y Procesos se llenarán cuando cada cohorte se ligue a una versión (entrega 3) y las propuestas usen la ficha (entrega 4).
          </p>
        </>
      )}
    </div>
  );
}
