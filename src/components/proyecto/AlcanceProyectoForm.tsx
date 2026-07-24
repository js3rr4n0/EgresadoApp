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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.refresh();
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

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {!disabled && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar Alcance"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
