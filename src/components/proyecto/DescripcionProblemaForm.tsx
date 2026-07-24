"use client";

import { useState } from "react";
import { saveDescripcionProblema } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface DescripcionProblemaFormProps {
  propuestaId: number;
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}

export default function DescripcionProblemaForm({
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
}: DescripcionProblemaFormProps) {
  const router = useRouter();
  const [descripcion, setDescripcion] = useState(initialData || "");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!descripcion.trim()) {
      setError("Debes ingresar la descripción del problema o la oportunidad.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await saveDescripcionProblema(propuestaId, descripcion);

    if (!res.success) {
      setError(res.error || "Error al guardar la descripción del problema.");
    } else {
      setSuccess("Descripción del problema guardada correctamente.");
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Descripción del Problema o la Oportunidad</h2>
        <p className="text-sm text-muted mt-1">
          Describe la problemática o la oportunidad identificada que motiva el desarrollo de este proyecto (máximo 3 páginas).
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
            Redacción detallada <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={12}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={disabled}
            placeholder="Escribe detalladamente la situación actual, los antecedentes, causas y consecuencias del problema a resolver..."
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
              {pending ? "Guardando..." : "Guardar Descripción"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
