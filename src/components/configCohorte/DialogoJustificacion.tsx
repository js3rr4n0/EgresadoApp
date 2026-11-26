"use client";

// Confirmación de un cambio en la configuración cuando la cohorte ya inició (entrega C1, respuesta 6).

import { useState } from "react";
import { MINIMO_JUSTIFICACION } from "@/lib/configCohorte";

export default function DialogoJustificacion({
  titulo,
  cambios,
  guardando,
  error,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  cambios: string[];
  guardando: boolean;
  error: string | null;
  onConfirmar: (justificacion: string) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const faltan = Math.max(0, MINIMO_JUSTIFICACION - texto.trim().length);
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 bg-brand-red text-white">
          <h3 className="font-bold text-lg">Confirmar cambio en la cohorte</h3>
          <p className="text-sm text-white/85">{titulo}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            La cohorte ya inició. El cambio no modifica las propuestas que ya tienen coordinador o asesor asignado, y queda en la
            bitácora de la configuración con la justificación.
          </p>
          {cambios.length > 0 && (
            <ul className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {cambios.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Justificación <span className="text-brand-red">*</span></label>
            <textarea
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full border border-border p-3 rounded-lg text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
              placeholder="Ej. La facultad solicitó un segundo coordinador por la cantidad de propuestas recibidas..."
            />
            <p className="text-xs text-muted mt-1">{faltan > 0 ? `Faltan ${faltan} caracteres.` : "Lista para confirmar."}</p>
          </div>
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCancelar} disabled={guardando} className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200">Cancelar</button>
          <button
            type="button"
            onClick={() => onConfirmar(texto)}
            disabled={guardando || faltan > 0}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-red hover:bg-brand-red-hover disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Confirmar cambio"}
          </button>
        </div>
      </div>
    </div>
  );
}
