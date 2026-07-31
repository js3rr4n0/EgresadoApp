"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  asignarAsesorCoordinador,
  responderSolicitudBajaCoordinador,
  responderAsignacionCoordinador,
} from "@/app/actions/coordinador";
import Link from "next/link";

interface PropuestaPendiente {
  id: number;
  numero: number;
  tipo: string;
  titulo: string;
  fechaAprobacion: Date | string | null;
  estudiantes: string;
  carrera: string;
  asesorAsignadoId: number | null;
  solicitudActual: {
    id: number;
    asesorId: number;
    asesorNombre: string;
    estado: string;
    justificacionRechazo: string | null;
    creadaEn: Date | string;
  } | null;
}

interface PropuestaAsignada {
  id: number;
  numero: number;
  tipo: string;
  titulo: string;
  asesorNombre: string;
  estudiantes: string;
  fechaInicio: string;
  fechaFin: string;
}

interface Asesor {
  id: number;
  nombreCompleto: string;
  correo: string;
}

interface SolicitudBaja {
  id: number;
  propuestaId: number;
  titulo: string;
  tipo: string;
  asesorNombre: string;
  estudianteNombre: string;
  motivo: string;
  estado: string;
  respuestaCoordinador: string | null;
  creadaEn: Date | string;
}

interface Props {
  pendientes: PropuestaPendiente[];
  asignadas: PropuestaAsignada[];
  asesores: Asesor[];
  solicitudesBaja: SolicitudBaja[];
}

