"use client";

import { useState } from "react";
import Link from "next/link";

export default function PropuestasTable({ data }: { data: any[] }) {
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  const filtered = data.filter(p => {
    if (filterEstado !== "todos" && p.estado !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.estudiante?.toLowerCase().includes(q) ||
        p.carnet?.toLowerCase().includes(q) ||
        p.carrera?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'enviada': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Pendiente Revisión</span>;
      case 'aprobada': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Aprobada</span>;
      case 'rechazada': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Rechazada</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">{estado}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 lg:p-6 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="relative w-full sm:w-96">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Buscar estudiante, carnet o carrera..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all"
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border focus:border-brand-red outline-none bg-white text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="enviada">Pendientes de Revisión</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-muted uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-bold">Estudiante</th>
              <th className="px-6 py-4 font-bold">Carrera</th>
              <th className="px-6 py-4 font-bold">Tipo</th>
              <th className="px-6 py-4 font-bold">Enviada En</th>
              <th className="px-6 py-4 font-bold">Estado</th>
              <th className="px-6 py-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length > 0 ? filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-card-dark">{p.estudiante}</div>
                  <div className="text-muted text-xs">{p.carnet}</div>
                </td>
                <td className="px-6 py-4 font-medium">{p.carrera}</td>
                <td className="px-6 py-4 uppercase font-bold text-xs">{p.tipo}</td>
                <td className="px-6 py-4">{p.enviadaEn ? new Date(p.enviadaEn).toLocaleDateString() : 'N/A'}</td>
                <td className="px-6 py-4">{getStatusBadge(p.estado)}</td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/admin/propuestas/${p.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border hover:border-brand-red text-card-dark hover:text-brand-red rounded-lg transition-colors font-bold text-xs"
                  >
                    Revisar
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted">
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
