"use client";

import { useState } from "react";
import { updateActividadAsesor, solicitarAjustesPropuestaAsesor, aprobarPropuestaAsesor } from "@/app/actions/asesor";
import Link from "next/link";

import { solicitarBajaProyectoAsesor } from "@/app/actions/coordinador";
import InformePrimerContactoClient from "@/app/asesor/informes/primer-contacto/[id]/InformePrimerContactoClient";

interface PropuestaProgresoClientProps {
  data: {
    propuesta: any;
    estudiante: {
      nombreCompleto: string;
      carnet: string;
      correo: string;
      carrera: string;
    };
    empresa: any;
    supervisor: any;
    carta: any;
    actividades: any[];
    detallesProyecto: any;
  };
  informeData?: any;
}

export default function PropuestaProgresoClient({ data, informeData }: PropuestaProgresoClientProps) {
  const { propuesta, estudiante, empresa, supervisor, carta, actividades } = data;

  const [activeTab, setActiveTab] = useState<"datos" | "plan" | "primer_contacto">("datos");

  // State for Dar de Baja Modal
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [sendingBaja, setSendingBaja] = useState(false);

  // State for Solicitar Ajustes Modal
  const [showAjustesModal, setShowAjustesModal] = useState(false);
  const [observacionesAjuste, setObservacionesAjuste] = useState("");
  const [sendingAjustes, setSendingAjustes] = useState(false);
  const [sendingAprobar, setSendingAprobar] = useState(false);

  // State for Multi-select Activities & Reasons
  const [selectedActIds, setSelectedActIds] = useState<number[]>([]);
  const [motivosActividades, setMotivosActividades] = useState<Record<number, string>>({});

  const toggleSelectAct = (actId: number) => {
    setSelectedActIds((prev) =>
      prev.includes(actId) ? prev.filter((id) => id !== actId) : [...prev, actId]
    );
  };

  const handleAprobarOK = async () => {
    if (!confirm("¿Está seguro de dar el OK y APROBAR el plan de trabajo y propuesta de este estudiante?")) {
      return;
    }
    setSendingAprobar(true);
    const res = await aprobarPropuestaAsesor(propuesta.id);
    setSendingAprobar(false);
    if (res.success) {
      alert(res.message);
      window.location.reload();
    } else {
      alert(res.error || "Error al aprobar la propuesta.");
    }
  };

  const handleSolicitarBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoBaja.trim()) return;

    setSendingBaja(true);
    const res = await solicitarBajaProyectoAsesor(propuesta.id, motivoBaja.trim());
    setSendingBaja(false);

    if (res.success) {
      alert(res.message);
      setShowBajaModal(false);
      setMotivoBaja("");
    } else {
      alert(res.error || "Error al solicitar la baja.");
    }
  };

  const handleSolicitarAjustes = async (e: React.FormEvent) => {
    e.preventDefault();

    let formattedObservaciones = "";

    if (selectedActIds.length > 0) {
      formattedObservaciones += "📍 ACTIVIDADES MARCADAS PARA CORRECCIÓN EN EL PLAN DE TRABAJO:\n\n";
      selectedActIds.forEach((actId) => {
        const act = actividades.find((a) => a.id === actId);
        if (act) {
          const motivo = motivosActividades[act.id]?.trim() || "Requiere corrección por parte del estudiante.";
          formattedObservaciones += `• Mes ${act.periodo}, Semana ${act.semana} (Actividad #${act.numero}: "${act.descripcion || act.titulo || 'Sin título'}")\n  ➡ Motivo / Por qué: ${motivo}\n\n`;
        }
      });
    }

    if (observacionesAjuste.trim()) {
      if (formattedObservaciones) formattedObservaciones += "💬 INDICACIONES GENERALES:\n";
      formattedObservaciones += observacionesAjuste.trim();
    }

    if (!formattedObservaciones.trim()) {
      alert("Por favor ingrese al menos una observación o motivo de corrección para el estudiante.");
      return;
    }

    setSendingAjustes(true);
    const res = await solicitarAjustesPropuestaAsesor(propuesta.id, formattedObservaciones.trim());
    setSendingAjustes(false);

    if (res.success) {
      alert(res.message);
      setShowAjustesModal(false);
      setObservacionesAjuste("");
      setSelectedActIds([]);
      setMotivosActividades({});
      window.location.reload();
    } else {
      alert(res.error || "Error al solicitar los ajustes.");
    }
  };

  // State for modifying activity descriptions
  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [actividadesList, setActividadesList] = useState<any[]>(actividades);

  // State for "Informe de primer contacto"
  const [primerContactoData, setPrimerContactoData] = useState({
    nombreContactoEmpresa: "",
    cargoContacto: "",
    telefonoContacto: "",
    correoContacto: "",
    observacionesPrimerVisita: "",
    fechaContacto: new Date().toISOString().split("T")[0],
  });
  const [primerContactoSaved, setPrimerContactoSaved] = useState(false);

  const getTipoLabel = (tipo: string) => {
    if (tipo === "pasantia") return "Pasantía";
    if (tipo === "proyecto") return "Proyecto Específico";
    return "Investigación";
  };

  const handleStartEditAct = (act: any) => {
    setEditingActId(act.id);
    setEditingText(act.descripcion);
  };

  const handleSaveActividad = async (actId: number) => {
    if (!editingText.trim()) return;
    setLoadingUpdate(true);

    const res = await updateActividadAsesor(actId, editingText.trim());
    setLoadingUpdate(false);

    if (res.success) {
      setActividadesList((prev) =>
        prev.map((a) => (a.id === actId ? { ...a, descripcion: editingText.trim() } : a))
      );
      setEditingActId(null);
      alert("¡Actividad actualizada correctamente! Los cambios han sido guardados.");
    } else {
      alert("Error al actualizar la actividad: " + res.error);
    }
  };

  // Group activities by period (Month 1, Month 2, Month 3, Month 4, Month 5)
  const periodosUnicos = Array.from(
    new Set(actividadesList.map((a) => a.periodo || 1))
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/asesor"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-card-dark transition-all border border-slate-200"
            title="Regresar a Mis propuestas"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-extrabold text-card-dark">
                Progreso de Propuesta
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                {getTipoLabel(propuesta.tipo)} #{propuesta.numero}
              </span>
              {actividades?.some((a: any) => a.descripcionAnterior || a.esModificada || a.corregida) && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-950 border border-indigo-300">
                  En espera de revisión de propuesta ajustada ⏳
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Estudiante: <span className="font-bold text-slate-800">{estudiante.nombreCompleto}</span> ({estudiante.carnet})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`/admin/propuestas/${propuesta.id}/imprimir?ganttOnly=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            📊 Exportar Gantt (PDF 1 pág)
          </a>

          <button
            onClick={() => setShowBajaModal(true)}
            className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Solicitar Dar de Baja Proyecto
          </button>

          <Link
            href="/asesor"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>← Regresar a “Mis propuestas”</span>
          </Link>
        </div>
      </div>

      {/* Modal Solicitar Ajustes / Correcciones a la Propuesta */}
      {showAjustesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-extrabold text-amber-900 flex items-center gap-2 shrink-0">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                ✏️
              </span>
              Solicitar Ajustes al Egresado ({selectedActIds.length > 0 ? `${selectedActIds.length} Actividades` : "General"})
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed shrink-0">
              Indique el motivo o razón por la cual debe corregirse cada actividad seleccionada y agregue observaciones adicionales para el estudiante.
            </p>

            <form onSubmit={handleSolicitarAjustes} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Selected Activities List & Reason Input */}
              {selectedActIds.length > 0 && (
                <div className="space-y-3 bg-amber-50/60 border border-amber-200 p-4 rounded-xl">
                  <label className="block text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                    📌 Actividades Seleccionadas del Plan ({selectedActIds.length}):
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedActIds.map((actId) => {
                      const act = actividades.find((a) => a.id === actId);
                      if (!act) return null;
                      return (
                        <div key={act.id} className="p-3 bg-white border border-amber-200 rounded-xl space-y-2 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span className="text-amber-950">
                              Mes {act.periodo}, Semana {act.semana} — Actividad #{act.numero}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSelectAct(act.id)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-extrabold"
                            >
                              ✕ Quitar
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 italic line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                            "{act.descripcion || act.titulo || 'Sin descripción'}"
                          </p>
                          <div>
                            <label className="block text-[11px] font-bold text-amber-900 mb-1">
                              Motivo / Por qué corregir esta actividad:
                            </label>
                            <textarea
                              rows={2}
                              value={motivosActividades[act.id] || ""}
                              onChange={(e) =>
                                setMotivosActividades((prev) => ({ ...prev, [act.id]: e.target.value }))
                              }
                              placeholder="Ej: Esta actividad no me convence porque los tiempos están muy apretados o debe pasarse al mes 2..."
                              className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-amber-50/20 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Indicaciones Generales u Otras Correcciones Requeridas:
                </label>
                <textarea
                  value={observacionesAjuste}
                  onChange={(e) => setObservacionesAjuste(e.target.value)}
                  rows={3}
                  placeholder="Ej: Ajustar también la redacción de la portada o revisar fechas en la carta..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden bg-amber-50/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAjustesModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingAjustes}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {sendingAjustes ? "Enviando..." : "Enviar Observaciones al Estudiante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitar Dar de Baja Proyecto */}
      {showBajaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Solicitar Dar de Baja Proyecto al Coordinador
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta solicitud será enviada al coordinador de facultad encargado del proyecto para anular el proceso por motivos de fuerza mayor.
            </p>

            <form onSubmit={handleSolicitarBaja} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo de la Solicitud de Baja:
                </label>
                <textarea
                  required
                  rows={4}
                  value={motivoBaja}
                  onChange={(e) => setMotivoBaja(e.target.value)}
                  placeholder="Describa detalladamente las razones por las cuales se solicita dar de baja el proyecto..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBajaModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingBaja || !motivoBaja.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                >
                  {sendingBaja ? "Enviando Solicitud..." : "Enviar Solicitud al Coordinador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs Control Header */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("datos")}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "datos"
              ? "bg-brand-red text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Datos de Propuesta
        </button>

        <button
          onClick={() => setActiveTab("plan")}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "plan"
              ? "bg-brand-red text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Visualizar plan de trabajo
        </button>

        <button
          onClick={() => setActiveTab("primer_contacto")}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "primer_contacto"
              ? "bg-brand-red text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Informe de primer contacto
          {informeData && informeData.estado === "enviado" ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded font-extrabold uppercase">
              ✓ Completado
            </span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-extrabold uppercase">
              Hito 1
            </span>
          )}
        </button>
      </div>

      {/* ============================================================= */}
      {/* PESTAÑA 1: DATOS DE PROPUESTA */}
      {/* ============================================================= */}
      {activeTab === "datos" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-card-dark border-b border-border pb-3 uppercase tracking-wider text-xs">
              Información General del Estudiante
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-muted font-bold block uppercase">Nombre Completo</span>
                <p className="font-bold text-card-dark text-base">{estudiante.nombreCompleto}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-muted font-bold block uppercase">Carnet</span>
                <p className="font-mono font-bold text-card-dark text-base">{estudiante.carnet}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs text-muted font-bold block uppercase">Carrera</span>
                <p className="font-bold text-card-dark text-base">{estudiante.carrera}</p>
              </div>
            </div>

            {/* Document / Proposal PDF File Viewer */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-card-dark flex items-center gap-2 uppercase tracking-wider text-xs">
                  <span>📄 Hoja Oficial de Inscripción de Propuesta del Estudiante</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase">
                    PDF Completo
                  </span>
                </h3>
              </div>

              {(() => {
                const pdfUrl = `/asesor/propuestas/${propuesta.id}/imprimir`;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50 border border-purple-200 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center text-xl font-bold shrink-0">
                          📄
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-purple-950">
                            Propuesta #{propuesta.numero} — Hoja Oficial de Inscripción y Plan de Trabajo
                          </p>
                          <p className="text-xs text-purple-700 font-medium">
                            Documento oficial completo con todos los datos, objetivos, empresa y cronograma registrado por {estudiante.nombreCompleto}.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {carta?.archivoUrl && (
                          <a
                            href={carta.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all"
                            title="Ver adjunto de Carta de Aceptación escaneada"
                          >
                            📎 Ver Carta Aceptación ↗
                          </a>
                        )}
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <span>Abrir PDF en Nueva Pestaña</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>

                    {/* Embedded PDF iframe viewer rendering full official proposal page */}
                    <div className="w-full h-[750px] border-2 border-slate-300 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                      <iframe
                        src={pdfUrl}
                        className="w-full h-full border-none"
                        title="Visor PDF Propuesta Oficial"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Datos de Empresa / Supervisor si aplica */}
            {empresa && (
              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="text-sm font-bold text-card-dark uppercase tracking-wider text-xs">
                  Información de la Empresa y Supervisor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-muted font-bold uppercase">Empresa</p>
                    <p className="font-bold text-card-dark">{empresa.nombre}</p>
                    <p className="text-xs text-slate-600 mt-1">{empresa.direccion || "Sin dirección"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-muted font-bold uppercase">Supervisor</p>
                    <p className="font-bold text-card-dark">
                      {supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "Sin supervisor asignado"}
                    </p>
                    {supervisor && (
                      <p className="text-xs text-slate-600 mt-1">{supervisor.cargo} | {supervisor.correo || supervisor.telefono}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 2: VISUALIZAR PLAN DE TRABAJO (DIAGRAMA DE GANTT POR MES) */}
      {/* ============================================================= */}
      {activeTab === "plan" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-card-dark flex items-center justify-between border-b border-border pb-3">
                <span>Diagrama de Gantt y Plan de Trabajo Actividades por Mes</span>
                <span className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full">
                  {actividadesList.length} actividades programadas
                </span>
              </h2>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Revisa la programación de actividades mes por mes según las semanas de trabajo. Puedes realizar modificaciones a la descripción de cualquier actividad si es necesario (los cambios se sincronizarán con el estudiante). Además, al final de cada mes podrás revisar el informe mensual subido.
              </p>
            </div>

            {/* BANNER DE COMPARATIVA DE CAMBIOS ENVIADOS POR EL ALUMNO */}
            {actividadesList.some((a: any) => (a.descripcionAnterior && a.descripcionAnterior !== a.descripcion) || a.esModificada || a.esNueva) && (
              <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-indigo-700/60 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-600/30 text-indigo-300 rounded-xl text-xl border border-indigo-500/40 shrink-0">
                    ⏳
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-white">
                        Propuesta Ajustada por el Estudiante — Comparativa de Cambios
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-amber-950 border border-amber-300">
                        Pendiente de Revisión
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      El egresado ha reenviado las correcciones del plan de trabajo. A continuación se presenta la <strong>comparativa directa de los cambios realizados</strong>:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-800/80 text-xs">
                  <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-700/50 p-2.5 rounded-xl">
                    <span className="text-base">❌</span>
                    <div>
                      <span className="text-rose-300 font-bold block text-[11px]">Texto original del Asesor:</span>
                      <span className="line-through text-rose-200/90 font-medium text-[11px]">~Tachado en rojo~</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-700/50 p-2.5 rounded-xl">
                    <span className="text-base">🟢</span>
                    <div>
                      <span className="text-emerald-300 font-bold block text-[11px]">Nuevas actividades o correcciones:</span>
                      <span className="text-emerald-200 font-semibold text-[11px]">Resaltadas en verde ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {periodosUnicos.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-semibold text-sm">
                  Aún no hay actividades registradas en el plan de trabajo.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {periodosUnicos.map((periodoNum) => {
                  const actsMonth = actividadesList.filter((a) => (a.periodo || 1) === periodoNum);
                  return (
                    <div
                      key={periodoNum}
                      className="border border-border rounded-xl p-5 bg-slate-50/50 space-y-4 shadow-sm"
                    >
                      {/* Header del Mes / Período */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-red text-white flex items-center justify-center font-extrabold text-sm">
                            M{periodoNum}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-card-dark text-base">
                              Mes {periodoNum} de Pasantía / Proyecto
                            </h3>
                            {(() => {
                              const startDate = carta?.fechaInicio || propuesta?.fechaAprobacion || propuesta?.enviadaEn;
                              let baseDate = new Date();
                              if (startDate) {
                                const d = new Date(startDate);
                                if (!isNaN(d.getTime())) baseDate = d;
                              }
                              const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + (periodoNum - 1), 1);
                              const mName = target.toLocaleDateString("es-SV", { month: "long" });
                              const mCap = mName.charAt(0).toUpperCase() + mName.slice(1);
                              return (
                                <p className="text-xs font-extrabold text-brand-red uppercase tracking-wide">
                                  ({mCap} {target.getFullYear()})
                                </p>
                              );
                            })()}
                            <p className="text-xs text-slate-500">
                              {actsMonth.length} actividades programadas en este mes
                            </p>
                          </div>
                        </div>

                        {/* Informe Mensual al final del mes */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border shadow-xs">
                          <span className="text-xs font-bold text-slate-700">Informe Mensual M{periodoNum}:</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            Pendiente / Al final del mes
                          </span>
                        </div>
                      </div>

                      {/* Vista Diagrama de Gantt / Tabla de semanas del mes */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse bg-white rounded-lg border border-border overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                              <th className="py-3 px-2 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={actsMonth.every((a) => selectedActIds.includes(a.id))}
                                  onChange={() => {
                                    const allMonthIds = actsMonth.map((a) => a.id);
                                    const allSelected = allMonthIds.every((id) => selectedActIds.includes(id));
                                    if (allSelected) {
                                      setSelectedActIds((prev) => prev.filter((id) => !allMonthIds.includes(id)));
                                    } else {
                                      setSelectedActIds((prev) => Array.from(new Set([...prev, ...allMonthIds])));
                                    }
                                  }}
                                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                                  title="Seleccionar todas las actividades del mes"
                                />
                              </th>
                              <th className="py-3 px-3 w-16 text-center">Semana</th>
                              <th className="py-3 px-3 w-12 text-center">#</th>
                              <th className="py-3 px-4">Descripción de Actividad</th>
                              <th className="py-3 px-3 w-32 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {actsMonth.map((act) => {
                              const isSelected = selectedActIds.includes(act.id);
                              const isNewAct = act.esNueva;
                              const isModAct = (act.descripcionAnterior && act.descripcionAnterior !== act.descripcion) || act.esModificada;

                              return (
                                <tr
                                  key={act.id}
                                  className={`transition-colors ${
                                    isNewAct
                                      ? "bg-emerald-50/80 border-l-4 border-emerald-500 hover:bg-emerald-100/50"
                                      : isSelected
                                      ? "bg-amber-50/80 border-l-4 border-amber-500"
                                      : isModAct
                                      ? "bg-indigo-50/40"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="py-3 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectAct(act.id)}
                                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-3 px-3 text-center font-bold text-purple-900 bg-purple-50/50">
                                    Sem {act.semana}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                                    {act.numero}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="space-y-1.5">
                                      {/* Título de actividad (Gantt) diff */}
                                      {act.tituloAnterior && act.tituloAnterior !== act.titulo && (
                                        <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1.5 flex-wrap">
                                          <span className="line-through text-red-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                            Título Original (Gantt): ~{act.tituloAnterior}~
                                          </span>
                                        </div>
                                      )}
                                      {act.titulo && (
                                        <div className="text-[11px] font-extrabold text-purple-950 bg-purple-100/70 border border-purple-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                          <span className="text-purple-600 font-normal">Título (Gantt):</span> {act.titulo}
                                        </div>
                                      )}

                                      {/* Descripción diff */}
                                      {isNewAct ? (
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            🟢 Nueva Actividad Añadida
                                          </span>
                                          <p className="text-emerald-950 font-bold leading-relaxed">
                                            {act.descripcion}
                                          </p>
                                        </div>
                                      ) : (
                                        <>
                                          {act.descripcionAnterior && act.descripcionAnterior !== act.descripcion && (
                                            <div className="text-xs text-red-600 font-medium flex items-center gap-1.5 flex-wrap">
                                              <span className="line-through text-red-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                Original Asesor: ~{act.descripcionAnterior}~
                                              </span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-slate-900 font-bold leading-relaxed">
                                              {act.descripcion}
                                            </p>
                                            {isModAct && (
                                              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                                ✓ (Corregido)
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      <button
                                        onClick={() => {
                                          if (!selectedActIds.includes(act.id)) {
                                            setSelectedActIds((prev) => [...prev, act.id]);
                                          }
                                          setShowAjustesModal(true);
                                        }}
                                        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded transition-colors border border-amber-300 flex items-center gap-1"
                                        title="Marcar esta actividad y añadir observación con motivo"
                                      >
                                        💬 Comentar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* DIAGRAMA DE GANTT NUEVO Y COMPLETO ABAJO DEL PLAN DE TRABAJO */}
                <div className="mt-8 border border-border rounded-xl p-5 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-card-dark font-extrabold text-base">
                      <span>📊 Diagrama de Gantt Actualizado (Vista General)</span>
                    </div>
                    <a
                      href={`/admin/propuestas/${propuesta.id}/imprimir?ganttOnly=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Exportar Diagrama PDF ↗
                    </a>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 text-white px-3 py-2 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider">
                        <span>Cronograma General de Actividades ({actividadesList.length})</span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-2 rounded bg-gradient-to-r from-red-600 to-red-800 border border-red-500 inline-block"></span>
                          Ejecución Programada
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-2 rounded bg-white border border-slate-300 inline-block"></span>
                          Sin Actividad
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white uppercase font-bold tracking-wider">
                            <th className="py-2 px-1 text-center w-12 border-r border-slate-700">Cód.</th>
                            <th className="py-2 px-3 text-left border-r border-slate-700">Descripción de Actividad</th>
                            {periodosUnicos.map((pNum) => {
                              const startDate = carta?.fechaInicio || propuesta?.fechaAprobacion || propuesta?.enviadaEn;
                              let baseDate = new Date();
                              if (startDate) {
                                const d = new Date(startDate);
                                if (!isNaN(d.getTime())) baseDate = d;
                              }
                              const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + (pNum - 1), 1);
                              const mName = target.toLocaleDateString("es-SV", { month: "long" });
                              const mCap = mName.charAt(0).toUpperCase() + mName.slice(1);

                              return (
                                <th key={pNum} colSpan={4} className="py-1.5 px-1 text-center border-r border-slate-700 bg-slate-950 font-extrabold">
                                  <div className="text-[11px] text-white font-extrabold">MES {pNum}</div>
                                  <div className="text-[9px] text-rose-300 font-semibold uppercase">
                                    ({mCap} {target.getFullYear()})
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                          <tr className="bg-slate-100 font-bold text-slate-700 text-[9px] border-b border-slate-300">
                            <th className="py-1 px-1 border-r border-slate-300" colSpan={2}>Semanas de Trabajo</th>
                            {periodosUnicos.flatMap((pNum) =>
                              [1, 2, 3, 4].map((sNum) => (
                                <th key={`${pNum}-${sNum}`} className="py-1 text-center font-mono border-r border-slate-200 bg-slate-50 w-6">
                                  S{sNum}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {actividadesList.map((a, idx) => {
                            const isEven = idx % 2 === 0;
                            return (
                              <tr key={a.id} className={isEven ? "bg-white" : "bg-slate-50/80"}>
                                <td className="py-1.5 px-1 text-center border-r border-slate-200 font-mono font-black text-[9px]">
                                  <span className="inline-block bg-rose-50 text-rose-900 border border-rose-200 px-1 py-0.5 rounded">
                                    {a.periodo}.{a.semana}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-900 leading-tight">
                                  {a.titulo || a.descripcion}
                                </td>
                                {periodosUnicos.flatMap((pNum) =>
                                  [1, 2, 3, 4].map((sNum) => {
                                    const active = a.periodo === pNum && a.semana === sNum;
                                    return (
                                      <td key={`${a.id}-${pNum}-${sNum}`} className="p-0.5 text-center border-r border-slate-200/60 h-6 align-middle">
                                        {active ? (
                                          <div className="mx-0.5 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white font-bold text-[7.5px] rounded py-1 shadow-2xs flex items-center justify-center border border-red-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-2xs"></span>
                                          </div>
                                        ) : null}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* BARRA INFERIOR DE ACCIONES AL FINAL DE TODO EL PLAN DE TRABAJO */}
                <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Aprobación y Dictamen Final de la Propuesta
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Una vez verificado el plan de trabajo y sus correcciones, puedes aprobar la propuesta y habilitar la emisión del dictamen.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAprobarOK}
                      disabled={sendingAprobar || propuesta.estado === "aprobada"}
                      className={`inline-flex items-center gap-2 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                        propuesta.estado === "aprobada"
                          ? "bg-slate-200 text-slate-600 border border-slate-300 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <span>{sendingAprobar ? "Aprobando..." : propuesta.estado === "aprobada" ? "✓ Propuesta Aprobada (OK)" : "✅ Dar OK (Aprobar Plan)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (propuesta.estado !== "aprobada") {
                          alert("Debe dar OK y aprobar la propuesta antes de generar el dictamen.");
                          return;
                        }
                        alert("Función 'Generar Dictamen de Propuesta' habilitada exitosamente. (Módulo oficial en desarrollo)");
                      }}
                      disabled={propuesta.estado !== "aprobada"}
                      className={`inline-flex items-center gap-2 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md ${
                        propuesta.estado === "aprobada"
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"
                          : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
                      }`}
                      title={propuesta.estado === "aprobada" ? "Generar Dictamen Oficial" : "Requiere propuesta aprobada (OK)"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Generar Dictamen de Propuesta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAjustesModal(true)}
                      className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-4 py-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Solicitar Ajustes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Sticky Selection Bar for Advisor */}
      {selectedActIds.length > 0 && activeTab === "plan" && (
        <div className="fixed bottom-6 right-6 z-40 bg-amber-950 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-5 border-2 border-amber-500 animate-in fade-in zoom-in-95 max-w-xl">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
            📌
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-amber-100 text-sm">
              {selectedActIds.length} actividad(es) seleccionada(s)
            </h4>
            <p className="text-xs text-amber-300">
              Agrega el motivo por qué corregir cada una y envíalas al estudiante.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedActIds([])}
              className="px-3 py-2 text-xs font-bold text-amber-200 hover:text-white bg-amber-900/60 rounded-xl transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={() => setShowAjustesModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              ✏️ Solicitar Ajustes ({selectedActIds.length})
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 3: INFORME DE PRIMER CONTACTO (HITO 1) */}
      {/* ============================================================= */}
      {activeTab === "primer_contacto" && (
        <div className="pt-2">
          {informeData ? (
            <InformePrimerContactoClient
              informeData={informeData}
              propuesta={propuesta}
              egresado={estudiante}
              supervisor={supervisor}
              empresa={empresa}
              carrera={{ nombre: estudiante.carrera }}
              actividades={actividades || []}
            />
          ) : (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-bold">
              Cargando formulario de Informe de Primer Contacto...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
