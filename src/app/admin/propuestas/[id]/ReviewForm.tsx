"use client";

import { useState } from "react";
import { reviewPropuesta } from "@/app/actions/adminPropuestas";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  propuestaId,
  estadoActual,
  asesores,
  initialAsesorId,
  initialObservaciones
}: {
  propuestaId: number;
  estadoActual: string;
  asesores: any[];
  initialAsesorId: number | null;
  initialObservaciones: string | null;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoActual);
  const [asesorId, setAsesorId] = useState(initialAsesorId || "");
  const [observaciones, setObservaciones] = useState(initialObservaciones || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await reviewPropuesta(
      propuestaId,
      estado,
      asesorId ? Number(asesorId) : null,
      observaciones
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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-border p-6 sticky top-8">
      <h2 className="text-xl font-bold border-b border-border pb-4 mb-6 text-card-dark uppercase tracking-widest">Resolución</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-muted mb-2">Estado de la Propuesta</label>
          <select 
            value={estado} 
            onChange={e => setEstado(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border focus:border-brand-red outline-none bg-slate-50 text-card-dark"
          >
            <option value="enviada">Pendiente de Revisión</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-muted mb-2">Asignar Asesor (Opcional)</label>
          <select 
            value={asesorId} 
            onChange={e => setAsesorId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border focus:border-brand-red outline-none bg-slate-50 text-card-dark"
          >
            <option value="">-- Sin Asesor Asignado --</option>
            {asesores.map(a => (
              <option key={a.id} value={a.id}>{a.nombreCompleto}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-muted mb-2">Comentarios / Motivo (Si es rechazada)</label>
          <textarea 
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-border focus:border-brand-red outline-none bg-slate-50 text-card-dark resize-none"
            placeholder="Escribe aquí las observaciones o el motivo del rechazo..."
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm font-bold ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {message}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-red text-white font-bold rounded-lg hover:bg-brand-red-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Resolución"}
        </button>
      </div>
    </form>
  );
}
