"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  asignarAsesorCoordinador,
  responderSolicitudBajaCoordinador,
  responderAsignacionCoordinador,
  getDetallePropuestaCoordinador,
} from "@/app/actions/coordinador";
import Link from "next/link";
import DocumentosPropuestaSection from "@/components/coordinador/DocumentosPropuestaSection";

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
  isAdmin?: boolean;
  usuario?: {
    id: number;
    nombreCompleto: string;
    correo: string;
    rol: string;
  } | null;
}

export default function CoordinadorDashboardClient({
  pendientes,
  asignadas,
  asesores,
  solicitudesBaja,
  isAdmin = false,
  usuario,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pendientes" | "asignadas" | "bajas">("pendientes");

  // Modal para ver documento y revisión completa de la propuesta
  const [viewingDocPropuesta, setViewingDocPropuesta] = useState<PropuestaPendiente | null>(null);
  const [docDetails, setDocDetails] = useState<any>(null);
  const [loadingDocDetails, setLoadingDocDetails] = useState(false);
  const [modalTab, setModalTab] = useState<"docs" | "pdf" | "info" | "historial">("docs");
  const [canApproveModal, setCanApproveModal] = useState(false);

  useEffect(() => {
    if (viewingDocPropuesta) {
      setLoadingDocDetails(true);
      setDocDetails(null);
      setModalTab("docs");
      setCanApproveModal(false);
      getDetallePropuestaCoordinador(viewingDocPropuesta.id).then((res) => {
        if (res && res.success && res.data) {
          setDocDetails(res.data);
        }
        setLoadingDocDetails(false);
      });
    }
  }, [viewingDocPropuesta]);

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

    if (res && res.success) {
      alert(res.message);
      setSelectedPropuesta(null);
      router.refresh();
    } else {
      alert(res?.error || "Error al asignar la propuesta.");
    }
  };

  // Modal / Confirm para rechazar asignación de Admin
  const [rejectingPropuesta, setRejectingPropuesta] = useState<PropuestaPendiente | null>(null);
  const [motivoRechazoAdmin, setMotivoRechazoAdmin] = useState("");
  const [processingAssignResp, setProcessingAssignResp] = useState(false);

  const handleAceptarAsignacion = async (prop: PropuestaPendiente) => {
    if (!confirm(`¿Está seguro que desea ACEPTAR coordinar la propuesta "${prop.titulo}"?`)) return;
    setProcessingAssignResp(true);
    const res = await responderAsignacionCoordinador(prop.id, true);
    setProcessingAssignResp(false);
    if (res && res.success) {
      alert(res.message);
      router.refresh();
    } else {
      alert(res?.error || "Error al aceptar la propuesta.");
    }
  };

  const handleRechazarAsignacionSubmit = async () => {
    if (!rejectingPropuesta) return;
    setProcessingAssignResp(true);
    const res = await responderAsignacionCoordinador(rejectingPropuesta.id, false, motivoRechazoAdmin);
    setProcessingAssignResp(false);
    if (res && res.success) {
      alert(res.message);
      setRejectingPropuesta(null);
      setMotivoRechazoAdmin("");
      router.refresh();
    } else {
      alert(res?.error || "Error al rechazar la asignación.");
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

    if (res && res.success) {
      alert(res.message);
      setSelectedBaja(null);
      setRespuestaBaja("");
      router.refresh();
    } else {
      alert(res?.error || "Error al procesar la solicitud de baja.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner de Identidad del Usuario Logueado */}
      {usuario && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
              {usuario.nombreCompleto ? usuario.nombreCompleto.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-sm text-white">{usuario.nombreCompleto}</p>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-extrabold px-2 py-0.5 rounded-full border border-rose-500/30">
                  {usuario.rol.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">{usuario.correo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full font-bold text-xs border border-amber-500/40">
                🛡️ Modo Administrador Activo
              </span>
            )}
            <Link
              href={isAdmin ? "/admin" : "/coordinador"}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              Recargar Estado
            </Link>
          </div>
        </div>
      )}

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
                    <th className="p-4 text-center">Documentos & PDF</th>
                    <th className="p-4 text-center">Estado Asesoría</th>
                    <th className="p-4 text-right rounded-tr-lg">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendientes.map((prop) => {
                    let fechaStr = "N/A";
                    if (prop.fechaAprobacion) {
                      try {
                        const d = new Date(prop.fechaAprobacion);
                        if (!isNaN(d.getTime())) {
                          fechaStr = d.toLocaleDateString("es-SV", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        }
                      } catch (e) {}
                    }

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
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setViewingDocPropuesta(prop)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-brand-red text-xs font-bold rounded-lg border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              📄 Ver Documentos
                            </button>
                            <Link
                              href={`/coordinador/propuestas/${prop.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-all"
                              title="Abrir vista completa en nueva página"
                            >
                              ↗ Página
                            </Link>
                          </div>
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
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => setViewingDocPropuesta(prop)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Revisar detalles y documentos de validación"
                            >
                              📄 Revisar / Docs
                            </button>

                            {(!prop.solicitudActual || prop.solicitudActual.estado === "rechazada") && !prop.asesorAsignadoId && (
                              <button
                                onClick={() => handleOpenAssignModal(prop)}
                                className="px-3.5 py-1.5 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                {prop.solicitudActual?.estado === "rechazada" ? "Reasignar Asesor" : "Asignar Asesor"}
                              </button>
                            )}

                            <a
                              href={`/admin/propuestas/${prop.id}/imprimir?ganttOnly=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Exportar solo Diagrama de Gantt (PDF 1 pág)"
                            >
                              📊 Gantt
                            </a>
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
            <h2 className="text-xl font-bold text-slate-900">Propuestas en Desarrollo (Asesor Asignado)</h2>
            <p className="text-slate-500 text-sm">
              Proyectos cuyo asesor ha sido aceptado y están en fase activa de ejecución.
            </p>
          </div>

          {asignadas.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-slate-600 font-semibold">No hay propuestas asignadas activas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 rounded-tl-lg">Propuesta / Título</th>
                    <th className="p-4">Estudiante / Equipo</th>
                    <th className="p-4">Asesor Asignado</th>
                    <th className="p-4">Modalidad</th>
                    <th className="p-4">Inicio</th>
                    <th className="p-4">Fin Est.</th>
                    <th className="p-4 text-right rounded-tr-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {asignadas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 max-w-[240px]">
                        {item.titulo}
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {item.estudiantes}
                      </td>
                      <td className="p-4 font-bold text-brand-red">
                        {item.asesorNombre}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-rose-50 text-brand-red border border-rose-200">
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setViewingDocPropuesta({
                                id: item.id,
                                numero: item.numero,
                                tipo: item.tipo,
                                titulo: item.titulo,
                                fechaAprobacion: null,
                                estudiantes: item.estudiantes,
                                carrera: "",
                                asesorAsignadoId: null,
                                solicitudActual: null,
                              })
                            }
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                          >
                            📄 Docs / Modal
                          </button>
                          <Link
                            href={`/coordinador/propuestas/${item.id}`}
                            className="px-3.5 py-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5"
                          >
                            ↗ Ver Progreso Completo
                          </Link>
                        </div>
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
                    let fechaStr = "N/A";
                    if (baja.creadaEn) {
                      try {
                        const d = new Date(baja.creadaEn);
                        if (!isNaN(d.getTime())) {
                          fechaStr = d.toLocaleDateString("es-SV", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        }
                      } catch (e) {}
                    }

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
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {baja.estado.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {baja.estado === "pendiente" ? (
                            <button
                              onClick={() => {
                                setSelectedBaja(baja);
                                setRespuestaBaja("");
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                            >
                              Resolver Solicitud
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Resuelto</span>
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

      {/* ────────────────── MODAL: VER DOCUMENTOS Y REVISIÓN COMPLETA ────────────────── */}
      {viewingDocPropuesta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-red text-white">
                    {viewingDocPropuesta.tipo}
                  </span>
                  <h3 className="text-lg font-extrabold text-white">
                    Revisión de Propuesta #{viewingDocPropuesta.numero}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl truncate font-medium">
                  {viewingDocPropuesta.titulo}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/coordinador/propuestas/${viewingDocPropuesta.id}`}
                  target="_blank"
                  className="bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1"
                >
                  ↗ Abrir Página Completa
                </Link>
                <button
                  onClick={() => setViewingDocPropuesta(null)}
                  className="text-slate-400 hover:text-white text-xl font-bold p-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setModalTab("docs")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                  modalTab === "docs"
                    ? "bg-white text-brand-red border-t-2 border-brand-red shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📋 Validar Documentos ({canApproveModal ? "✓ 4/4" : "Incompleto"})</span>
              </button>

              <button
                onClick={() => setModalTab("pdf")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                  modalTab === "pdf"
                    ? "bg-white text-brand-red border-t-2 border-brand-red shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📄 Visor PDF Oficial</span>
              </button>

              <button
                onClick={() => setModalTab("info")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                  modalTab === "info"
                    ? "bg-white text-brand-red border-t-2 border-brand-red shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👤 Estudiante y Proyecto</span>
              </button>

              <button
                onClick={() => setModalTab("historial")}
                className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                  modalTab === "historial"
                    ? "bg-white text-brand-red border-t-2 border-brand-red shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📜 Histórico de Cambios</span>
                {docDetails?.historial?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-brand-red font-bold">
                    {docDetails.historial.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Content Area */}
            <div className="flex-1 w-full bg-slate-50 relative overflow-y-auto">
              {modalTab === "docs" && (
                <div className="p-6 max-w-4xl mx-auto">
                  <DocumentosPropuestaSection
                    propuestaId={viewingDocPropuesta.id}
                    onStatusChange={(allUploaded) => setCanApproveModal(allUploaded)}
                  />
                </div>
              )}

              {modalTab === "pdf" && (
                <div className="w-full h-full min-h-[600px] flex flex-col bg-white">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between px-6 text-xs text-slate-600">
                    <span className="font-bold text-slate-800">📄 Vista de Documento Oficial de Propuesta</span>
                    <a
                      href={`/coordinador/propuestas/${viewingDocPropuesta.id}/imprimir`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-brand-red hover:underline flex items-center gap-1"
                    >
                      <span>Abrir en Pestaña Completa ↗</span>
                    </a>
                  </div>
                  <iframe
                    src={`/coordinador/propuestas/${viewingDocPropuesta.id}/imprimir`}
                    className="w-full flex-1 border-none min-h-[650px]"
                    title={`Documento Propuesta ${viewingDocPropuesta.id}`}
                  />
                </div>
              )}

              {modalTab === "info" && (
                <div className="p-6 space-y-6 max-w-4xl mx-auto">
                  {loadingDocDetails ? (
                    <div className="text-center py-12 text-slate-500 font-bold text-sm">
                      Cargando detalles de la propuesta...
                    </div>
                  ) : docDetails ? (
                    <>
                      {/* Estudiantes / Equipo */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Estudiante(s) / Equipo Solicitante
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <span className="text-[11px] text-slate-400 font-bold block uppercase">Estudiante Principal</span>
                            <p className="font-extrabold text-slate-900 text-sm">{docDetails.estudiante?.nombreCompleto}</p>
                            <p className="text-xs text-slate-500 font-mono">Carnet: {docDetails.estudiante?.carnet}</p>
                            <p className="text-xs text-slate-500">{docDetails.estudiante?.correo}</p>
                            <p className="text-xs font-bold text-brand-red mt-1">{docDetails.estudiante?.carrera}</p>
                          </div>

                          {docDetails.teamMembers && docDetails.teamMembers.length > 0 && (
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                              <span className="text-[11px] text-slate-400 font-bold block uppercase">Integrantes Adicionales</span>
                              {docDetails.teamMembers.map((tm: any, idx: number) => (
                                <div key={tm?.id || idx} className="border-t border-slate-200 pt-1 text-xs">
                                  <p className="font-bold text-slate-900">{tm?.nombreCompleto}</p>
                                  <p className="text-slate-500 font-mono text-[11px]">{tm?.carnet} - {tm?.correo}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Carta de Aceptación / Archivo subido */}
                      {docDetails.carta?.archivoUrl && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Carta de Aceptación / Documento Adjunto por Estudiante
                          </h4>
                          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 p-4 rounded-xl">
                            <svg className="w-8 h-8 text-brand-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                Archivo PDF / Imagen Subido por el Egresado
                              </p>
                              <p className="text-xs text-brand-red font-medium">Click para abrir el archivo directamente</p>
                            </div>
                            <a
                              href={docDetails.carta.archivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
                            >
                              Abrir Documento ↗
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Empresa y Supervisor */}
                      {docDetails.empresa && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Empresa y Supervisor (Pasantía)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[11px] text-slate-400 font-bold uppercase block">Empresa</span>
                              <p className="font-bold text-slate-900 text-sm">{docDetails.empresa.nombre}</p>
                              <p className="text-xs text-slate-600 mt-1">{docDetails.empresa.direccion || "Sin dirección"}</p>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[11px] text-slate-400 font-bold uppercase block">Supervisor Institucional</span>
                              <p className="font-bold text-slate-900 text-sm">
                                {docDetails.supervisor ? `${docDetails.supervisor.nombres || ""} ${docDetails.supervisor.apellidos || ""}`.trim() : "Sin supervisor"}
                              </p>
                              {docDetails.supervisor && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {docDetails.supervisor.cargo || "Sin cargo"} | {docDetails.supervisor.correo || docDetails.supervisor.telefono || "Sin contacto"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No se encontraron detalles adicionales.
                    </div>
                  )}
                </div>
              )}

              {modalTab === "historial" && (
                <div className="p-6 max-w-4xl mx-auto space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Histórico de Acciones y Cambios del Proyecto
                  </h4>
                  {loadingDocDetails ? (
                    <div className="text-center py-12 text-slate-500 font-bold text-sm">
                      Cargando histórico...
                    </div>
                  ) : docDetails?.historial && docDetails.historial.length > 0 ? (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-rose-200 pl-4">
                      {docDetails.historial.map((h: any, idx: number) => {
                        let fechaStr = "N/A";
                        if (h?.creadoEn) {
                          try {
                            const d = new Date(h.creadoEn);
                            if (!isNaN(d.getTime())) {
                              fechaStr = d.toLocaleDateString("es-SV", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            }
                          } catch (e) {}
                        }

                        return (
                          <div key={h?.id || idx} className="relative flex items-start gap-3 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-red mt-1 shrink-0 -ml-[19px] ring-4 ring-rose-50" />
                            <div className="w-full bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                <span className="font-bold text-slate-700">{h?.usuarioNombre || "Sistema"}</span>
                                <span>{fechaStr}</span>
                              </div>
                              <p className="font-bold text-slate-900">
                                Cambio de estado: <span className="text-rose-700">{h?.de || "N/A"}</span> → <span className="text-emerald-700">{h?.a || "N/A"}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No hay historial de cambios aún.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center px-6">
              <span className="text-xs text-slate-500 font-medium">
                Propuesta ID: #{viewingDocPropuesta.id}
              </span>
              <button
                onClick={() => setViewingDocPropuesta(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: ASIGNAR ASESOR ────────────────── */}
      {selectedPropuesta && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Asignar Asesor a la Propuesta</h3>
              <button
                onClick={() => setSelectedPropuesta(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                Selecciona un asesor de la facultad para que tome la tutoría del proyecto:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-extrabold text-slate-900 text-sm">{selectedPropuesta.titulo}</p>
                <p className="text-slate-500 mt-0.5">Estudiante(s): {selectedPropuesta.estudiantes}</p>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asesor de Facultad:
                </label>
                <select
                  value={selectedAsesorId}
                  onChange={(e) => setSelectedAsesorId(e.target.value)}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-red focus:border-transparent outline-none bg-white font-medium"
                >
                  <option value="">-- Seleccionar Asesor --</option>
                  {asesores.map((ase) => (
                    <option key={ase.id} value={ase.id}>
                      {ase.nombreCompleto} ({ase.correo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPropuesta(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  {assigning ? "Enviando..." : "Enviar Asignación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: MOTIVO RECHAZO DE ASESOR ────────────────── */}
      {viewingRejection && viewingRejection.solicitudActual && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Motivo de Rechazo de Asesoría</h3>
              <button onClick={() => setViewingRejection(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                El asesor <strong className="text-slate-900">{viewingRejection.solicitudActual.asesorNombre}</strong> no pudo aceptar la solicitud.
              </p>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium leading-relaxed">
                "{viewingRejection.solicitudActual.justificacionRechazo || "Sin justificación detallada."}"
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  const prop = viewingRejection;
                  setViewingRejection(null);
                  handleOpenAssignModal(prop);
                }}
                className="px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl"
              >
                Reasignar a Otro Asesor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── MODAL: RESOLVER SOLICITUD DE BAJA ────────────────── */}
      {selectedBaja && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Resolver Solicitud de Baja de Proyecto</h3>
              <button onClick={() => setSelectedBaja(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="font-extrabold text-slate-900 text-sm">{selectedBaja.titulo}</p>
              <p className="text-slate-600">Asesor: {selectedBaja.asesorNombre} | Estudiante: {selectedBaja.estudianteNombre}</p>
              <p className="text-rose-700 font-medium pt-1">Motivo: "{selectedBaja.motivo}"</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Observaciones / Comentario de Resolución (Opcional):
              </label>
              <textarea
                value={respuestaBaja}
                onChange={(e) => setRespuestaBaja(e.target.value)}
                rows={3}
                placeholder="Escribe un comentario..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-red outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleResponderBaja("rechazada")}
                disabled={processingBaja}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Rechazar Baja
              </button>
              <button
                onClick={() => handleResponderBaja("aprobada")}
                disabled={processingBaja}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Aprobar Baja (Anular Proyecto)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
