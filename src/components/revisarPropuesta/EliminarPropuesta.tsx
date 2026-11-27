"use client";
// Eliminar una propuesta (A5): ventana propia con lo que se borra, justificación y la palabra de confirmación.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { eliminarPropuestaConJustificacion } from "@/app/actions/eliminarPropuesta";
import { MIN_JUSTIFICACION_ELIMINAR, PALABRA_ELIMINAR, revisarEliminacion } from "@/lib/eliminarPropuesta";

export default function EliminarPropuesta({ propuestaId, numero, titulo, integrantes }: { propuestaId: number; numero: number; titulo: string | null; integrantes: string[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listo = revisarEliminacion(justificacion, confirmacion).length === 0;

  const eliminar = async () => {
    const p = revisarEliminacion(justificacion, confirmacion);
    if (p.length) return setError(p.join(" "));
    setEnviando(true);
    setError(null);
    const r = await eliminarPropuestaConJustificacion(propuestaId, justificacion, confirmacion);
    if (!r.success) {
      setEnviando(false);
      return setError(r.error ?? "No se pudo eliminar la propuesta.");
    }
    router.push("/admin/propuestas");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-full py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold transition-colors"
      >
        Eliminar propuesta definitivamente
      </button>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-eliminar">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              <div className="border-b border-border px-6 py-4">
                <h2 id="titulo-eliminar" className="text-lg font-bold text-card-dark">Eliminar la propuesta #{numero}</h2>
                <p className="text-sm text-muted mt-0.5">{titulo || "Sin título"}</p>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div className="rounded-lg border border-brand-red/30 bg-red-50 px-4 py-3 text-sm text-gray-800 space-y-1">
                  <p className="font-bold text-brand-red">No se puede deshacer.</p>
                  <p>
                    Se borran la propuesta y todo lo relacionado: equipo, contenido, carta, solicitudes, historial y revisiones. Los documentos de
                    soporte de cada egresado no se borran.
                  </p>
                  {integrantes.length > 0 && <p>Se avisará a: {integrantes.join(", ")}.</p>}
                  <p>Queda un registro con la justificación, quién y cuándo.</p>
                </div>
                <div>
                  <label htmlFor="justificacion-eliminar" className="block text-sm font-bold text-card-dark mb-1">Justificación</label>
                  <textarea
                    id="justificacion-eliminar"
                    rows={3}
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    placeholder="Ej: propuesta duplicada por error; el equipo trabaja en la propuesta #2."
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                  <p className="text-xs text-muted mt-1">Mínimo {MIN_JUSTIFICACION_ELIMINAR} caracteres ({justificacion.trim().length}). La recibe el equipo.</p>
                </div>
                <div>
                  <label htmlFor="confirmar-eliminar" className="block text-sm font-bold text-card-dark mb-1">
                    Escribe <span className="font-mono">{PALABRA_ELIMINAR}</span> para confirmar
                  </label>
                  <input
                    id="confirmar-eliminar"
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    autoComplete="off"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={() => { setAbierto(false); setError(null); }} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={enviando || !listo}
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-hover disabled:opacity-50"
                >
                  {enviando ? "Eliminando..." : "Eliminar definitivamente"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
