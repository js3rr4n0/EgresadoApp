"use client";

import { useState } from "react";

interface HistorialItem {
  id: number;
  usuarioNombre: string;
  de: string | null;
  a: string;
  fechaStr: string;
}

export default function HistorialProyectoAccordion({
  historial = [],
}: {
  historial: HistorialItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const formatEstadoLabel = (estado: string | null) => {
    if (!estado) return "Inicio";
    switch (estado) {
      case "redactando":
      case "borrador":
        return "Borrador";
      case "enviada":
        return "Pendiente Revisión";
      case "coordinador_asignado":
        return "Coordinador Asignado";
      case "aprobada":
        return "Aprobada";
      case "rechazada":
        return "Rechazada";
      case "anulada":
        return "Eliminada / Anulada";
      default:
        return estado;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
      {/* Collapsible Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between font-extrabold text-sm text-slate-800 tracking-wider uppercase border-b border-slate-200"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Histórico de Acciones y Cambios del Proyecto</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold font-mono">
            {historial.length} registros
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 font-bold text-xs">
          <span>{isOpen ? "Ocultar" : "Mostrar"}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-6 space-y-3 bg-white animate-in slide-in-from-top-2 duration-150">
          {historial.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-indigo-100 pl-4">
              {historial.map((h, index) => (
                <div key={h.id || index} className="relative flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50 mt-1 shrink-0 -ml-4 z-10" />
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{h.usuarioNombre}</span>
                      <span className="text-[11px] font-mono text-slate-400">{h.fechaStr}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-200 text-slate-700">
                        {formatEstadoLabel(h.de)}
                      </span>
                      <span className="text-slate-400 font-bold">➔</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-indigo-600 text-white">
                        {formatEstadoLabel(h.a)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs italic">
              No hay eventos o cambios de estado registrados en el histórico aún.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
