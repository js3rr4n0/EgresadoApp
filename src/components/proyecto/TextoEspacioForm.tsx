"use client";

// Paso de texto definido en la ficha que no existía en la fase 1 (entrega P2). Título, ayuda y límites de palabras
// salen del espacio de la ficha; la respuesta se guarda en respuestas_espacios.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarRespuestaEspacio } from "@/app/actions/respuestasEspacios";

interface Props {
  propuestaId: number;
  espacioId: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  minPalabras: number;
  maxPalabras: number;
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
  pasoSiguiente: number;
  pasoAnterior: number | null;
}

const contar = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export default function TextoEspacioForm({
  propuestaId, espacioId, titulo, descripcion, obligatorio, minPalabras, maxPalabras, initialData, isLocked, isReadOnly = false, pasoSiguiente, pasoAnterior,
}: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState(initialData || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const disabled = isLocked || isReadOnly;
  const n = contar(texto);
  const limite = minPalabras && maxPalabras ? `Entre ${minPalabras} y ${maxPalabras} palabras.` : minPalabras ? `Al menos ${minPalabras} palabras.` : maxPalabras ? `Hasta ${maxPalabras} palabras.` : "";
  const fuera = (minPalabras > 0 && n > 0 && n < minPalabras) || (maxPalabras > 0 && n > maxPalabras);

  const guardar = async (avanzar: boolean) => {
    if (disabled) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const res = await guardarRespuestaEspacio(propuestaId, espacioId, texto);
    if (!res.success) setError(res.error || "No se pudo guardar.");
    else {
      setSuccess(`${titulo} guardado correctamente.`);
      if (avanzar) {
        router.push(`?id=${propuestaId}&step=${pasoSiguiente}`);
        router.refresh();
      }
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">{titulo}</h2>
        {descripcion && <p className="text-sm text-muted mt-1">{descripcion}</p>}
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">{error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">{success}</div>}

      <div className="space-y-6">
        <div>
          <label htmlFor={`esp-${espacioId}`} className="block text-sm font-bold text-card-dark mb-2">
            {titulo} {obligatorio ? <span className="text-red-500">*</span> : <span className="text-xs font-medium text-muted">(opcional)</span>}
          </label>
          <textarea id={`esp-${espacioId}`} rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={disabled}
            className="w-full p-4 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm leading-relaxed disabled:opacity-75" />
          <div className={`flex justify-between text-xs mt-1 ${fuera ? "text-red-600 font-bold" : "text-muted"}`}>
            <span>{limite}</span>
            <span>{n} palabra{n === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
          {pasoAnterior !== null ? (
            <button type="button" onClick={() => router.push(`?id=${propuestaId}&step=${pasoAnterior}`)}
              className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors cursor-pointer">
              ← Volver al paso anterior
            </button>
          ) : <span />}
          {!disabled && (
            <div className="flex items-center gap-3">
              <button type="button" disabled={pending} onClick={() => guardar(false)}
                className="px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer">
                Guardar Borrador
              </button>
              <button type="button" disabled={pending} onClick={() => guardar(true)}
                className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
                {pending ? "Guardando..." : "Guardar y Continuar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
