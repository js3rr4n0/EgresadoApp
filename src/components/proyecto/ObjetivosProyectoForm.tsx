"use client";

import { useState } from "react";
import { saveObjetivosProyecto } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface ObjectiveItem {
  titulo: string;
  descripcion: string;
}

interface ObjetivosProyectoFormProps {
  propuestaId: number;
  initialObjetivoGeneral?: string | null;
  initialObjetivosEspecificos?: ObjectiveItem[] | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}

export default function ObjetivosProyectoForm({
  propuestaId,
  initialObjetivoGeneral,
  initialObjetivosEspecificos,
  isLocked,
  isReadOnly = false,
}: ObjetivosProyectoFormProps) {
  const router = useRouter();
  const [objetivoGeneral, setObjetivoGeneral] = useState(initialObjetivoGeneral || "");

  // Initialize with at least 4 rows
  const [objetivosEspecificos, setObjetivosEspecificos] = useState<ObjectiveItem[]>(() => {
    if (initialObjetivosEspecificos && initialObjetivosEspecificos.length >= 4) {
      return initialObjetivosEspecificos;
    }
    const base = initialObjetivosEspecificos ? [...initialObjetivosEspecificos] : [];
    while (base.length < 4) {
      base.push({ titulo: "", descripcion: "" });
    }
    return base.slice(0, 6);
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleRowChange = (index: number, field: "titulo" | "descripcion", value: string) => {
    const next = [...objetivosEspecificos];
    next[index] = { ...next[index], [field]: value };
    setObjetivosEspecificos(next);
  };

  const handleAddRow = () => {
    if (objetivosEspecificos.length >= 6) return;
    setObjetivosEspecificos([...objetivosEspecificos, { titulo: "", descripcion: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    if (objetivosEspecificos.length <= 4) {
      setError("Debes mantener como mínimo 4 objetivos específicos.");
      return;
    }
    setError(null);
    setObjetivosEspecificos(objetivosEspecificos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!objetivoGeneral.trim()) {
      setError("Debes ingresar el objetivo general del proyecto.");
      return;
    }

    const invalid = objetivosEspecificos.some(
      (item) => !item.titulo.trim() || !item.descripcion.trim()
    );

    if (invalid) {
      setError("Todos los objetivos específicos deben tener un título y una descripción.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await saveObjetivosProyecto(propuestaId, {
      objetivoGeneral,
      objetivosEspecificos,
    });

    if (!res.success) {
      setError(res.error || "Error al guardar los objetivos.");
    } else {
      setSuccess("Objetivos del proyecto guardados correctamente.");
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Objetivos del Proyecto</h2>
        <p className="text-sm text-muted mt-1">
          Establece 1 objetivo general y de 4 a 6 objetivos específicos en la tabla a continuación.
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Objetivo General */}
        <div>
          <label className="block text-sm font-bold text-card-dark mb-2">
            Objetivo General <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={objetivoGeneral}
            onChange={(e) => setObjetivoGeneral(e.target.value)}
            disabled={disabled}
            placeholder="Formula la meta principal que pretende alcanzar la propuesta de proyecto..."
            className="w-full p-3.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm leading-relaxed disabled:opacity-75"
            required
          />
        </div>

        {/* Objetivos Específicos */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-card-dark text-base">
                Objetivos Específicos (Mínimo 4 - Máximo 6)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Ingresa el título corto y la descripción detallada de cada objetivo.
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddRow}
                disabled={objetivosEspecificos.length >= 6}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                + Añadir Fila ({objetivosEspecificos.length}/6)
              </button>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted bg-slate-50 uppercase font-bold border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3 w-1/3">Título del Objetivo</th>
                  <th className="px-4 py-3">Descripción</th>
                  {!disabled && <th className="px-4 py-3 w-16 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {objetivosEspecificos.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-center font-bold text-muted">{index + 1}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.titulo}
                        onChange={(e) => handleRowChange(index, "titulo", e.target.value)}
                        disabled={disabled}
                        placeholder={`Ej: Objetivo Específico ${index + 1}`}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red disabled:opacity-75"
                        required
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        rows={2}
                        value={item.descripcion}
                        onChange={(e) => handleRowChange(index, "descripcion", e.target.value)}
                        disabled={disabled}
                        placeholder="Descripción detallada de la meta alcanzable..."
                        className="w-full px-3 py-2 rounded-lg border border-border bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red disabled:opacity-75"
                        required
                      />
                    </td>
                    {!disabled && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          disabled={objetivosEspecificos.length <= 4}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Eliminar fila"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!disabled && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar Objetivos"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
