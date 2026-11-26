"use client";

import { useState } from "react";
import DialogoEstadoAsesor from "./DialogoEstadoAsesor";

export default function BotonEstadoAsesor({ asesor }: { asesor: { id: number; nombre: string; activo: boolean; nota: number | null; procesosActivos: number } }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${
          asesor.activo ? "border-border bg-white text-gray-700 hover:border-brand-red hover:text-brand-red" : "border-green-300 bg-white text-green-700 hover:bg-green-50"
        }`}
      >
        {asesor.activo ? "Deshabilitar" : "Habilitar"}
      </button>
      {abierto && <DialogoEstadoAsesor asesor={asesor} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
