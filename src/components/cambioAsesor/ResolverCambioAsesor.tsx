"use client";
// D8 (specs/COORDINADOR_ASIGNACION.md): el coordinador o la administración atienden un cambio de asesor: rechazar con
// respuesta, o aprobar eligiendo al nuevo asesor (configuración de la cohorte y cupo). Si el nuevo asesor rechaza,
// vuelve como «Elegir otro asesor».

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { aprobarCambioAsesor, opcionesCambioAsesor, rechazarCambioAsesor, type OpcionCambio } from "@/app/actions/cambioAsesor";
import Prioritario from "@/components/asesores/Prioritario";
import { MIN_RESPUESTA_CAMBIO, type EstadoCambio } from "@/lib/cambioAsesor";

export default function ResolverCambioAsesor({
  id,
  estado,
  titulo,
  solicitante,
  rolSolicitante,
  asesorActual,
  motivo,
}: {
  id: number;
  estado: EstadoCambio;
  titulo: string;
  solicitante: string;
  rolSolicitante: "egresado" | "asesor";
  asesorActual: string;
  motivo: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"aprobar" | "rechazar">(estado === "por_reasignar" ? "aprobar" : "aprobar");
  const [opciones, setOpciones] = useState<OpcionCambio[] | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async () => {
    setAbierto(true);
    setError(null);
    setElegido(null);
    setOpciones(null);
    const r = await opcionesCambioAsesor(id);
    if (r.success) setOpciones(r.data);
    else setError(r.error);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    const r = modo === "rechazar" ? await rechazarCambioAsesor(id, respuesta) : await aprobarCambioAsesor(id, elegido!, respuesta);
    setEnviando(false);
    if (r.success) {
      setAbierto(false);
      router.refresh();
    } else setError(r.error);
  };

  const listo = modo === "rechazar" ? respuesta.trim().length >= MIN_RESPUESTA_CAMBIO : !!elegido;

  return (
    <>
      <button type="button" onClick={abrir} className="whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800">
        {estado === "por_reasignar" ? "Elegir otro asesor" : "Resolver"}
      </button>
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`resolver-cambio-${id}`}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
              <div className="space-y-3 border-b border-border px-6 py-4">
                <div>
                  <h3 id={`resolver-cambio-${id}`} className="text-lg font-bold text-card-dark">Cambio de asesor</h3>
                  <p className="text-sm font-semibold text-gray-900">{titulo}</p>
                  <p className="text-xs text-muted">
                    Asesor actual: {asesorActual} · Pide: {solicitante} ({rolSolicitante === "asesor" ? "el asesor" : "el egresado"})
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Motivo</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{motivo}</p>
                </div>
                {estado === "pendiente" ? (
                  <div className="flex gap-2" role="tablist">
                    {(["aprobar", "rechazar"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={modo === m}
                        onClick={() => setModo(m)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${modo === m ? "border-gray-900 bg-gray-900 text-white" : "border-border text-gray-700 hover:bg-gray-50"}`}
                      >
                        {m === "aprobar" ? "Aprobar y elegir asesor" : "Rechazar"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-900">El asesor elegido rechazó la solicitud: elige otro.</p>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                {modo === "aprobar" ? (
                  opciones === null && !error ? (
                    <p className="text-sm text-muted">Cargando asesores…</p>
                  ) : (opciones ?? []).length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No hay otros asesores configurados para la carrera de esta propuesta.</p>
                  ) : (
                    <ul className="space-y-2">
                      {opciones!.map((o) => (
                        <li key={o.id}>
                          <label className={`flex items-start gap-3 rounded-lg border p-3 ${o.lleno ? "cursor-not-allowed bg-gray-50 opacity-70" : elegido === o.id ? "cursor-pointer border-brand-red bg-red-50/40" : "cursor-pointer border-border hover:border-gray-400"}`}>
                            <input type="radio" disabled={o.lleno} name={`nuevo-${id}`} checked={elegido === o.id} onChange={() => setElegido(o.id)} className="mt-1 accent-brand-red" />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-900">{o.nombreCompleto}</span>
                                {o.prioritario && <Prioritario motivo={o.prioritario} />}
                                {o.deLaCarrera && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-gray-600">De la carrera</span>}
                              </span>
                              <span className="block truncate text-[11px] text-muted">{o.correo}</span>
                              <span className={`block text-[11px] ${o.lleno ? "font-bold text-red-800" : "text-gray-600"}`}>
                                Carga: {o.carga} de {o.cupo}{o.lleno ? " · Cupo lleno" : ` · ${o.cupo - o.carga} disponible${o.cupo - o.carga === 1 ? "" : "s"}`}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">{modo === "rechazar" ? "Respuesta (obligatoria)" : "Mensaje para quien lo pidió (opcional)"}</span>
                  <textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                </label>
                {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              </div>

              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Cancelar</button>
                <button
                  type="button"
                  disabled={!listo || enviando}
                  onClick={confirmar}
                  className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${modo === "rechazar" ? "bg-red-700 hover:bg-red-800" : "bg-brand-red hover:bg-brand-red-hover"}`}
                >
                  {enviando ? "Procesando…" : modo === "rechazar" ? "Rechazar el cambio" : "Enviar solicitud al nuevo asesor"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
