"use client";

import { useState } from "react";
import { responderSolicitudAsesor } from "@/app/actions/asesor";
import Link from "next/link";

interface AsesorDashboardClientProps {
  initialPropuestas: any[];
  initialSolicitudes: any[];
}

export default function AsesorDashboardClient({
  initialPropuestas,
  initialSolicitudes,
}: AsesorDashboardClientProps) {
  const [propuestas, setPropuestas] = useState<any[]>(initialPropuestas);
  const [solicitudes, setSolicitudes] = useState<any[]>(initialSolicitudes);

  // Solicitudes modal / view state
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  // Confirmations state
  const [activeSolicitud, setActiveSolicitud] = useState<any | null>(null);
  const [confirmMode, setConfirmMode] = useState<"aceptar" | "rechazar" | null>(null);
  
  // Step 2 for rejection: mandatory justification
  const [showJustificacionStep, setShowJustificacionStep] = useState(false);
  const [justificacionText, setJustificacionText] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Handlers for Acceptance Flow
  // -------------------------------------------------------------
  const handleStartAceptar = (solicitud: any) => {
    setActiveSolicitud(solicitud);
    setConfirmMode("aceptar");
    setShowJustificacionStep(false);
    setErrorMessage(null);
  };

  const handleConfirmAceptar = async () => {
    if (!activeSolicitud) return;
    setLoadingAction(true);
    setErrorMessage(null);

    const res = await responderSolicitudAsesor(activeSolicitud.id, "aceptada");
    setLoadingAction(false);

    if (res.success) {
      // Remove from pending solicitudes
      setSolicitudes((prev) => prev.filter((s) => s.id !== activeSolicitud.id));
      // Reset confirm modals
      setActiveSolicitud(null);
      setConfirmMode(null);
      alert("¡Has aceptado asesorar la propuesta exitosamente!");
      window.location.reload();
    } else {
      setErrorMessage(res.error || "Error al aceptar la solicitud.");
    }
  };

  // -------------------------------------------------------------
  // Handlers for Rejection Flow
  // -------------------------------------------------------------
  const handleStartRechazar = (solicitud: any) => {
    setActiveSolicitud(solicitud);
    setConfirmMode("rechazar");
    setShowJustificacionStep(false);
    setJustificacionText("");
    setErrorMessage(null);
  };

  const handleConfirmRechazarStep1 = () => {
    // Advisor confirmed they want to reject -> Show mandatory justification box (Step 2)
    setShowJustificacionStep(true);
  };

  const handleSendRechazo = async () => {
    if (!justificacionText.trim()) {
      setErrorMessage("La justificación es obligatoria para rechazar.");
      return;
    }

    if (!activeSolicitud) return;
    setLoadingAction(true);
    setErrorMessage(null);

    const res = await responderSolicitudAsesor(
      activeSolicitud.id,
      "rechazada",
      justificacionText
    );
    setLoadingAction(false);

    if (res.success) {
      // Remove from pending solicitudes
      setSolicitudes((prev) => prev.filter((s) => s.id !== activeSolicitud.id));
      setActiveSolicitud(null);
      setConfirmMode(null);
      setShowJustificacionStep(false);
      setJustificacionText("");
      alert("Se ha registrado la respuesta y la justificación de rechazo.");
      window.location.reload();
    } else {
      setErrorMessage(res.error || "Error al rechazar la solicitud.");
    }
  };

  const getTipoLabel = (tipo: string) => {
    if (tipo === "pasantia") return "Pasantía";
    if (tipo === "proyecto") return "Proyecto Específico";
    return "Investigación";
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-card-dark tracking-tight">
            Inicio - Panel de Asesor
          </h1>
          <p className="text-muted text-sm mt-1">
            Gestiona y brinda seguimiento a las propuestas de egresados asignados.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Solicitudes Pendientes Counter / Trigger Button */}
          <button
            onClick={() => setShowSolicitudesModal(true)}
            className={`relative flex-1 md:flex-none flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
              solicitudes.length > 0
                ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
            </svg>
            <span>VER SOLICITUDES DE PROPUESTA</span>
            {solicitudes.length > 0 && (
              <span className="bg-white text-amber-600 font-extrabold text-xs px-2 py-0.5 rounded-full border border-amber-200">
                {solicitudes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pending Solicitudes Banner Alert (If any exist) */}
      {solicitudes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                🔔
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900">
                  Tiene {solicitudes.length} solicitud{solicitudes.length > 1 ? "es" : ""} de propuesta asignada{solicitudes.length > 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-amber-700">
                  Por favor revise y responda si está dispuesto a asesorar estas propuestas.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSolicitudesModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Atender Solicitudes
            </button>
          </div>
        </div>
      )}

      {/* Main Section: Tabla "Mis propuestas" */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-card-dark flex items-center gap-2">
              <span>Mis propuestas</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                {propuestas.length}
              </span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Propuestas que has aceptado asesorar y de las cuales llevas seguimiento.
            </p>
          </div>
        </div>

        {propuestas.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
            <svg className="w-12 h-12 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">No tienes propuestas aceptadas por el momento.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cuando el administrador te asigne una propuesta y aceptes la solicitud en "VER SOLICITUDES DE PROPUESTA", aparecerá en esta tabla.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-slate-600 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Estudiante</th>
                  <th className="py-3.5 px-4">Carnet</th>
                  <th className="py-3.5 px-4">Carrera</th>
                  <th className="py-3.5 px-4">Tipo Propuesta</th>
                  <th className="py-3.5 px-4">Empresa / Detalle</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {propuestas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-card-dark">
                      {p.estudiante.nombreCompleto}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600">
                      {p.estudiante.carnet}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {p.estudiante.carrera}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                        {getTipoLabel(p.tipo)} #{p.numero}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {p.empresa ? p.empresa.nombre : "Sin empresa asignada"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Link
                        href={`/asesor/propuestas/${p.id}`}
                        className="inline-flex items-center gap-1.5 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Progreso
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: VER SOLICITUDES DE PROPUESTA */}
      {/* ------------------------------------------------------------- */}
      {showSolicitudesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-border my-8">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-card-dark flex items-center gap-2">
                  <span>Solicitudes de Asesoría de Propuesta</span>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                    {solicitudes.length} pendiente{solicitudes.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Revisa las propuestas que te han sido asignadas y decide si deseas asesorarlas.
                </p>
              </div>
              <button
                onClick={() => setShowSolicitudesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {solicitudes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 space-y-2">
                <p className="font-semibold text-sm">No tienes solicitudes pendientes de respuesta.</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                {solicitudes.map((sol) => (
                  <div
                    key={sol.id}
                    className="border border-border rounded-xl p-5 bg-slate-50 space-y-4 shadow-sm hover:border-amber-300 transition-colors"
                  >
                    {/* Mensaje obligatorio requerido por el usuario */}
                    <div className="bg-white border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs">
                      <p className="text-sm text-card-dark font-medium leading-relaxed">
                        “Se ha asignado una propuesta de <span className="font-bold text-amber-900">{getTipoLabel(sol.tipo)}</span> de parte del estudiante <span className="font-bold text-card-dark">{sol.estudiante.nombreCompleto}</span> con carnet <span className="font-mono font-bold text-slate-800">{sol.estudiante.carnet}</span>, ¿estaría dispuesto a asesorar?”
                      </p>
                    </div>

                    {/* PDF / Document preview action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div>
                        {sol.cartaUrl ? (
                          <button
                            onClick={() => setSelectedPdfUrl(sol.cartaUrl)}
                            className="inline-flex items-center gap-2 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-3 py-2 rounded-lg border border-purple-200 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Ver PDF de la Propuesta / Carta de Aceptación
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Documento PDF pendiente de subida por el egresado
                          </span>
                        )}
                      </div>

                      {/* SI / NO Buttons */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStartAceptar(sol)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          ✓ SI
                        </button>
                        <button
                          onClick={() => handleStartRechazar(sol)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          ✕ NO
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={() => setShowSolicitudesModal(false)}
                className="px-5 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMACIÓN: PRESIONÓ "SI" */}
      {/* ------------------------------------------------------------- */}
      {confirmMode === "aceptar" && activeSolicitud && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-lg">
                ✓
              </div>
              <h3 className="text-lg font-bold text-card-dark">Confirmación de Aceptación</h3>
            </div>

            <p className="text-sm text-slate-600">
              ¿Está seguro que acepta asesorar la propuesta de <span className="font-bold text-card-dark">{activeSolicitud.estudiante.nombreCompleto}</span>?
            </p>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                disabled={loadingAction}
                onClick={() => {
                  setConfirmMode(null);
                  setActiveSolicitud(null);
                }}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                NO (Cancelar)
              </button>
              <button
                disabled={loadingAction}
                onClick={handleConfirmAceptar}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loadingAction ? "Guardando..." : "SI (Aceptar Propuesta)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMACIÓN: PRESIONÓ "NO" (PASO 1 & PASO 2) */}
      {/* ------------------------------------------------------------- */}
      {confirmMode === "rechazar" && activeSolicitud && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-border">
            {!showJustificacionStep ? (
              // PASO 1: Confirmar intención de rechazo
              <>
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-lg">
                    ⚠️
                  </div>
                  <h3 className="text-lg font-bold text-card-dark">Confirmación de Rechazo</h3>
                </div>

                <p className="text-sm text-slate-600">
                  ¿Está seguro que no acepta asesorar esta propuesta del estudiante <span className="font-bold text-card-dark">{activeSolicitud.estudiante.nombreCompleto}</span>?
                </p>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setConfirmMode(null);
                      setActiveSolicitud(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    NO (Regresar)
                  </button>
                  <button
                    onClick={handleConfirmRechazarStep1}
                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                  >
                    SI (Continuar)
                  </button>
                </div>
              </>
            ) : (
              // PASO 2: Justificación OBLIGATORIA + Botón Enviar
              <>
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center font-bold text-lg">
                    📝
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-card-dark">Justificación de Rechazo</h3>
                    <p className="text-xs text-muted">Escriba obligatoriamente el motivo.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Justificación <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={justificacionText}
                    onChange={(e) => setJustificacionText(e.target.value)}
                    placeholder="Escriba detalladamente por qué no acepta asesorar esta propuesta..."
                    className="w-full p-3 rounded-lg border border-border text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                    {errorMessage}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    disabled={loadingAction}
                    onClick={() => {
                      setShowJustificacionStep(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={loadingAction || !justificacionText.trim()}
                    onClick={handleSendRechazo}
                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingAction ? "Enviando..." : "Enviar Justificación"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VISOR MODAL DE ARCHIVO PDF */}
      {/* ------------------------------------------------------------- */}
      {selectedPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4">
          <div className="flex justify-between items-center text-white pb-3 px-2">
            <h3 className="font-bold text-sm">Vista Previa de Propuesta PDF</h3>
            <button
              onClick={() => setSelectedPdfUrl(null)}
              className="text-white hover:text-slate-300 font-bold text-lg"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="flex-1 w-full bg-white rounded-xl overflow-hidden">
            <iframe
              src={selectedPdfUrl}
              className="w-full h-full border-none"
              title="PDF Propuesta"
            />
          </div>
        </div>
      )}
    </div>
  );
}
