"use client";

import { useState } from "react";
import { saveJustificacion } from "@/app/actions/justificacion";
import { useRouter, useSearchParams } from "next/navigation";

interface JustificacionFormProps {
  propuestaId: number;
  initialData: string | null;
  isLocked: boolean;
}

export default function JustificacionForm({ propuestaId, initialData, isLocked }: JustificacionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [justificacion, setJustificacion] = useState(initialData || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificacion.trim()) {
      setError("Debes ingresar una justificación.");
      return;
    }
    
    setPending(true);
    setError(null);
    
    const res = await saveJustificacion(propuestaId, justificacion);
    if (res.success) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", "7");
      router.push(`?${params.toString()}`);
    } else {
      setError(res.error || "Error al guardar");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-card-dark mb-2">Justificación y Objetivos</label>
        <p className="text-xs text-muted mb-4">
          Redacta los motivos, el problema que se resolverá y los objetivos esperados de este proyecto. Se requiere suficiente información (aproximadamente 2 páginas).
        </p>
        <textarea
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          disabled={isLocked}
          required
          rows={25}
          placeholder="Escribe aquí tu justificación..."
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-red/20 outline-none resize-y"
        />
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border mt-8">
        <button type="button" onClick={() => router.push('?step=5')} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
          ← Volver a Actividades
        </button>
        <button 
          type="submit" 
          disabled={pending || isLocked}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Siguiente Fase"}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </form>
  );
}
