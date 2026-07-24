"use client";

import { useState } from "react";
import { saveActoresIntervinientes } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface ActoresIntervinientesFormProps {
  propuestaId: number;
  initialData?: {
    actorPatrocinador?: string | null;
    actorBeneficiario?: string | null;
    actorEjecutor?: string | null;
    actorFinancista?: string | null;
  } | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}

export default function ActoresIntervinientesForm({
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
}: ActoresIntervinientesFormProps) {
  const router = useRouter();
  const [patrocinador, setPatrocinador] = useState(initialData?.actorPatrocinador || "");
  const [beneficiario, setBeneficiario] = useState(initialData?.actorBeneficiario || "");
  const [ejecutor, setEjecutor] = useState(initialData?.actorEjecutor || "");
  const [financista, setFinancista] = useState(initialData?.actorFinancista || "");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!patrocinador.trim() || !beneficiario.trim() || !ejecutor.trim() || !financista.trim()) {
      setError("Debes completar la información de los 4 actores obligatorios.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await saveActoresIntervinientes(propuestaId, {
      patrocinador,
      beneficiario,
      ejecutor,
      financista,
    });

    if (!res.success) {
      setError(res.error || "Error al guardar los actores intervinientes.");
    } else {
      setSuccess("Actores intervinientes guardados correctamente.");
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Actores Intervinientes del Proyecto</h2>
        <p className="text-sm text-muted mt-1">
          Establece y describe a los actores principales del proyecto, así como sus aportes y rol en el mismo.
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
            1. Patrocinador <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted mb-2">Entidad, empresa o persona que impulsa o patrocina la propuesta.</p>
          <textarea
            rows={4}
            value={patrocinador}
            onChange={(e) => setPatrocinador(e.target.value)}
            disabled={disabled}
            placeholder="Describe quién es el patrocinador, sus aportes y su rol..."
            className="w-full p-3.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-card-dark mb-2">
            2. Beneficiario <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted mb-2">Población, usuarios o institución beneficiada con el proyecto.</p>
          <textarea
            rows={4}
            value={beneficiario}
            onChange={(e) => setBeneficiario(e.target.value)}
            disabled={disabled}
            placeholder="Describe a los beneficiarios directos e indirectos y el impacto esperado..."
            className="w-full p-3.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-card-dark mb-2">
            3. Ejecutor <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted mb-2">Equipo de trabajo / egresados encargados del desarrollo técnico y operativo.</p>
          <textarea
            rows={4}
            value={ejecutor}
            onChange={(e) => setEjecutor(e.target.value)}
            disabled={disabled}
            placeholder="Describe al equipo ejecutor, roles internos y responsabilidades..."
            className="w-full p-3.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-card-dark mb-2">
            4. Financista <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted mb-2">Entidad o fuente que proveerá los recursos económicos o materiales.</p>
          <textarea
            rows={4}
            value={financista}
            onChange={(e) => setFinancista(e.target.value)}
            disabled={disabled}
            placeholder="Describe de dónde provienen los fondos o recursos para la ejecución..."
            className="w-full p-3.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
            required
          />
        </div>

        {!disabled && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar Actores"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
