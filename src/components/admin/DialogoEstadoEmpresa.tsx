"use client";

// Confirmación para habilitar o deshabilitar una empresa (entrega V2). Pide el motivo, que queda en la bitácora con su
// fecha, y muestra lo que sirve para decidir: valoraciones (V3) y reportes vigentes en contra de la empresa.

import { useState } from "react";
import { cambiarEstadoEmpresa } from "@/app/actions/estadoEmpresa";
import { MINIMO_MOTIVO, NOMBRE_ORIGEN, type OrigenReporte } from "@/lib/bitacoraEmpresa";
import { formatoNota } from "@/lib/valoraciones";
import Nota from "@/components/valoraciones/Nota";

export interface ReporteParaDialogo {
  id: number;
  fecha: string;
  origen: OrigenReporte;
  descripcion: string;
}

export const fechaCorta = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });

export default function DialogoEstadoEmpresa({
  empresa,
  reportes,
  notas = null,
  onCerrar,
  onHecho,
}: {
  empresa: { id: number; nombre: string; habilitada: boolean };
  reportes: ReporteParaDialogo[];
  /** Valoración de la empresa (entrega V3); null si todavía no tiene. */
  notas?: { egresados: number | null; asesores: number | null; general: number | null } | null;
  onCerrar: () => void;
  onHecho?: () => void;
}) {
  const deshabilitar = empresa.habilitada;
  const [motivo, setMotivo] = useState("");
  const [reporteId, setReporteId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltan = Math.max(0, MINIMO_MOTIVO - motivo.trim().length);

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    const res = await cambiarEstadoEmpresa(empresa.id, !deshabilitar, motivo, deshabilitar ? reporteId : null);
    setGuardando(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onHecho?.();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-4 border-b ${deshabilitar ? "bg-brand-red text-white border-brand-red" : "bg-gray-50 border-border"}`}>
          <h3 className="font-bold text-lg">{deshabilitar ? "Deshabilitar empresa" : "Habilitar empresa"}</h3>
          <p className={`text-sm ${deshabilitar ? "text-white/85" : "text-muted"}`}>{empresa.nombre}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            {deshabilitar
              ? "Los egresados la verán como deshabilitada y no podrán elegirla en una propuesta nueva. Los procesos que ya tiene no se modifican."
              : "Los egresados podrán volver a elegirla en sus propuestas."}
          </p>

          {deshabilitar && (
            <div className="rounded-xl border border-border bg-gray-50 p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Datos para decidir</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valoración promedio (egresados y asesores)</span>
                <Nota valor={notas?.general ?? null} />
              </div>
              {notas && (notas.egresados != null || notas.asesores != null) && (
                <p className="text-xs text-muted -mt-2 text-right">
                  Egresados {formatoNota(notas.egresados)} · Asesores {formatoNota(notas.asesores)}
                </p>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reportes vigentes en contra</span>
                <span className={`font-bold ${reportes.length ? "text-brand-red" : "text-gray-800"}`}>{reportes.length}</span>
              </div>
              {reportes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reporte que motiva la decisión (opcional)</label>
                  <select
                    value={reporteId ?? ""}
                    onChange={(e) => setReporteId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:border-brand-red outline-none"
                  >
                    <option value="">Ninguno en particular</option>
                    {reportes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {fechaCorta(r.fecha)} · {NOMBRE_ORIGEN[r.origen]} · {r.descripcion.slice(0, 60)}{r.descripcion.length > 60 ? "..." : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Motivo o justificación <span className="text-brand-red">*</span>
            </label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={deshabilitar ? "Ej. La empresa no brindó el acompañamiento acordado a los egresados de la cohorte..." : "Ej. La empresa corrigió las condiciones señaladas en el reporte..."}
              className="w-full border border-border p-3 rounded-lg text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
            />
            <p className="text-xs text-muted mt-1">
              {faltan > 0 ? `Faltan ${faltan} caracteres.` : "El motivo queda en la bitácora de la empresa con la fecha de hoy."}
            </p>
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={guardando} className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando || faltan > 0}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-50 ${deshabilitar ? "bg-brand-red hover:bg-brand-red-hover" : "bg-green-700 hover:bg-green-800"}`}
          >
            {guardando ? "Guardando..." : deshabilitar ? "Deshabilitar empresa" : "Habilitar empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}
