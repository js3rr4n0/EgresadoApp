"use client";

import { useState } from "react";
import { updateActividadAsesor } from "@/app/actions/asesor";
import Link from "next/link";

import { solicitarBajaProyectoAsesor } from "@/app/actions/coordinador";

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
}

export default function PropuestaProgresoClient({ data }: PropuestaProgresoClientProps) {
  const { propuesta, estudiante, empresa, supervisor, carta, actividades } = data;

  const [activeTab, setActiveTab] = useState<"datos" | "plan" | "primer_contacto">("datos");

  // State for Dar de Baja Modal
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [sendingBaja, setSendingBaja] = useState(false);

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-card-dark">
                Progreso de Propuesta
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                {getTipoLabel(propuesta.tipo)} #{propuesta.numero}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Estudiante: <span className="font-bold text-slate-800">{estudiante.nombreCompleto}</span> ({estudiante.carnet})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === "primer_contacto"
              ? "bg-brand-red text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Informe de primer contacto
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-extrabold uppercase">
            En desarrollo
          </span>
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
              <h3 className="text-sm font-bold text-card-dark flex items-center gap-2">
                <span>Archivo PDF con la información de la propuesta</span>
                {carta?.archivoUrl && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    PDF Disponible
                  </span>
                )}
              </h3>

              {carta?.archivoUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 p-4 rounded-xl">
                    <svg className="w-8 h-8 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-purple-900 truncate">
                        Carta de Aceptación y Datos de Propuesta
                      </p>
                      <p className="text-xs text-purple-700">
                        Documento oficial adjuntado por el estudiante.
                      </p>
                    </div>
                    <a
                      href={carta.archivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
                    >
                      Abrir PDF en Nueva Pestaña
                    </a>
                  </div>

                  {/* Embedded PDF iframe viewer */}
                  <div className="w-full h-[500px] border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-100">
                    <iframe
                      src={carta.archivoUrl}
                      className="w-full h-full border-none"
                      title="Visor PDF Propuesta"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-sm">
                  El estudiante aún no ha adjuntado el archivo PDF final de la propuesta.
                </div>
              )}
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
                              <th className="py-3 px-3 w-16 text-center">Semana</th>
                              <th className="py-3 px-3 w-12 text-center">#</th>
                              <th className="py-3 px-4">Descripción de Actividad</th>
                              <th className="py-3 px-3 w-28 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {actsMonth.map((act) => (
                              <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-3 text-center font-bold text-purple-900 bg-purple-50/50">
                                  Sem {act.semana}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                                  {act.numero}
                                </td>
                                <td className="py-3 px-4">
                                  {editingActId === act.id ? (
                                    <div className="flex flex-col gap-2 py-1">
                                      <textarea
                                        rows={3}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        className="w-full p-2 border border-brand-red rounded text-xs focus:outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          disabled={loadingUpdate}
                                          onClick={() => handleSaveActividad(act.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1 rounded"
                                        >
                                          {loadingUpdate ? "Guardando..." : "Guardar Modificación"}
                                        </button>
                                        <button
                                          onClick={() => setEditingActId(null)}
                                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] px-3 py-1 rounded"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-slate-800 font-medium leading-relaxed">
                                      {act.descripcion}
                                    </p>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {editingActId !== act.id && (
                                    <button
                                      onClick={() => handleStartEditAct(act)}
                                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded transition-colors"
                                      title="Modificar actividad para pasarlo al estudiante"
                                    >
                                      ✏️ Modificar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PESTAÑA 3: INFORME DE PRIMER CONTACTO (EN DESARROLLO) */}
      {/* ============================================================= */}
      {activeTab === "primer_contacto" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Banner distintivo "(En desarrollo)" */}
            <div className="bg-amber-500 text-white font-extrabold text-xs px-4 py-1.5 rounded-full inline-flex items-center gap-2 shadow-xs uppercase tracking-wider">
              <span>⚠️ ESTA SECCIÓN SE ENCUENTRA ACTUALMENTE EN DESARROLLO</span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-card-dark">
                Informe de Primer Contacto con la Empresa
              </h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                En este apartado el asesor podrá llenar diferentes campos de entrada con información recopilada en el primer contacto o visita a la empresa en la que el egresado está realizando su pasantía o proyecto.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPrimerContactoSaved(true);
                setTimeout(() => setPrimerContactoSaved(false), 3000);
              }}
              className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Nombre del Contacto en la Empresa
                  </label>
                  <input
                    type="text"
                    value={primerContactoData.nombreContactoEmpresa}
                    onChange={(e) =>
                      setPrimerContactoData((p) => ({ ...p, nombreContactoEmpresa: e.target.value }))
                    }
                    placeholder="Ej. Licda. María Fernández"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cargo en la Empresa
                  </label>
                  <input
                    type="text"
                    value={primerContactoData.cargoContacto}
                    onChange={(e) =>
                      setPrimerContactoData((p) => ({ ...p, cargoContacto: e.target.value }))
                    }
                    placeholder="Ej. Gerente de Recursos Humanos"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Teléfono de Contacto Directo
                  </label>
                  <input
                    type="text"
                    value={primerContactoData.telefonoContacto}
                    onChange={(e) =>
                      setPrimerContactoData((p) => ({ ...p, telefonoContacto: e.target.value }))
                    }
                    placeholder="Ej. 2440-1234 / 7890-0000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Correo Electrónico del Contacto
                  </label>
                  <input
                    type="email"
                    value={primerContactoData.correoContacto}
                    onChange={(e) =>
                      setPrimerContactoData((p) => ({ ...p, correoContacto: e.target.value }))
                    }
                    placeholder="contacto@empresa.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Observaciones y Detalles del Primer Contacto / Visita Inicial
                </label>
                <textarea
                  rows={5}
                  value={primerContactoData.observacionesPrimerVisita}
                  onChange={(e) =>
                    setPrimerContactoData((p) => ({ ...p, observacionesPrimerVisita: e.target.value }))
                  }
                  placeholder="Escriba los comentarios generales acordados con la empresa, horarios confirmados y observaciones del primer contacto..."
                  className="w-full p-3 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none bg-white resize-none"
                />
              </div>

              {primerContactoSaved && (
                <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                  ✓ Borrador de informe de primer contacto guardado localmente (En desarrollo).
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                  Guardar Datos de Primer Contacto (Borrador)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
