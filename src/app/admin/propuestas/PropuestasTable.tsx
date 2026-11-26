"use client";

import { useState } from "react";
import Link from "next/link";

export default function PropuestasTable({
  data,
}: {
  data: any[];
}) {
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  const isDraftState = (estado: string) =>
    estado === "borrador" ||
    estado === "redactando" ||
    estado.startsWith("pend_") ||
    estado.includes("empresa") ||
    estado.includes("datos");

  const filtered = data.filter((p) => {
    if (filterEstado === "borrador" && !isDraftState(p.estado)) return false;
    if (filterEstado === "pendiente" && p.estado !== "enviada" && p.estado !== "coordinador_asignado") return false;
    if (filterEstado === "en_ejecucion" && p.estado !== "en_ejecucion") return false;
    if (filterEstado === "aprobada" && p.estado !== "aprobada") return false;
    if (filterEstado === "rechazada" && p.estado !== "rechazada") return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        p.estudiante?.toLowerCase().includes(q) ||
        p.carnet?.toLowerCase().includes(q) ||
        p.carrera?.toLowerCase().includes(q) ||
        p.titulo?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (estado: string) => {
    if (estado === "en_ejecucion") {
      return <span className="px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-md text-xs font-black uppercase tracking-wide">En Ejecución</span>;
    }
    if (isDraftState(estado)) {
      return <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-md text-xs font-black uppercase">En Borrador</span>;
    }
    switch (estado) {
      case "enviada":
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-200 rounded-md text-xs font-black uppercase">Pendiente Revisión</span>;
      case "coordinador_asignado":
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-md text-xs font-black uppercase">Coordinador Asignado</span>;
      case "aprobada":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-black uppercase">Aprobada por Asesor</span>;
      case "primer_contacto_completado":
        return <span className="px-2.5 py-1 bg-teal-100 text-teal-900 border border-teal-200 rounded-md text-xs font-black uppercase">Primer Contacto Completado</span>;
      case "rechazada":
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-xs font-black uppercase">Rechazada</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-bold uppercase">{estado ? estado.replace(/_/g, " ") : "Desconocido"}</span>;
    }
  };

  const countTodos = data.length;
  const countPendientes = data.filter((p) => p.estado === "enviada" || p.estado === "coordinador_asignado").length;
  const countBorradores = data.filter((p) => isDraftState(p.estado)).length;
  const countEnEjecucion = data.filter((p) => p.estado === "en_ejecucion").length;
  const countAprobadas = data.filter((p) => p.estado === "aprobada").length;
  const countRechazadas = data.filter((p) => p.estado === "rechazada").length;

  const tabs = [
    { key: "todos", label: "Todos los estados", count: countTodos },
    { key: "pendiente", label: "Pendientes de Revisión", count: countPendientes },
    { key: "borrador", label: "En Borrador", count: countBorradores },
    { key: "en_ejecucion", label: "En Ejecución", count: countEnEjecucion },
    { key: "aprobada", label: "Aprobadas", count: countAprobadas },
    { key: "rechazada", label: "Rechazadas", count: countRechazadas },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden space-y-0">
      {/* Horizontal Tabs Bar across the top */}
      <div className="p-3 bg-slate-100/80 border-b border-border overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = filterEstado === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterEstado(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    isActive ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Search Bar */}
      <div className="p-4 lg:p-6 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="relative w-full sm:w-96">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar estudiante, título, carnet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all text-sm bg-white"
          />
        </div>

        {/* Mobile Fallback Select Box */}
        <div className="w-full sm:w-auto sm:hidden">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border outline-none bg-white text-sm font-bold text-slate-800"
          >
            {tabs.map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-bold">Estudiante</th>
              <th className="px-6 py-4 font-bold">Título de la Propuesta</th>
              <th className="px-6 py-4 font-bold">Carrera</th>
              <th className="px-6 py-4 font-bold">Tipo</th>
              <th className="px-6 py-4 font-bold">Enviada En</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-card-dark">{p.estudiante}</div>
                    <div className="text-muted text-xs">{p.carnet}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 line-clamp-2 max-w-xs" title={p.titulo || `Propuesta #${p.numero}`}>
                      {p.titulo || `Propuesta #${p.numero}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{p.carrera}</td>
                  <td className="px-6 py-4 uppercase font-bold text-xs">{p.tipo}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {p.enviadaEn ? new Date(p.enviadaEn).toLocaleDateString() : "Borrador"}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(p.estado)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* La asignación se hace en la página de la propuesta, que aplica la configuración de la cohorte (C2) */}
                      {(p.estado === "enviada" || p.estado === "coordinador_asignado") && (
                        <Link
                          href={`/admin/propuestas/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl transition-colors font-bold text-xs shadow-2xs bg-brand-red hover:bg-brand-red-hover"
                        >
                          {p.estado === "coordinador_asignado" ? "Reasignar" : "Asignar"}
                        </Link>
                      )}

                      <Link
                        href={`/admin/propuestas/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:border-brand-red text-slate-800 hover:text-brand-red rounded-xl transition-colors font-bold text-xs shadow-2xs"
                      >
                        Revisar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted">
                  No se encontraron propuestas con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
