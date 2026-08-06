"use client";

import { useState } from "react";
import { asignarPropuestaACoordinador, eliminarPropuestaBorrador } from "@/app/actions/adminPropuestas";
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
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeletePropuesta = async () => {
    const confirmMsg = "¿Estás seguro de eliminar definitivamente esta propuesta? Se eliminarán todos sus datos y serás redirigido al listado de propuestas.";
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    const res = await eliminarPropuestaBorrador(propuestaId);
    setDeleting(false);

    if (res.success) {
      alert(res.message);
      router.push("/admin/propuestas");
      router.refresh();
    } else {
      alert(res.error || "Error al eliminar propuesta.");
    }
  };

  const getBadgeStyle = () => {
    switch (estadoActual) {
      case "borrador":
      case "redactando":
        return "bg-slate-100 text-slate-800 border-slate-300";
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
      case "borrador":
      case "redactando":
        return "En Borrador (No Enviada)";
      case "coordinador_asignado":
        return "Coordinador Asignado";
      case "aprobada":
        return "Aceptada por Coordinador";
      case "rechazada":
        return "Rechazada";
      default:
        return "Pendiente de Revisión";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8 space-y-6">
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-wider">
          Gestión de la Propuesta
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">Estado actual:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getBadgeStyle()}`}>
            {getBadgeText()}
          </span>
        </div>
      </div>

      <form onSubmit={handleAssignCoordinatorSubmit} className="space-y-4">
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
            {filteredCoordinadores.map((c) => {
              const hasCompanyExp = (c.proyectosEmpresaCount ?? 0) > 0;
              return (
                <option key={c.id} value={c.id}>
                  {hasCompanyExp ? "⭐ [Prioritario] " : ""}
                  {c.nombreCompleto} ({c.facultadNombre || "General"})
                  {hasCompanyExp ? ` — Trabaja con esta empresa (${c.proyectosEmpresaCount} previas)` : ""}
                </option>
              );
            })}
          </select>

          {/* Coordinador Info Box: Facultad & Proyectos Asignados */}
          {selectedCoordObj && (
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-1.5 text-xs text-slate-700 shadow-2xs">
              <p className="font-extrabold text-indigo-950 text-sm flex items-center justify-between">
                <span>{selectedCoordObj.nombreCompleto}</span>
                {selectedCoordObj.proyectosEmpresaCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                    ⭐ Trabaja con esta empresa
                  </span>
                )}
              </p>
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
              {selectedCoordObj.proyectosEmpresaCount > 0 && (
                <p className="flex items-center justify-between pt-1 border-t border-indigo-100 text-amber-800 font-bold">
                  <span>Experiencia en esta empresa:</span>
                  <span>{selectedCoordObj.proyectosEmpresaCount} propuesta(s)</span>
                </p>
              )}
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
      </form>

      {/* Botón de Eliminar Definitivamente (Acción dentro del panel de revisión) */}
      <div className="pt-4 border-t border-slate-200 space-y-2">
        <label className="block text-xs font-bold text-slate-500 uppercase">Acción Administrativa Especial</label>
        <button
          type="button"
          onClick={handleDeletePropuesta}
          disabled={deleting}
          className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{deleting ? "Eliminando propuesta..." : "Eliminar Propuesta Definitivamente"}</span>
        </button>
      </div>
    </div>
  );
}
