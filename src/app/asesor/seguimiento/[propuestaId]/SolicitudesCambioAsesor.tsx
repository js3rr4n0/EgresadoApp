"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { responderSolicitudCambioActividad, getDocumentoSupervisorSolicitud } from "@/app/actions/cambiosActividad";
import { openDocument } from "@/lib/pdfViewer";

const TIPO_LABEL: Record<string, string> = {
  agregar: "Agregar actividad nueva",
  modificar: "Modificar actividad existente",
  eliminar: "Eliminar actividad",
  posponer: "Posponer actividad",
  reubicar: "Intercambiar / reubicar actividad",
};

const ESTADO_BADGE: Record<string, { label: string; badge: string }> = {
  pendiente: { label: "Pendiente", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  aprobada: { label: "Aprobada", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  rechazada: { label: "Rechazada", badge: "bg-red-100 text-red-800 border-red-300" },
};

export default function SolicitudesCambioAsesor({ solicitudes }: { solicitudes: any[] }) {
  const router = useRouter();
  const [activaId, setActivaId] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verDocumento = async (solicitudId: number) => {
    const res = await getDocumentoSupervisorSolicitud(solicitudId);
    if (res.success && res.url) openDocument(res.url, res.nombre);
    else alert(res.error || "No se pudo abrir el documento.");
  };

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const resueltas = solicitudes.filter((s) => s.estado !== "pendiente");

  const handleDecidir = async (id: number, decision: "aprobada" | "rechazada") => {
    setError(null);
    if (decision === "rechazada" && respuesta.trim().length < 5) {
      setError("Debe justificar el rechazo.");
      return;
    }
    setLoading(true);
    const res = await responderSolicitudCambioActividad(id, decision, respuesta.trim() || undefined);
    setLoading(false);
    if (res.success) {
      setActivaId(null);
      setRespuesta("");
      router.refresh();
    } else {
      setError(res.error || "No se pudo procesar la solicitud.");
    }
  };

  if (solicitudes.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-extrabold text-card-dark">Solicitudes de cambio al cronograma</h3>

      {pendientes.length === 0 ? (
        <p className="text-xs text-muted font-semibold">No hay solicitudes pendientes.</p>
      ) : (
        <div className="space-y-3">
          {pendientes.map((s) => {
            const estado = ESTADO_BADGE[s.estado] || ESTADO_BADGE.pendiente;
            const mueve = s.tipo === "posponer" || s.tipo === "reubicar";
            return (
              <div key={s.id} className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {TIPO_LABEL[s.tipo] || s.tipo}
                    {s.actividad && (
                      <span className="font-mono text-slate-500">
                        {" "}
                        — {s.actividad.codigo} ({s.actividad.titulo})
                      </span>
                    )}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>

                {mueve && s.actividad && (
                  <p className="text-[11px] text-slate-600 font-semibold">
                    De Mes {s.actividad.periodo}, Semana {s.actividad.semana} a Mes {s.periodoDestino}, Semana {s.semanaDestino}
                  </p>
                )}
                {s.tipo === "agregar" && (
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Destino: Mes {s.periodoDestino}, Semana {s.semanaDestino}
                  </p>
                )}
                {s.tipo === "reubicar" && (
                  <p className="text-[11px] text-slate-600 font-semibold">
                    {s.actividadIntercambio
                      ? `Intercambio: ${s.actividadIntercambio.codigo} (${s.actividadIntercambio.titulo}) pasará a la ubicación original.`
                      : "Sin intercambio: la actividad se agregará al final de la semana destino."}
                  </p>
                )}
                {(s.tipo === "agregar" || s.tipo === "modificar") && (
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <span className="font-bold">Título propuesto:</span> {s.tituloPropuesto}
                    </p>
                    <p>
                      <span className="font-bold">Descripción:</span> {s.descripcionPropuesta}
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-slate-700 font-medium">
                  <span className="font-bold">Justificación:</span> {s.justificacion}
                </p>
                {s.tieneDocumento ? (
                  <button
                    type="button"
                    onClick={() => verDocumento(s.id)}
                    className="text-[11px] font-bold text-slate-700 underline hover:text-brand-red"
                  >
                    Ver nota del supervisor empresarial{s.documentoSupervisorNombre ? ` (${s.documentoSupervisorNombre})` : ""}
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-500 font-semibold">Sin nota del supervisor empresarial adjunta.</p>
                )}

                {activaId === s.id ? (
                  <div className="space-y-2 pt-2 border-t border-blue-200">
                    {error && <p className="text-[11px] text-red-700 font-bold">{error}</p>}
                    <textarea
                      rows={2}
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                      placeholder="Respuesta o justificación (obligatoria si rechaza)."
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setActivaId(null);
                          setRespuesta("");
                          setError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleDecidir(s.id, "rechazada")}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold disabled:opacity-50"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        disabled={loading}
                        onClick={() => handleDecidir(s.id, "aprobada")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                      >
                        Confirmar aprobación
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setActivaId(s.id);
                        setError(null);
                      }}
                      className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
                    >
                      Revisar solicitud
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resueltas.length > 0 && (
        <details className="pt-2 border-t border-slate-100">
          <summary className="text-[11px] font-bold text-slate-500 cursor-pointer">
            Historial de solicitudes resueltas ({resueltas.length})
          </summary>
          <div className="space-y-2 mt-2">
            {resueltas.map((s) => {
              const estado = ESTADO_BADGE[s.estado] || ESTADO_BADGE.pendiente;
              return (
                <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    {TIPO_LABEL[s.tipo] || s.tipo}
                    {s.actividad && <span className="font-mono text-slate-500"> — {s.actividad.codigo}</span>}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
