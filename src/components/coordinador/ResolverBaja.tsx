"use client";
// D3 (specs/COORDINADOR_ASIGNACION.md): resolver una solicitud de baja desde «Solicitudes». Aprobar anula la propuesta.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { responderSolicitudBajaCoordinador } from "@/app/actions/coordinador";

export default function ResolverBaja({
  id,
  titulo,
  asesor,
  egresado,
  motivo,
}: {
  id: number;
  titulo: string;
  asesor: string;
  egresado: string;
  motivo: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [enviando, setEnviando] = useState<"aprobada" | "rechazada" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const responder = async (decision: "aprobada" | "rechazada") => {
    setEnviando(decision);
    setError(null);
    const r = await responderSolicitudBajaCoordinador(id, decision, respuesta.trim());
    setEnviando(null);
    if (r?.success) {
      setAbierto(false);
      router.refresh();
    } else {
      setError(r?.error ?? "No se pudo responder la solicitud.");
    }
  };

  return (
    <>
      <button type="button" onClick={() => { setAbierto(true); setConfirmarAnular(false); setError(null); }} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800">
        Resolver
      </button>
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`baja-${id}`}>
            <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <div>
                <h3 id={`baja-${id}`} className="text-lg font-bold text-card-dark">Solicitud de baja</h3>
                <p className="mt-1 text-sm font-semibold text-gray-900">{titulo}</p>
                <p className="text-xs text-muted">Pide la baja: {asesor} (asesor) · Egresado: {egresado}</p>
              </div>
              <div className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Motivo</p>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{motivo}</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Respuesta (opcional)</span>
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                />
              </label>
              {confirmarAnular && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  Aprobar la baja anula la propuesta y no se puede deshacer. Confirma con «Sí, anular la propuesta».
                </p>
              )}
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Cancelar</button>
                <button type="button" disabled={!!enviando} onClick={() => responder("rechazada")} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                  {enviando === "rechazada" ? "Procesando…" : "Rechazar la baja"}
                </button>
                <button
                  type="button"
                  disabled={!!enviando}
                  onClick={() => (confirmarAnular ? responder("aprobada") : setConfirmarAnular(true))}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {enviando === "aprobada" ? "Procesando…" : confirmarAnular ? "Sí, anular la propuesta" : "Aprobar la baja"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
