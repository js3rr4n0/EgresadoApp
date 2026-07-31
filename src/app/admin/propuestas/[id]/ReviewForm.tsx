"use client";

import { useState } from "react";
import { asignarPropuestaACoordinador, reviewPropuesta } from "@/app/actions/adminPropuestas";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  propuestaId,
  estadoActual,
  coordinadores = [],
  initialCoordinadorId,
  initialObservaciones,
}: {
  propuestaId: number;
  estadoActual: string;
  coordinadores?: any[];
  initialCoordinadorId?: number | null;
  initialObservaciones: string | null;
}) {
  const router = useRouter();
  const [coordinadorId, setCoordinadorId] = useState<number | string>(initialCoordinadorId || "");
  const [observaciones, setObservaciones] = useState(initialObservaciones || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [coordSearch, setCoordSearch] = useState("");

  const selectedCoordObj = coordinadores.find((c) => c.id === Number(coordinadorId));

  const filteredCoordinadores = coordinadores.filter((c) => {
    if (!coordSearch.trim()) return true;
    const q = coordSearch.toLowerCase();
    return (
      c.nombreCompleto?.toLowerCase().includes(q) ||
      c.correo?.toLowerCase().includes(q) ||
      c.facultadNombre?.toLowerCase().includes(q)
    );
  });

  const handleAssignCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinadorId) {
      alert("Por favor seleccione un coordinador de facultad.");
      return;
    }
    setLoading(true);
    setMessage("");

    const res = await asignarPropuestaACoordinador(propuestaId, Number(coordinadorId));
    setLoading(false);

    if (res.success) {
      setMessage("¡Propuesta asignada al coordinador exitosamente!");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } else {
      setMessage("Error: " + res.error);
    }
  };

  const getBadgeStyle = () => {
    switch (estadoActual) {
      case "coordinador_asignado":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "aprobada":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "rechazada":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-amber-100 text-amber-800 border-amber-300";
    }
  };

  const getBadgeText = () => {
    switch (estadoActual) {
      case "coordinador_asignado":
        return "Coordinador Asignado (Esperando Respuesta)";
      case "aprobada":
        return "Aceptada por Coordinador";
      case "rechazada":
        return "Rechazada";
      default:
        return "Pendiente de Revisión";
    }
  };

  return (
    <form onSubmit={handleAssignCoordinatorSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8 space-y-6">
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">
          Asignación a Coordinador
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">Estado actual:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getBadgeStyle()}`}>
            {getBadgeText()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Sección de Asignación de Coordinador con Búsqueda y Autocompletado */}
        <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          <label className="block text-xs font-bold text-indigo-950 uppercase">
            Seleccionar Coordinador de Facultad
          </label>

          <input
            type="text"
            placeholder="Buscar coordinador por nombre o facultad..."
            value={coordSearch}
            onChange={(e) => setCoordSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-xs border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <select
            value={coordinadorId}
            onChange={(e) => setCoordinadorId(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-medium text-sm"
          >
            <option value="">-- Elige un Coordinador --</option>
            {filteredCoordinadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreCompleto} ({c.facultadNombre || "General"})
              </option>
            ))}
          </select>

          {/* Coordinador Info Box: Facultad & Proyectos Asignados */}
          {selectedCoordObj && (
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-1.5 text-xs text-slate-700 shadow-2xs">
              <p className="font-extrabold text-indigo-950 text-sm">{selectedCoordObj.nombreCompleto}</p>
              <p className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Facultad:</span>
                <span className="font-bold text-slate-800">{selectedCoordObj.facultadNombre}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Proyectos Activos:</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {selectedCoordObj.proyectosAsignadosCount ?? 0} asignados
                </span>
              </p>
            </div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold ${message.startsWith("Error") ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !coordinadorId}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Procesando...</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>{estadoActual === "coordinador_asignado" ? "Reasignar Coordinador" : "Asignar a Coordinador"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
