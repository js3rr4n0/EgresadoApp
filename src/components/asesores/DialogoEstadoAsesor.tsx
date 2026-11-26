"use client";

// Confirmación para habilitar o deshabilitar un asesor (entrega V5): pide el motivo, que queda en su bitácora.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoAsesor } from "@/app/actions/asesoresAdmin";
import { MINIMO_MOTIVO } from "@/lib/bitacoraEmpresa";
import Nota from "@/components/valoraciones/Nota";

export default function DialogoEstadoAsesor({
  asesor,
  onCerrar,
}: {
  asesor: { id: number; nombre: string; activo: boolean; nota: number | null; procesosActivos: number };
  onCerrar: () => void;
}) {
  const deshabilitar = asesor.activo;
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const faltan = Math.max(0, MINIMO_MOTIVO - motivo.trim().length);

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    const res = await cambiarEstadoAsesor(asesor.id, !deshabilitar, motivo);
    setGuardando(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-4 border-b ${deshabilitar ? "bg-brand-red text-white border-brand-red" : "bg-gray-50 border-border"}`}>
          <h3 className="font-bold text-lg">{deshabilitar ? "Deshabilitar asesor" : "Habilitar asesor"}</h3>
          <p className={`text-sm ${deshabilitar ? "text-white/85" : "text-muted"}`}>{asesor.nombre}</p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            {deshabilitar
              ? "El asesor no podrá iniciar sesión. Sus procesos y valoraciones se conservan."
              : "El asesor podrá volver a iniciar sesión y recibir procesos."}
          </p>
          {deshabilitar && (
            <div className="rounded-xl border border-border bg-gray-50 p-4 space-y-2 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Datos para decidir</p>
              <div className="flex justify-between"><span className="text-gray-600">Nota histórica de los egresados</span><Nota valor={asesor.nota} /></div>
              <div className="flex justify-between">
                <span className="text-gray-600">Procesos en curso</span>
                <span className={`font-bold ${asesor.procesosActivos ? "text-brand-red" : "text-gray-800"}`}>{asesor.procesosActivos}</span>
              </div>
              {asesor.procesosActivos > 0 && (
                <p className="text-xs text-brand-red">Tiene procesos en curso: sus egresados se quedarán sin asesor que revise mientras esté deshabilitado.</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Motivo o justificación <span className="text-brand-red">*</span></label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-border p-3 rounded-lg text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
              placeholder={deshabilitar ? "Ej. Finalizó su contrato como docente asesor..." : "Ej. Se reincorpora como asesor para la cohorte..."}
            />
            <p className="text-xs text-muted mt-1">{faltan > 0 ? `Faltan ${faltan} caracteres.` : "El motivo queda en la bitácora del asesor con la fecha de hoy."}</p>
          </div>
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={guardando} className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors">Cancelar</button>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || faltan > 0}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50 ${deshabilitar ? "bg-brand-red hover:bg-brand-red-hover" : "bg-green-700 hover:bg-green-800"}`}
          >
            {guardando ? "Guardando..." : deshabilitar ? "Deshabilitar asesor" : "Habilitar asesor"}
          </button>
        </div>
      </div>
    </div>
  );
}
