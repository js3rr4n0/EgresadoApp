"use client";

import { useState } from "react";
import type { EjemploCampo } from "@/lib/ejemplosInforme";

/** Recuadro plegable con un ejemplo (texto y, si existe, video) para orientar el llenado de un apartado. */
export default function AyudaEjemplo({ ejemplo, aviso }: { ejemplo: EjemploCampo; aviso?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="text-[11px]">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-brand-red transition-colors"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px] leading-none">?</span>
        {abierto ? "Ocultar ejemplo" : "Ver ejemplo"}
      </button>
      {abierto && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          {ejemplo.introduccion && <p className="text-slate-700 font-bold">{ejemplo.introduccion}</p>}
          <p className="font-extrabold text-slate-700">{ejemplo.titulo}</p>
          {ejemplo.videoUrl && (
            <video src={ejemplo.videoUrl} controls className="w-full max-h-64 rounded-lg border border-slate-200 bg-black" />
          )}
          <div className="space-y-1.5">
            {ejemplo.texto.split("\n").map((parrafo, i) => (
              <p key={i} className="text-slate-600 font-medium leading-relaxed italic">
                {parrafo}
              </p>
            ))}
          </div>
          {ejemplo.referencia && (
            <p className="text-slate-600 font-medium">
              <span className="font-bold not-italic">Referencia: </span>
              {ejemplo.referencia}
            </p>
          )}
          {ejemplo.nota && <p className="text-slate-700 font-bold">{ejemplo.nota}</p>}
          {aviso && <p className="pt-1 border-t border-slate-200 text-slate-400 font-semibold">{aviso}</p>}
        </div>
      )}
    </div>
  );
}
