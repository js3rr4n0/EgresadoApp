"use client";

import { useState } from "react";
import Link from "next/link";
import { asignarPropuestaACoordinador } from "@/app/actions/adminPropuestas";

interface CoordinadorStat {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol?: string;
  facultadNombre: string;
  proyectosAsignadosCount: number;
  proyectosEmpresaCount?: number;
  proyectosDetalle?: {
    id: number;
    numero: number;
    titulo: string;
    tipo: string;
    estado: string;
    empresaId?: number | null;
    empresaNombre?: string | null;
  }[];
}

export default function PropuestasTable({
  data,
  coordinadores = [],
}: {
  data: any[];
  coordinadores?: CoordinadorStat[];
}) {
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  // Modal State
  const [selectedPropuesta, setSelectedPropuesta] = useState<any | null>(null);
  const [coordSearch, setCoordSearch] = useState("");
  const [selectedCoord, setSelectedCoord] = useState<CoordinadorStat | null>(null);
  const [expandedCoordId, setExpandedCoordId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  const isDraftState = (estado: string) =>
    estado === "borrador" ||
    estado === "redactando" ||
    estado.startsWith("pend_") ||
    estado.includes("empresa") ||
    estado.includes("datos");

  const filtered = data.filter((p) => {
    if (filterEstado === "borrador" && !isDraftState(p.estado)) return false;
    if (filterEstado === "pendiente" && p.estado !== "enviada" && p.estado !== "coordinador_asignado") return false;
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

  const filteredCoordinadores = coordinadores.filter((c) => {
    if (!coordSearch.trim()) return true;
    const q = coordSearch.toLowerCase();
    return (
      c.nombreCompleto.toLowerCase().includes(q) ||
      c.correo.toLowerCase().includes(q) ||
      c.facultadNombre.toLowerCase().includes(q)
    );
  });

  const getEmpresaExp = (c: CoordinadorStat) => {
    if (selectedPropuesta?.empresaId && c.proyectosDetalle) {
      return c.proyectosDetalle.filter(
        (p) => p.empresaId === selectedPropuesta.empresaId
      ).length;
    }
    return c.proyectosEmpresaCount ?? 0;
  };

  const sortedCoordinadores = [...filteredCoordinadores].sort((a, b) => {
    const expA = getEmpresaExp(a);
    const expB = getEmpresaExp(b);
    if (expA > 0 && expB === 0) return -1;
    if (expB > 0 && expA === 0) return 1;
    return b.proyectosAsignadosCount - a.proyectosAsignadosCount;
  });

  const handleOpenAssignModal = (propuesta: any) => {
    setSelectedPropuesta(propuesta);
    setCoordSearch("");
    setSelectedCoord(null);
    setExpandedCoordId(null);
  };

  const handleConfirmAssign = async () => {
    if (!selectedPropuesta || !selectedCoord) return;

    setAssigning(true);
    const res = await asignarPropuestaACoordinador(selectedPropuesta.id, selectedCoord.id);
    setAssigning(false);

    if (res.success) {
      alert(res.message);
      setSelectedPropuesta(null);
      setSelectedCoord(null);
      window.location.reload();
    } else {
      alert(res.error || "Error al asignar la propuesta.");
    }
  };

  const getStatusBadge = (estado: string) => {
    if (isDraftState(estado)) {
      return <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-md text-xs font-black uppercase">En Borrador</span>;
    }
    switch (estado) {
      case "enviada":
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-black uppercase">Pendiente Revisión</span>;
      case "coordinador_asignado":
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-black uppercase">Coordinador Asignado</span>;
      case "aprobada":
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-black uppercase">Aprobada</span>;
      case "rechazada":
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md text-xs font-black uppercase">Rechazada</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold uppercase">{estado}</span>;
    }
  };

  const countTodos = data.length;
  const countPendientes = data.filter((p) => p.estado === "enviada" || p.estado === "coordinador_asignado").length;
  const countBorradores = data.filter((p) => isDraftState(p.estado)).length;
  const countAprobadas = data.filter((p) => p.estado === "aprobada").length;
  const countRechazadas = data.filter((p) => p.estado === "rechazada").length;

  const tabs = [
    { key: "todos", label: "Todos los estados", count: countTodos },
    { key: "pendiente", label: "Pendientes de Revisión", count: countPendientes },
    { key: "borrador", label: "En Borrador", count: countBorradores },
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
                      {!isDraftState(p.estado) && (
                        <button
                          onClick={() => handleOpenAssignModal(p)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl transition-colors font-bold text-xs shadow-2xs ${
                            p.coordinadorId || p.estado === "coordinador_asignado" || p.estado === "aprobada"
                              ? "bg-amber-600 hover:bg-amber-700"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          {p.coordinadorId || p.estado === "coordinador_asignado" || p.estado === "aprobada" ? "Reasignar" : "Asignar"}
                        </button>
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

      {/* Modal Asignar Coordinador */}
      {selectedPropuesta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Asignar Propuesta a Coordinador</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estudiante: <span className="font-bold text-slate-800">{selectedPropuesta.estudiante}</span> ({selectedPropuesta.carrera})
                </p>
              </div>
              <button
                onClick={() => setSelectedPropuesta(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Buscar Coordinador de Facultad:
              </label>
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={coordSearch}
                  onChange={(e) => {
                    setCoordSearch(e.target.value);
                    setSelectedCoord(null);
                  }}
                  placeholder="Escriba el nombre o correo del coordinador..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {sortedCoordinadores.length > 0 ? (
                sortedCoordinadores.map((c) => {
                  const isSelected = selectedCoord?.id === c.id;
                  const expCount = getEmpresaExp(c);
                  const isExpanded = expandedCoordId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCoord(c)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? "bg-indigo-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20"
                          : "bg-slate-50 hover:bg-slate-100/90 border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-slate-900 text-sm">{c.nombreCompleto}</p>
                            {c.rol === "admin" && (
                              <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.2 rounded font-extrabold">
                                🛡️ ADMIN
                              </span>
                            )}
                            {expCount > 0 && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                ⭐ Prioritario ({expCount} previas en esta empresa)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{c.correo}</p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                              🏛️ {c.facultadNombre}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCoordId(isExpanded ? null : c.id);
                          }}
                          className="text-xs font-extrabold px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                          title="Clic para ver detalle de proyectos y empresas asignadas"
                        >
                          <span>{c.proyectosAsignadosCount} asignados</span>
                          <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                        </button>
                      </div>

                      {/* Expandable breakdown drawer of assigned projects and companies */}
                      {isExpanded && (
                        <div
                          className="pt-3 border-t border-slate-200 space-y-2 text-xs text-slate-700 bg-white p-3 rounded-xl border shadow-inner"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="font-bold text-[11px] text-indigo-950 uppercase tracking-wider flex items-center justify-between">
                            <span>Proyectos y Empresas Actuales</span>
                            <span className="text-[10px] font-normal text-slate-500">
                              ({c.proyectosDetalle?.length || 0})
                            </span>
                          </p>
                          {c.proyectosDetalle && c.proyectosDetalle.length > 0 ? (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {c.proyectosDetalle.map((p) => (
                                <div
                                  key={p.id}
                                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span>Propuesta #{p.numero} ({p.tipo})</span>
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-extrabold">
                                      {p.estado}
                                    </span>
                                  </div>
                                  <p className="text-slate-700 font-medium line-clamp-1">{p.titulo}</p>
                                  {p.empresaNombre ? (
                                    <p className="text-amber-900 font-bold text-[10px] flex items-center gap-1 bg-amber-50 p-1 rounded border border-amber-200/60">
                                      <span>🏢 Empresa:</span> {p.empresaNombre}
                                    </p>
                                  ) : (
                                    <p className="text-slate-400 italic text-[10px]">Sin empresa registrada</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500 italic text-[11px] text-center p-2 bg-slate-50 rounded border border-dashed border-slate-200">
                              No tiene proyectos asignados actualmente.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No se encontraron coordinadores con ese término de búsqueda.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedPropuesta(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={!selectedCoord || assigning}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all shadow-md"
              >
                {assigning ? "Asignando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
