"use client";
// Modificar o eliminar una propuesta rechazada por requisitos (A3). Solo el líder.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarPropuestaRechazada, modificarPropuestaRechazada } from "@/app/actions/rechazoPropuesta";

export default function AccionesPropuestaRechazada({ propuestaId, numero }: { propuestaId: number; numero: number }) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<"modificar" | "eliminar" | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modificar = async () => {
    setPendiente("modificar");
    setError(null);
    const r = await modificarPropuestaRechazada(propuestaId);
    if (!r.success) {
      setError(r.error ?? "No se pudo reabrir la propuesta.");
      setPendiente(null);
      return;
    }
    router.push(`/egresado/redactar?id=${propuestaId}`);
  };

  const eliminar = async () => {
    setPendiente("eliminar");
    setError(null);
    const r = await eliminarPropuestaRechazada(propuestaId);
    setPendiente(null);
    if (!r.success) return setError(r.error ?? "No se pudo eliminar la propuesta.");
    setConfirmarBorrado(false);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      {confirmarBorrado ? (
        <div className="rounded-lg border border-brand-red/30 bg-white p-3 space-y-2">
          <p className="text-sm text-gray-800">
            ¿Eliminar definitivamente la propuesta #{numero}? Se borran todos sus datos y no se puede deshacer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={eliminar} disabled={pendiente !== null}
              className="rounded-lg bg-brand-red px-4 py-2 text-xs font-bold text-white hover:bg-brand-red-hover disabled:opacity-50">
              {pendiente === "eliminar" ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button type="button" onClick={() => setConfirmarBorrado(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={modificar} disabled={pendiente !== null}
            className="rounded-lg bg-brand-red px-4 py-2 text-xs font-bold text-white hover:bg-brand-red-hover disabled:opacity-50">
            {pendiente === "modificar" ? "Abriendo..." : "Modificar propuesta"}
          </button>
          <button type="button" onClick={() => setConfirmarBorrado(true)} disabled={pendiente !== null}
            className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red disabled:opacity-50">
            Eliminar propuesta
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-brand-red">{error}</p>}
    </div>
  );
}
