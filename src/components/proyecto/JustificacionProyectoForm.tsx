"use client";

import { useState } from "react";
import { saveJustificacionProyecto } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface JustificacionProyectoFormProps {
  propuestaId: number;
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}

export default function JustificacionProyectoForm({
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
}: JustificacionProyectoFormProps) {
  const router = useRouter();
  const [justificacion, setJustificacion] = useState(initialData || "");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!justificacion.trim()) {
      setError("Debes ingresar la justificación del proyecto.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await saveJustificacionProyecto(propuestaId, justificacion);

    if (!res.success) {
      setError(res.error || "Error al guardar la justificación del proyecto.");
    } else {
      setSuccess("Justificación guardada correctamente.");
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Justificación del Proyecto</h2>
        <p className="text-sm text-muted mt-1">
          Argumenta la relevancia, conveniencia, beneficios e impacto esperado de llevar a cabo este proyecto (máximo 3 páginas).
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
            Justificación amplia <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={12}
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            disabled={disabled}
            placeholder="Fundamenta por qué es indispensable ejecutar esta solución, sus beneficios técnicos, sociales o económicos..."
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
              {pending ? "Guardando..." : "Guardar Justificación"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
