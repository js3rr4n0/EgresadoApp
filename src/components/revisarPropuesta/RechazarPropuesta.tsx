"use client";
// Botón y ventana para rechazar una propuesta por requisitos (A2). Lo usan la administración (Revisar propuesta) y el
// coordinador (su ventana de revisión antes de asignar asesor).

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { rechazarPropuestaRequisitos } from "@/app/actions/rechazoPropuesta";
import { MIN_MENSAJE_RECHAZO, MOTIVOS_RECHAZO, revisarRechazo, type MotivoMarcado } from "@/lib/rechazoPropuesta";

interface Integrante {
  id: number;
  nombre: string;
}

export default function RechazarPropuesta({
  propuestaId,
  numero,
  integrantes,
  alRechazar,
  claseBoton,
  motivosIniciales,
  textoBoton = "Rechazar propuesta",
}: {
  propuestaId: number;
  numero: number;
  integrantes: Integrante[];
  /** Por defecto recarga la página. */
  alRechazar?: () => void;
  claseBoton?: string;
  /** Motivos ya marcados al abrir (A4: «la firma no coincide»). */
  motivosIniciales?: MotivoMarcado[];
  textoBoton?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<MotivoMarcado[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unSolo = integrantes.length === 1;

  const estaMarcado = (clave: string, integranteId?: number) => marcados.some((m) => m.clave === clave && m.integranteId === integranteId);
  const alternar = (clave: string, integranteId?: number) =>
    setMarcados((prev) =>
      prev.some((m) => m.clave === clave && m.integranteId === integranteId)
        ? prev.filter((m) => !(m.clave === clave && m.integranteId === integranteId))
        : [...prev, { clave, ...(integranteId != null ? { integranteId } : {}) }],
    );

  const cerrar = () => {
    setAbierto(false);
    setError(null);
  };

  const confirmar = async () => {
    const problemas = revisarRechazo({ motivos: marcados, mensaje }, integrantes.map((i) => i.id));
    if (problemas.length) return setError(problemas.join(" "));
    setEnviando(true);
    setError(null);
    const r = await rechazarPropuestaRequisitos(propuestaId, { motivos: marcados, mensaje });
    setEnviando(false);
    if (!r.success) return setError(r.error ?? "No se pudo rechazar la propuesta.");
    setAbierto(false);
    if (alRechazar) alRechazar();
    else router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { if (motivosIniciales) setMarcados(motivosIniciales); setAbierto(true); }}
        className={claseBoton ?? "w-full py-2.5 rounded-xl border border-brand-red text-brand-red hover:bg-red-50 text-sm font-bold transition-colors"}
      >
        {textoBoton}
      </button>

      {/* En el body: el panel lateral es «sticky» y atraparía la ventana debajo del menú */}
      {abierto && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-rechazo">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="border-b border-border px-6 py-4">
              <h2 id="titulo-rechazo" className="text-lg font-bold text-card-dark">Rechazar la propuesta #{numero}</h2>
              <p className="text-sm text-muted mt-0.5">
                La propuesta vuelve al egresado como rechazada. Podrá modificarla y enviarla de nuevo; la asignación en curso se cancela.
              </p>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <fieldset>
                <legend className="text-sm font-bold text-card-dark mb-2">Motivos</legend>
                <ul className="space-y-2">
                  {MOTIVOS_RECHAZO.map((m) => (
                    <li key={m.clave} className="rounded-lg border border-border px-3 py-2">
                      {m.porIntegrante && !unSolo ? (
                        <>
                          <p className="text-sm text-gray-800">{m.texto}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                            {integrantes.map((i) => (
                              <label key={i.id} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                <input type="checkbox" className="accent-brand-red" checked={estaMarcado(m.clave, i.id)} onChange={() => alternar(m.clave, i.id)} />
                                {i.nombre}
                              </label>
                            ))}
                          </div>
                        </>
                      ) : (
                        <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-brand-red"
                            checked={estaMarcado(m.clave, m.porIntegrante ? integrantes[0]?.id : undefined)}
                            onChange={() => alternar(m.clave, m.porIntegrante ? integrantes[0]?.id : undefined)}
                          />
                          {m.texto}
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div>
                <label htmlFor="mensaje-rechazo" className="block text-sm font-bold text-card-dark mb-1">Mensaje al egresado</label>
                <textarea
                  id="mensaje-rechazo"
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Explica qué debe corregir. Ej: subiste el recibo de pago de inscripción; se necesita la hoja de inscripción del trabajo de graduación."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
                <p className="text-xs text-muted mt-1">
                  Lo recibe todo el equipo. Mínimo {MIN_MENSAJE_RECHAZO} caracteres ({mensaje.trim().length}).
                </p>
              </div>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button type="button" onClick={cerrar} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando}
                className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-hover disabled:opacity-50"
              >
                {enviando ? "Rechazando..." : "Rechazar propuesta"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
