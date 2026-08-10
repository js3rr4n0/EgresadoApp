"use client";

import { useState } from "react";
import { saveAlcanceProyecto } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface AlcanceProyectoFormProps {
  propuestaId: number;
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}

export default function AlcanceProyectoForm({
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
}: AlcanceProyectoFormProps) {
  const router = useRouter();
  const [alcance, setAlcance] = useState(initialData || "");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleSave = async (shouldAdvance: boolean) => {
    if (disabled) return;

    if (!alcance.trim()) {
      setError("Debes ingresar el alcance del proyecto.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await saveAlcanceProyecto(propuestaId, alcance);

    if (!res.success) {
      setError(res.error || "Error al guardar el alcance del proyecto.");
    } else {
      setSuccess("Alcance del proyecto guardado correctamente.");
      if (shouldAdvance) {
        router.push(`?id=${propuestaId}&step=7`);
        router.refresh();
      }
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Alcance del Proyecto</h2>
        <p className="text-sm text-muted mt-1">
          Establece los límites, entregables y cobertura del proyecto (máximo 1 página).
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">
          {success}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-card-dark mb-2">
            Alcance y Límites del Proyecto <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={8}
            value={alcance}
            onChange={(e) => setAlcance(e.target.value)}
            disabled={disabled}
            placeholder="Delimita de forma clara qué abarcará el proyecto y qué queda fuera del alcance..."
            className="w-full p-4 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm leading-relaxed disabled:opacity-75"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
          <button
            type="button"
            onClick={() => router.push(`?id=${propuestaId}&step=5`)}
            className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors cursor-pointer"
          >
            ← Volver a Justificación
          </button>

          {!disabled && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSave(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Guardar Borrador
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSave(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {pending ? "Guardando..." : "Guardar y Continuar"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
