"use client";

import { useState } from "react";
import { reviewPropuesta } from "@/app/actions/adminPropuestas";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  propuestaId,
  estadoActual,
  asesores,
  coordinadores = [],
  initialAsesorId,
  initialCoordinadorId,
  initialObservaciones,
}: {
  propuestaId: number;
  estadoActual: string;
  asesores: any[];
  coordinadores?: any[];
  initialAsesorId: number | null;
  initialCoordinadorId?: number | null;
  initialObservaciones: string | null;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [asesorId, setAsesorId] = useState(initialAsesorId || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await reviewPropuesta(
      propuestaId,
      estado,
      asesorId ? Number(asesorId) : null,
      observaciones,
      coordinadorId ? Number(coordinadorId) : null
    );

    setLoading(false);

    if (res.success) {
      setMessage("¡Propuesta actualizada correctamente!");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } else {
      setMessage("Error: " + res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8 space-y-6">
      <h2 className="text-xl font-extrabold border-b border-slate-200 pb-4 text-slate-900 uppercase tracking-wider flex items-center justify-between">
        <span>Resolución y Asignación</span>
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Estado de la Propuesta</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-900 font-semibold text-sm"
          >
            <option value="enviada">Pendiente de Revisión</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>

        {/* Sección de Asignación de Coordinador con Búsqueda y Autocompletado */}
        <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
          <label className="block text-xs font-bold text-indigo-950 uppercase">
            Asignar Coordinador de Facultad
          </label>

          <input
            type="text"
            placeholder="Buscar coordinador por nombre..."
            value={coordSearch}
            onChange={(e) => setCoordSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-xs border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <select
            value={coordinadorId}
            onChange={(e) => setCoordinadorId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-medium text-sm"
          >
            <option value="">-- Sin Coordinador Asignado --</option>
            {filteredCoordinadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreCompleto} ({c.facultadNombre || "General"})
              </option>
            ))}
          </select>

          {/* Coordinador Info Box: Facultad & Proyectos Asignados */}
          {selectedCoordObj && (
            <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-1 text-xs text-slate-700">
              <p className="font-bold text-indigo-900">{selectedCoordObj.nombreCompleto}</p>
              <p className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">Facultad:</span>
                <span className="font-bold text-slate-800">{selectedCoordObj.facultadNombre}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">Proyectos Asignados:</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {selectedCoordObj.proyectosAsignadosCount ?? 0} activos
                </span>
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Asignar Asesor Directo (Opcional)</label>
          <select
            value={asesorId}
            onChange={(e) => setAsesorId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-900 text-sm"
          >
            <option value="">-- Sin Asesor Asignado --</option>
            {asesores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombreCompleto}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Observaciones / Motivo (Si es rechazada)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-900 text-sm resize-none"
            placeholder="Escribe aquí las observaciones o el motivo del rechazo..."
          />
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold ${message.includes("Error") ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition-colors"
        >
          {loading ? "Guardando..." : "Guardar Resolución y Asignación"}
        </button>
      </div>
    </form>
  );
}
