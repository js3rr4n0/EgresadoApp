"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  responderSolicitudCambioActividad,
  getDocumentoSupervisorSolicitud,
  type getSolicitudesCambioAsesor,
} from "@/app/actions/cambiosActividad";
import { openDocument } from "@/lib/pdfViewer";

const TIPO_LABEL: Record<string, string> = {
  agregar: "Agregar actividad nueva",
  modificar: "Modificar actividad existente",
  eliminar: "Eliminar actividad",
  posponer: "Posponer actividad",
  reubicar: "Intercambiar / reubicar actividad",
};

const ESTADO_BADGE: Record<string, { label: string; badge: string; tarjeta: string }> = {
  pendiente: { label: "Pendiente", badge: "bg-blue-100 text-blue-800 border-blue-300", tarjeta: "border-blue-200 bg-blue-50/50" },
  aprobada: { label: "Aprobada", badge: "bg-emerald-100 text-emerald-900 border-emerald-300", tarjeta: "border-slate-200 bg-white" },
  rechazada: { label: "Rechazada", badge: "bg-red-100 text-red-800 border-red-300", tarjeta: "border-slate-200 bg-white" },
};

type Solicitud = NonNullable<Extract<Awaited<ReturnType<typeof getSolicitudesCambioAsesor>>, { solicitudes: unknown }>["solicitudes"]>[number];

type Filtro = "pendiente" | "aprobada" | "rechazada" | "todas";

function formatFecha(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", year: "numeric", month: "short", day: "numeric" });
}

/**
 * Solicitudes de cambio al cronograma del estudiante: las pendientes para resolver y el historial completo (aprobadas y
 * rechazadas), con la fecha de la solicitud, la decisión y la respuesta del asesor.
 */
