"use client";

import { useState } from "react";
import { reenviarPropuestaAjustada } from "@/app/actions/propuestas";

export default function ReenviarPropuestaAjustadaButton({ propuestaId }: { propuestaId: number }) {
  const [loading, setLoading] = useState(false);

  const handleReenviar = async () => {
    if (!confirm("¿Confirma que ha realizado todas las correcciones solicitadas y desea reenviar su propuesta ajustada?")) {
      return;
    }
    setLoading(true);
    const res = await reenviarPropuestaAjustada(propuestaId);
    setLoading(false);
    if (res.success) {
      alert(res.message);
      window.location.href = "/egresado";
    } else {
      alert(res.error || "Error al reenviar la propuesta.");
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleReenviar}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
      <span>{loading ? "Reenviando..." : "Reenviar Propuesta Ajustada"}</span>
    </button>
  );
}
