"use client";

import { useState } from "react";
import Link from "next/link";
import { asignarPropuestaACoordinador, eliminarPropuestaBorrador } from "@/app/actions/adminPropuestas";

interface CoordinadorStat {
  id: number;
  nombreCompleto: string;
  correo: string;
  facultadNombre: string;
  proyectosAsignadosCount: number;
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
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal State
  const [selectedPropuesta, setSelectedPropuesta] = useState<any | null>(null);
  const [coordSearch, setCoordSearch] = useState("");
  const [selectedCoord, setSelectedCoord] = useState<CoordinadorStat | null>(null);
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

  const handleOpenAssignModal = (propuesta: any) => {
    setSelectedPropuesta(propuesta);
    setCoordSearch("");
    setSelectedCoord(null);
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

  const handleDeleteBorrador = async (propuesta: any) => {
    const confirmMessage = `¿Estás seguro de eliminar definitivamente la propuesta #${propuesta.numero} en borrador del estudiante ${propuesta.estudiante}? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(propuesta.id);
    const res = await eliminarPropuestaBorrador(propuesta.id);
    setDeletingId(null);

    if (res.success) {
      alert(res.message);
      window.location.reload();
    } else {
      alert(res.error || "Error al eliminar la propuesta.");
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header Filters */}
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
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all text-sm"
          />
        </div>

        {/* Filter Buttons & Dropdown */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border focus:border-brand-red outline-none bg-white text-sm font-bold text-slate-800 shadow-2xs"
          >
            <option value="todos">📑 Todos los estados ({data.length})</option>
            <option value="pendiente">
              ⏳ Pendientes de Revisión ({data.filter((p) => p.estado === "enviada" || p.estado === "coordinador_asignado").length})
            </option>
            <option value="borrador">
              📝 En Borrador ({data.filter((p) => isDraftState(p.estado)).length})
            </option>
            <option value="aprobada">
              ✅ Aprobadas ({data.filter((p) => p.estado === "aprobada").length})
            </option>
            <option value="rechazada">
              ❌ Rechazadas ({data.filter((p) => p.estado === "rechazada").length})
            </option>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold text-xs shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Asignar
                        </button>
                      )}

                      {isDraftState(p.estado) && (
                        <button
                          onClick={() => handleDeleteBorrador(p)}
                          disabled={deletingId === p.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-bold text-xs shadow-xs disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingId === p.id ? "Eliminando..." : "Eliminar Definitivamente"}
                        </button>
                      )}

                      <Link
                        href={`/admin/propuestas/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border hover:border-brand-red text-card-dark hover:text-brand-red rounded-lg transition-colors font-bold text-xs"
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

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredCoordinadores.length > 0 ? (
                filteredCoordinadores.map((c) => {
                  const isSelected = selectedCoord?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCoord(c)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-500 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{c.nombreCompleto}</p>
                        <p className="text-xs text-slate-500">{c.correo}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                            🏛️ {c.facultadNombre}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-800">
                          {c.proyectosAsignadosCount} asignados
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No se encontraron coordinadores con ese término de búsqueda.</p>
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