export default function SolicitudesCambioAsesor({ solicitudes }: { solicitudes: Solicitud[] }) {
  const router = useRouter();
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const [filtro, setFiltro] = useState<Filtro>(pendientes.length > 0 ? "pendiente" : "todas");
  const [activaId, setActivaId] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verDocumento = async (solicitudId: number) => {
    const res = await getDocumentoSupervisorSolicitud(solicitudId);
    if (res.success && res.url) openDocument(res.url, res.nombre);
    else setError(res.error || "No se pudo abrir el documento.");
  };

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

  const conteo = (estado: Filtro) => (estado === "todas" ? solicitudes.length : solicitudes.filter((s) => s.estado === estado).length);
  const pestanas: { id: Filtro; label: string }[] = [
    { id: "pendiente", label: "Pendientes" },
    { id: "aprobada", label: "Aprobadas" },
    { id: "rechazada", label: "Rechazadas" },
    { id: "todas", label: "Todas" },
  ];
  const lista = filtro === "todas" ? solicitudes : solicitudes.filter((s) => s.estado === filtro);

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-card-dark">Solicitudes de cambio al cronograma</h3>
          <p className="text-[11px] text-muted font-semibold mt-0.5">
            Cada solicitud incluye la justificación del estudiante y la nota del supervisor empresarial. Las resueltas quedan en el
            historial.
          </p>
        </div>
        {pendientes.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 bg-red-50 text-unicaes border-red-200">
            {pendientes.length} por resolver
          </span>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <p className="text-xs text-muted font-semibold">El estudiante no ha solicitado cambios al cronograma.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist">
            {pestanas.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={filtro === p.id}
                onClick={() => setFiltro(p.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  filtro === p.id ? "bg-unicaes text-white border-unicaes" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label} <span className={filtro === p.id ? "opacity-80" : "text-slate-400"}>{conteo(p.id)}</span>
              </button>
            ))}
          </div>

          {error && <p className="text-[11px] text-red-700 font-bold">{error}</p>}

          {lista.length === 0 ? (
            <p className="text-xs text-muted font-semibold">No hay solicitudes en esta categoría.</p>
          ) : (
            <ul className="space-y-3">
              {lista.map((s) => {
                const estado = ESTADO_BADGE[s.estado] || ESTADO_BADGE.pendiente;
                const pendiente = s.estado === "pendiente";
                const destino = s.periodoDestino && s.semanaDestino ? `Período ${s.periodoDestino}, Subperíodo ${s.semanaDestino}` : null;
                return (
                  <li key={s.id} className={`rounded-xl border p-4 space-y-3 ${estado.tarjeta}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900">{TIPO_LABEL[s.tipo] || s.tipo}</p>
                        {s.actividad && (
                          <p className="text-xs text-slate-700 font-semibold mt-0.5">
                            <span className="font-mono font-bold text-unicaes">{s.actividad.codigo}</span> {s.actividad.titulo}
                          </p>
                        )}
                        {s.tipo === "agregar" && s.tituloPropuesto && (
                          <p className="text-xs text-slate-700 font-semibold mt-0.5">{s.tituloPropuesto}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${estado.badge}`}>
                        {estado.label}
                      </span>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                      {pendiente && (s.tipo === "posponer" || s.tipo === "reubicar") && s.actividad && (
                        <div>
                          <dt className="font-bold uppercase text-[10px] text-slate-400">Ubicación actual</dt>
                          <dd className="font-semibold text-slate-700">
                            Período {s.actividad.periodo}, Subperíodo {s.actividad.semana}
                          </dd>
                        </div>
                      )}
                      {destino && (
                        <div>
                          <dt className="font-bold uppercase text-[10px] text-slate-400">Destino</dt>
                          <dd className="font-semibold text-slate-700">{destino}</dd>
                        </div>
                      )}
                      {s.tipo === "reubicar" && (
                        <div className="sm:col-span-2">
                          <dt className="font-bold uppercase text-[10px] text-slate-400">Intercambio</dt>
                          <dd className="font-semibold text-slate-700">
                            {s.actividadIntercambio
                              ? `${s.actividadIntercambio.codigo} (${s.actividadIntercambio.titulo}) pasa a la ubicación original.`
                              : "Sin intercambio: la actividad se agrega al final del subperíodo destino."}
                          </dd>
                        </div>
                      )}
                      {(s.tipo === "agregar" || s.tipo === "modificar") && s.descripcionPropuesta && (
                        <div className="sm:col-span-2">
                          <dt className="font-bold uppercase text-[10px] text-slate-400">Descripción propuesta</dt>
                          <dd className="font-medium text-slate-700">{s.descripcionPropuesta}</dd>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <dt className="font-bold uppercase text-[10px] text-slate-400">Justificación del estudiante</dt>
                        <dd className="font-medium text-slate-700">{s.justificacion}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500 font-semibold">
                        Solicitada el {formatFecha(s.creadaEn)}
                        {!pendiente && s.revisadoEn && ` · ${estado.label} el ${formatFecha(s.revisadoEn)}`}
                      </span>
                      {s.tieneDocumento ? (
                        <button type="button" onClick={() => verDocumento(s.id)} className="font-bold text-slate-700 underline hover:text-unicaes">
                          Ver nota del supervisor{s.documentoSupervisorNombre ? ` (${s.documentoSupervisorNombre})` : ""}
                        </button>
                      ) : (
                        <span className="text-slate-500 font-semibold">Sin nota del supervisor adjunta</span>
                      )}
                    </div>

                    {!pendiente && s.respuestaAsesor && (
                      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                        <p className="text-[10px] font-extrabold uppercase text-slate-500">Su respuesta</p>
                        <p className="text-[11px] text-slate-700 font-medium whitespace-pre-wrap">{s.respuestaAsesor}</p>
                      </div>
                    )}

                    {pendiente &&
                      (activaId === s.id ? (
                        <div className="space-y-2 pt-2 border-t border-blue-200">
                          <textarea
                            rows={2}
                            value={respuesta}
                            onChange={(e) => setRespuesta(e.target.value)}
                            placeholder="Respuesta o justificación (obligatoria si rechaza)."
                            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none"
                          />
                          <div className="flex flex-wrap gap-2 justify-end">
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
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setActivaId(s.id);
                              setError(null);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-bold"
                          >
                            Revisar solicitud
                          </button>
                        </div>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
