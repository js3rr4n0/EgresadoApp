"use client";
// D8 (specs/COORDINADOR_ASIGNACION.md): el egresado líder o el asesor piden el cambio de asesor y ven en qué va.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { solicitarCambioAsesor } from "@/app/actions/cambioAsesor";
import { CAMBIO_ABIERTO, MIN_MOTIVO_CAMBIO, NOMBRE_ESTADO_CAMBIO, type EstadoCambio } from "@/lib/cambioAsesor";
import { fechaCortaSV } from "@/lib/fechasTexto";

export interface CambioResumen {
  estado: EstadoCambio;
  motivo: string;
  solicitante: string;
  nuevoAsesor: string | null;
  respuesta: string | null;
  creadaEn: string;
}

export default function PedirCambioAsesor({
  propuestaId,
  quien,
  asesorActual,
  ultimo,
}: {
  propuestaId: number;
  quien: "egresado" | "asesor";
  asesorActual: string;
  ultimo: CambioResumen | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = !!ultimo && CAMBIO_ABIERTO.includes(ultimo.estado);
  const largo = motivo.trim().length;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    const r = await solicitarCambioAsesor(propuestaId, motivo);
    setEnviando(false);
    if (r.success) {
      setAbierto(false);
      setMotivo("");
      router.refresh();
    } else setError(r.error);
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-card-dark">Cambio de asesor</p>
          {enCurso ? (
            <p className="text-xs text-gray-700">
              Solicitud del {fechaCortaSV(ultimo!.creadaEn)}: <span className="font-semibold">{NOMBRE_ESTADO_CAMBIO[ultimo!.estado]}</span>
              {ultimo!.estado === "esperando_asesor" && ultimo!.nuevoAsesor ? ` (${ultimo!.nuevoAsesor})` : ""}. Mientras tanto sigue {asesorActual}.
            </p>
          ) : (
            <p className="text-xs text-muted">
              {quien === "egresado"
                ? "Si hay un problema con tu asesor, puedes pedir que se asigne otro. Lo decide la coordinación o la administración y el trabajo hecho se conserva."
                : "Si no puedes seguir asesorando esta propuesta, pide que se asigne otro asesor. Sigues a cargo hasta que el nuevo acepte."}
            </p>
          )}
          {ultimo?.estado === "rechazada" && (
            <p className="mt-1 text-xs text-gray-700">
              La última solicitud ({fechaCortaSV(ultimo.creadaEn)}) fue rechazada{ultimo.respuesta ? `: ${ultimo.respuesta}` : "."}
            </p>
          )}
          {ultimo?.estado === "completada" && <p className="mt-1 text-xs text-gray-700">El último cambio se completó{ultimo.nuevoAsesor ? `: ahora asesora ${ultimo.nuevoAsesor}` : ""}.</p>}
        </div>
        {!enCurso && (
          <button type="button" onClick={() => { setAbierto(true); setError(null); }} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-brand-red hover:text-brand-red">
            Solicitar cambio de asesor
          </button>
        )}
      </div>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`cambio-${propuestaId}`}>
            <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <div>
                <h3 id={`cambio-${propuestaId}`} className="text-lg font-bold text-card-dark">Solicitar cambio de asesor</h3>
                <p className="mt-1 text-sm text-muted">
                  Asesor actual: {asesorActual}. La coordinación o la administración revisará el motivo y, si lo aprueba, elegirá al nuevo
                  asesor. Plan, bitácora e informes se conservan.
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Motivo</span>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={4}
                  maxLength={1500}
                  className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                />
                <span className={`mt-1 block text-[11px] ${largo < MIN_MOTIVO_CAMBIO ? "text-amber-800" : "text-gray-500"}`}>
                  {largo < MIN_MOTIVO_CAMBIO ? `Mínimo ${MIN_MOTIVO_CAMBIO} caracteres (llevas ${largo}).` : `${largo} caracteres.`}
                </span>
              </label>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Cancelar</button>
                <button
                  type="button"
                  disabled={enviando || largo < MIN_MOTIVO_CAMBIO}
                  onClick={enviar}
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
