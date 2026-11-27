"use client";
// D3 (specs/COORDINADOR_ASIGNACION.md): ventana para enviar la solicitud de asesoría desde la lista del coordinador.
// Asesores según la configuración de la cohorte (C2), con «Prioritario» por la empresa (A6) y su carga.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { asignarAsesorCoordinador, getAsesoresFacultad } from "@/app/actions/coordinador";
import Prioritario from "@/components/asesores/Prioritario";

interface Opcion {
  id: number;
  nombreCompleto: string;
  correo: string;
  prioritario?: string | null;
  deLaCarrera?: boolean;
  carga?: number;
  /** D5 */
  cupo?: number;
  lleno?: boolean;
}

export default function AsignarAsesor({
  propuestaId,
  titulo,
  egresados,
  textoBoton = "Asignar asesor",
}: {
  propuestaId: number;
  titulo: string;
  egresados: string;
  textoBoton?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<Opcion[] | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async () => {
    setAbierto(true);
    setElegido(null);
    setError(null);
    setOpciones(null);
    const r = await getAsesoresFacultad(propuestaId);
    setOpciones(r.success && Array.isArray(r.data) ? (r.data as Opcion[]) : []);
  };

  const enviar = async () => {
    if (!elegido) return;
    setEnviando(true);
    setError(null);
    const r = await asignarAsesorCoordinador(propuestaId, elegido);
    setEnviando(false);
    if (r?.success) {
      setAbierto(false);
      router.refresh();
    } else {
      setError(r?.error ?? "No se pudo enviar la solicitud.");
    }
  };

  return (
    <>
      <button type="button" onClick={abrir} className="rounded-lg bg-brand-red px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-red-hover">
        {textoBoton}
      </button>
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`asignar-${propuestaId}`}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
              <div className="border-b border-border px-6 py-4">
                <h3 id={`asignar-${propuestaId}`} className="text-lg font-bold text-card-dark">Asignar asesor</h3>
                <p className="mt-1 text-sm text-gray-800">{titulo}</p>
                <p className="text-xs text-muted">{egresados}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
                {opciones === null ? (
                  <p className="text-sm text-muted">Cargando asesores…</p>
                ) : opciones.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    No hay asesores configurados para la carrera de esta propuesta en su cohorte.
                  </p>
                ) : (
                  <>
                    {opciones.some((o) => o.prioritario) && (
                      <p className="text-xs text-gray-600">Los prioritarios ya trabajan o trabajaron con la empresa de esta propuesta.</p>
                    )}
                    {opciones.map((o) => (
                      <label
                        key={o.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 ${o.lleno ? "cursor-not-allowed border-border bg-gray-50 opacity-70" : elegido === o.id ? "cursor-pointer border-brand-red bg-red-50/40" : "cursor-pointer border-border hover:border-gray-400"}`}
                      >
                        <input type="radio" disabled={!!o.lleno} name={`asesor-${propuestaId}`} checked={elegido === o.id} onChange={() => setElegido(o.id)} className="mt-1 accent-brand-red" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">{o.nombreCompleto}</span>
                            {o.prioritario && <Prioritario motivo={o.prioritario} />}
                            {o.deLaCarrera && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-gray-600">De la carrera</span>}
                          </span>
                          <span className="block truncate text-[11px] text-muted">{o.correo}</span>
                          {o.prioritario && <span className="block text-[11px] text-amber-900">{o.prioritario}</span>}
                          {typeof o.carga === "number" && (
                            <span className={`block text-[11px] ${o.lleno ? "font-bold text-red-800" : "text-gray-600"}`}>
                              {typeof o.cupo === "number" ? `Carga: ${o.carga} de ${o.cupo}${o.lleno ? " · Cupo lleno" : ` · ${o.cupo - o.carga} disponible${o.cupo - o.carga === 1 ? "" : "s"}`}` : `${o.carga} a su cargo`}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </>
                )}
                {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold">Cancelar</button>
                <button
                  type="button"
                  onClick={enviar}
                  disabled={!elegido || enviando}
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? "Enviando…" : "Enviar solicitud al asesor"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