export default function CoordinadorDashboardClient({
  pendientes,
  asignadas,
  asesores,
  solicitudesBaja,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pendientes" | "asignadas" | "bajas">("pendientes");

  // Modal para ver documento de la propuesta en 1 click sin recargar
  const [viewingDocPropuesta, setViewingDocPropuesta] = useState<PropuestaPendiente | null>(null);

  // Modal para asignar propuesta
  const [selectedPropuesta, setSelectedPropuesta] = useState<PropuestaPendiente | null>(null);
  const [selectedAsesorId, setSelectedAsesorId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Modal para ver rechazo de asesor
  const [viewingRejection, setViewingRejection] = useState<PropuestaPendiente | null>(null);

  // Modal para responder solicitud de baja
  const [selectedBaja, setSelectedBaja] = useState<SolicitudBaja | null>(null);
  const [respuestaBaja, setRespuestaBaja] = useState("");
  const [processingBaja, setProcessingBaja] = useState(false);

  const handleOpenAssignModal = (prop: PropuestaPendiente) => {
    setSelectedPropuesta(prop);
    setSelectedAsesorId("");
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropuesta || !selectedAsesorId) return;

    setAssigning(true);
    const res = await asignarAsesorCoordinador(
      selectedPropuesta.id,
      parseInt(selectedAsesorId)
    );
    setAssigning(false);

    if (res.success) {
      alert(res.message);
      setSelectedPropuesta(null);
      router.refresh();
    } else {
      alert(res.error || "Error al asignar la propuesta.");
    }
  };

  // Modal / Confirm para rechazar asignacion de Admin
  const [rejectingPropuesta, setRejectingPropuesta] = useState<PropuestaPendiente | null>(null);
  const [motivoRechazoAdmin, setMotivoRechazoAdmin] = useState("");
  const [processingAssignResp, setProcessingAssignResp] = useState(false);

  const handleAceptarAsignacion = async (prop: PropuestaPendiente) => {
    if (!confirm(`¿Está seguro que desea ACEPTAR coordinar la propuesta "${prop.titulo}"?`)) return;
    setProcessingAssignResp(true);
    const res = await responderAsignacionCoordinador(prop.id, true);
    setProcessingAssignResp(false);
    if (res.success) {
      alert(res.message);
      router.refresh();
    } else {
      alert(res.error || "Error al aceptar la propuesta.");
    }
  };

  const handleRechazarAsignacionSubmit = async () => {
    if (!rejectingPropuesta) return;
    setProcessingAssignResp(true);
    const res = await responderAsignacionCoordinador(rejectingPropuesta.id, false, motivoRechazoAdmin);
    setProcessingAssignResp(false);
    if (res.success) {
      alert(res.message);
      setRejectingPropuesta(null);
      setMotivoRechazoAdmin("");
      router.refresh();
    } else {
      alert(res.error || "Error al rechazar la asignación.");
    }
  };

  const handleResponderBaja = async (decision: "aprobada" | "rechazada") => {
    if (!selectedBaja) return;
    if (decision === "aprobada" && !confirm("¿Está seguro de que desea dar de baja (anular) esta propuesta? Esta acción no se puede deshacer.")) {
      return;
    }

    setProcessingBaja(true);
    const res = await responderSolicitudBajaCoordinador(
      selectedBaja.id,
      decision,
      respuestaBaja
    );
    setProcessingBaja(false);

    if (res.success) {
      alert(res.message);
      setSelectedBaja(null);
      setRespuestaBaja("");
      router.refresh();
    } else {
      alert(res.error || "Error al procesar la solicitud de baja.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-red via-red-800 to-rose-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-rose-800">
        <div className="max-w-4xl">
          <span className="px-3 py-1 bg-rose-950/60 rounded-full text-xs font-bold uppercase tracking-wider text-rose-200 border border-rose-700/50 mb-3 inline-block">
            Panel de Gestión Académica
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Coordinación de Trabajos de Graduación
          </h1>
          <p className="text-rose-100 text-sm mt-2 leading-relaxed">
            Asigna las propuestas aprobadas por administración a los asesores de tu facultad, realiza el seguimiento del progreso de los proyectos y gestiona solicitudes de baja.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-rose-700/60">
          <button
            onClick={() => setActiveTab("pendientes")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === "pendientes"
                ? "bg-white text-brand-red shadow-md scale-[1.02]"
                : "bg-rose-950/40 text-rose-100 hover:bg-rose-900/50"
            }`}
          >
            <span>Ver Solicitudes / Propuestas a Asignar</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-brand-red font-extrabold">
              {pendientes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("asignadas")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === "asignadas"
                ? "bg-white text-brand-red shadow-md scale-[1.02]"
                : "bg-rose-950/40 text-rose-100 hover:bg-rose-900/50"
            }`}
          >
            <span>Mis Propuestas Asignadas</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-brand-red font-extrabold">
              {asignadas.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("bajas")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === "bajas"
                ? "bg-white text-brand-red shadow-md scale-[1.02]"
                : "bg-rose-950/40 text-rose-100 hover:bg-rose-900/50"
            }`}
          >
            <span>Solicitudes de Baja</span>
            {solicitudesBaja.filter((s) => s.estado === "pendiente").length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400 text-slate-900 font-extrabold animate-pulse">
                {solicitudesBaja.filter((s) => s.estado === "pendiente").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ────────────────── TAB 1: PENDIENTES DE ASIGNAR ────────────────── */}
      {activeTab === "pendientes" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Propuestas Listas para Asignar</h2>
            <p className="text-slate-500 text-sm">
              Propuestas asignadas por administración para ser entregadas a los asesores de facultad.
            </p>
          </div>

          {pendientes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-600 font-semibold">No hay propuestas pendientes de asignación</p>
              <p className="text-xs text-slate-400 mt-1">Cuando el administrador te asigne una propuesta aparecerá en esta lista.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 rounded-tl-lg">Fecha Aprobación</th>
                    <th className="p-4">Modalidad</th>
                    <th className="p-4">Estudiante / Equipo</th>
                    <th className="p-4">Título de la Propuesta</th>
                    <th className="p-4 text-center">PDF Propuesta</th>
                    <th className="p-4 text-center">Estado Asesoría</th>
                    <th className="p-4 text-right rounded-tr-lg">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendientes.map((prop) => {
                    const fechaStr = prop.fechaAprobacion
                      ? new Date(prop.fechaAprobacion).toLocaleDateString("es-SV", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A";

                    return (
                      <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">
                          {fechaStr}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-rose-50 text-brand-red border border-rose-200">
                            {prop.tipo}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-900 max-w-[220px]">
                          {prop.estudiantes}
                          <span className="block text-xs font-normal text-slate-500">{prop.carrera}</span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 max-w-[280px]">
                          {prop.titulo}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingDocPropuesta(prop)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-brand-red text-xs font-bold rounded-lg border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Ver Documento
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          {prop.solicitudActual ? (
                            prop.solicitudActual.estado === "pendiente" ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Esperando a: {prop.solicitudActual.asesorNombre}
                              </span>
                            ) : prop.solicitudActual.estado === "rechazada" ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  Rechazada por: {prop.solicitudActual.asesorNombre}
                                </span>
                                <button
                                  onClick={() => setViewingRejection(prop)}
                                  className="text-[11px] text-rose-600 underline font-semibold hover:text-rose-800"
                                >
                                  Ver motivo rechazo
                                </button>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Aceptada por: {prop.solicitudActual.asesorNombre}
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">
                              Sin enviar
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAceptarAsignacion(prop)}
                              disabled={processingAssignResp}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1"
                              title="Aceptar coordinar esta propuesta"
                            >
                              ✓ Aceptar
                            </button>
                            <button
                              onClick={() => {
                                setRejectingPropuesta(prop);
                                setMotivoRechazoAdmin("");
                              }}
                              disabled={processingAssignResp}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1"
                              title="Rechazar asignación y devolver a Pendiente de Revisión"
                            >
                              ✕ Rechazar
                            </button>
                            <button
                              onClick={() => handleOpenAssignModal(prop)}
                              className="px-3.5 py-1.5 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                              {prop.solicitudActual?.estado === "rechazada" ? "Reasignar Asesor" : "Asignar Asesor"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 2: MIS PROPUESTAS ASIGNADAS ────────────────── */}
      {activeTab === "asignadas" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Mis Propuestas Asignadas</h2>
            <p className="text-slate-500 text-sm">
              Listado de proyectos en desarrollo cuyos asesores aceptaron la solicitud de seguimiento.
            </p>
          </div>

          {asignadas.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-600 font-semibold">Aún no tienes propuestas asignadas activas</p>
              <p className="text-xs text-slate-400 mt-1">
                Cuando el coordinador o asesor acepte la solicitud en &quot;VER SOLICITUDES DE PROPUESTA&quot;, aparecerá en esta tabla.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 rounded-tl-lg">Asesor</th>
                    <th className="p-4">Estudiante/s</th>
                    <th className="p-4">Título</th>
                    <th className="p-4">Modalidad</th>
                    <th className="p-4">Fecha de inicio</th>
                    <th className="p-4">Fecha de Fin</th>
                    <th className="p-4 text-right rounded-tr-lg">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignadas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {item.asesorNombre}
                      </td>
                      <td className="p-4 font-medium text-slate-800 max-w-[200px]">
                        {item.estudiantes}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 max-w-[260px]">
                        {item.titulo}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.tipo}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-600 whitespace-nowrap">
                        {item.fechaInicio}
                      </td>
                      <td className="p-4 font-medium text-slate-600 whitespace-nowrap">
                        {item.fechaFin}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/coordinador/propuestas/${item.id}`}
                          className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
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
      )}

      {/* ────────────────── TAB 3: SOLICITUDES DE BAJA DE PROYECTO ────────────────── */}
      {activeTab === "bajas" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Solicitudes de Baja de Proyectos</h2>
            <p className="text-slate-500 text-sm">
              Peticiones enviadas por los asesores para anular/dar de baja un proceso activo debido a motivos de fuerza mayor.
            </p>
          </div>

          {solicitudesBaja.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-slate-600 font-semibold">No hay solicitudes de baja registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 rounded-tl-lg">Fecha</th>
                    <th className="p-4">Propuesta / Título</th>
                    <th className="p-4">Asesor Solicitante</th>
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Motivo de Baja</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right rounded-tr-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {solicitudesBaja.map((baja) => {
                    const fechaStr = new Date(baja.creadaEn).toLocaleDateString("es-SV", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <tr key={baja.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-600 whitespace-nowrap">{fechaStr}</td>
                        <td className="p-4 font-bold text-slate-900 max-w-[220px]">{baja.titulo}</td>
                        <td className="p-4 font-medium text-slate-800">{baja.asesorNombre}</td>
                        <td className="p-4 font-medium text-slate-800">{baja.estudianteNombre}</td>
                        <td className="p-4 font-medium text-rose-700 max-w-[280px] leading-relaxed">{baja.motivo}</td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              baja.estado === "pendiente"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : baja.estado === "aprobada"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-slate-100 text-slate-600 border border-slate-300"
                            }`}
                          >
                            {baja.estado === "pendiente"
                              ? "Pendiente Revisión"
                              : baja.estado === "aprobada"
                              ? "Dada de Baja (Anulada)"
                              : "Rechazada"}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {baja.estado === "pendiente" ? (
                            <button
                              onClick={() => setSelectedBaja(baja)}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                            >
                              Evaluar Baja
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Procesada</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── MODAL: VER DOCUMENTO EN 1 CLICK SIN RECARGAR ────────────────── */}
      {viewingDocPropuesta && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-brand-red text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  📄
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Documento Oficial - Propuesta #{viewingDocPropuesta.numero}
                  </h3>
                  <p className="text-xs text-white/80 truncate max-w-md">
                    {viewingDocPropuesta.titulo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/coordinador/propuestas/${viewingDocPropuesta.id}/imprimir`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Nueva Pestaña
                </a>
                <button
                  onClick={() => setViewingDocPropuesta(null)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold text-sm"
                  title="Cerrar Documento"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body iframe */}
            <div className="flex-1 w-full bg-slate-100 relative">
              <iframe
                src={`/coordinador/propuestas/${viewingDocPropuesta.id}/imprimir`}
                className="w-full h-full border-none"
                title={`Documento Propuesta ${viewingDocPropuesta.id}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: ASIGNAR ASESOR ────────────────── */}
      {selectedPropuesta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Asignar Asesor a la Propuesta
              </h3>
              <button
                onClick={() => setSelectedPropuesta(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Título de la Propuesta:</p>
              <p className="text-sm font-bold text-slate-900">{selectedPropuesta.titulo}</p>
              <p className="text-xs text-slate-600">
                <strong>Estudiante(s):</strong> {selectedPropuesta.estudiantes}
              </p>
              <p className="text-xs text-slate-600">
                <strong>Modalidad:</strong> {selectedPropuesta.tipo.toUpperCase()}
              </p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  Seleccionar Asesor de Facultad:
                </label>
                <select
                  required
                  value={selectedAsesorId}
                  onChange={(e) => setSelectedAsesorId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red bg-white"
                >
                  <option value="">-- Elige un asesor --</option>
                  {asesores.map((ase) => (
                    <option key={ase.id} value={ase.id}>
                      {ase.nombreCompleto} ({ase.correo})
                    </option>
                  ))}
                </select>
                {asesores.length === 0 && (
                  <p className="text-xs text-rose-600 mt-1.5">
                    No se encontraron asesores registrados para esta facultad.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPropuesta(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedAsesorId}
                  className="px-5 py-2 bg-brand-red hover:bg-brand-red-dark disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {assigning ? "Enviando..." : "Enviar Solicitud a Asesor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: MOTIVO DE RECHAZO DE ASESOR ────────────────── */}
      {viewingRejection && viewingRejection.solicitudActual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Motivo del Rechazo de Asesoría
            </h3>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
              <p className="text-xs font-bold text-rose-900">
                Asesor: {viewingRejection.solicitudActual.asesorNombre}
              </p>
              <p className="text-xs text-rose-700">
                <strong>Propuesta:</strong> {viewingRejection.titulo}
              </p>
              <div className="pt-2 border-t border-rose-200 text-sm text-rose-950 font-medium italic">
                &ldquo;{viewingRejection.solicitudActual.justificacionRechazo || "Sin justificación provista."}&rdquo;
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingRejection(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const prop = viewingRejection;
                  setViewingRejection(null);
                  handleOpenAssignModal(prop);
                }}
                className="px-4 py-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Reasignar a otro Asesor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: RESPONDER SOLICITUD DE BAJA ────────────────── */}
      {selectedBaja && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <h3 className="text-lg font-bold text-slate-900">Evaluar Solicitud de Baja del Proyecto</h3>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
              <p><strong>Propuesta:</strong> {selectedBaja.titulo}</p>
              <p><strong>Asesor Solicitante:</strong> {selectedBaja.asesorNombre}</p>
              <p><strong>Estudiante:</strong> {selectedBaja.estudianteNombre}</p>
              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-rose-700 mb-1">Motivo expuesto por el asesor:</p>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 italic">{selectedBaja.motivo}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observaciones / Comentario de Respuesta (Opcional):
              </label>
              <textarea
                value={respuestaBaja}
                onChange={(e) => setRespuestaBaja(e.target.value)}
                rows={3}
                placeholder="Escribe comentarios o motivos institucionales para el historial..."
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBaja(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingBaja}
                onClick={() => handleResponderBaja("rechazada")}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
              >
                Rechazar Baja
              </button>
              <button
                type="button"
                disabled={processingBaja}
                onClick={() => handleResponderBaja("aprobada")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                {processingBaja ? "Procesando..." : "Dar de Baja (Anular Proyecto)"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ────────────────── MODAL: RECHAZAR ASIGNACIÓN DE ADMIN ────────────────── */}
      {rejectingPropuesta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Rechazar Asignación de Propuesta
            </h3>
            <p className="text-xs text-slate-600">
              Al rechazar la propuesta &quot;{rejectingPropuesta.titulo}&quot;, esta regresará automáticamente a <strong>Pendiente de Revisión</strong> en la vista del Administrador y se registrará en el historial.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo del rechazo / observaciones (Opcional):
              </label>
              <textarea
                value={motivoRechazoAdmin}
                onChange={(e) => setMotivoRechazoAdmin(e.target.value)}
                rows={3}
                placeholder="Indique los motivos por los cuales no puede coordinar la propuesta..."
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPropuesta(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingAssignResp}
                onClick={handleRechazarAsignacionSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                {processingAssignResp ? "Procesando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
