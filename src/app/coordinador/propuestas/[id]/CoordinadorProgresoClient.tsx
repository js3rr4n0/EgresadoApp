"use client";

import { useState } from "react";
import Link from "next/link";
import DocumentosPropuestaSection from "@/components/coordinador/DocumentosPropuestaSection";

interface CoordinadorProgresoClientProps {
  data: {
    propuesta: any;
    estudiante: {
      nombreCompleto: string;
      carnet: string;
      correo: string;
      carrera: string;
    };
    asesor: any;
    empresa: any;
    supervisor: any;
    carta: any;
    actividades: any[];
    detallesProyecto: any;
    documentos: any[];
  };
}

export default function CoordinadorProgresoClient({ data }: CoordinadorProgresoClientProps) {
  const { propuesta, estudiante, asesor, empresa, supervisor, carta, actividades, documentos } = data;

  const [activeTab, setActiveTab] = useState<"datos" | "plan">("datos");

  const getTipoLabel = (tipo: string) => {
    if (tipo === "pasantia") return "Pasantía";
    if (tipo === "proyecto") return "Proyecto Específico";
    return "Investigación";
  };

  // Group activities by period (Month 1, Month 2, Month 3, Month 4, Month 5)
  const periodosUnicos = Array.from(
    new Set(actividades.map((a) => a.periodo || 1))
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/coordinador"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200"
            title="Regresar a Mis propuestas asignadas"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Progreso del Trabajo de Graduación
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-brand-red border border-rose-200">
                {getTipoLabel(propuesta.tipo)} #{propuesta.numero}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estudiante: <span className="font-bold text-slate-800">{estudiante.nombreCompleto}</span> ({estudiante.carnet}) | Asesor: <span className="font-bold text-slate-800">{asesor?.nombreCompleto || "Sin Asesor"}</span>
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
          <Link
            href="/coordinador"
            className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>← Regresar al Panel de Coordinador</span>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-wrap gap-2">
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
          Datos de la Propuesta
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
          Plan de Trabajo y Avances por Mes
        </button>

        <button
          onClick={() => setActiveTab("documentos" as any)}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            (activeTab as string) === "documentos"
              ? "bg-brand-red text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📋 Documentos de Validación (4 Obligatorios)</span>
        </button>
      </div>

      {/* ────────────────── TAB 1: DATOS DE LA PROPUESTA ────────────────── */}
      {activeTab === "datos" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          {/* Título de la propuesta */}
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-5 space-y-1">
            <span className="text-xs font-bold text-brand-red uppercase tracking-widest block">
              Título de la Propuesta
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              {propuesta.titulo || `Propuesta #${propuesta.numero}`}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold block uppercase">Estudiante Principal</span>
              <p className="font-bold text-slate-900 text-base">{estudiante.nombreCompleto}</p>
              <p className="text-xs text-slate-500">Carnet: {estudiante.carnet}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold block uppercase">Carrera</span>
              <p className="font-bold text-slate-900 text-base">{estudiante.carrera}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold block uppercase">Asesor Encargado</span>
              <p className="font-bold text-brand-red text-base">{asesor?.nombreCompleto || "Sin Asesor"}</p>
              <p className="text-xs text-slate-500">{asesor?.correo}</p>
            </div>
          </div>

          {/* Document / Proposal PDF File Viewer */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Documentos de la Propuesta</span>
              </h3>
              <a
                href={`/coordinador/propuestas/${propuesta.id}/imprimir`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ver Hoja de Inscripción (PDF)
              </a>
            </div>

            {carta?.archivoUrl ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 p-4 rounded-xl">
                  <svg className="w-8 h-8 text-brand-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      Carta de Aceptación / Documento Adjunto
                    </p>
                    <p className="text-xs text-brand-red font-medium">Archivo subido por el estudiante</p>
                  </div>
                  <a
                    href={carta.archivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
                  >
                    Abrir Archivo
                  </a>
                </div>

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
                No hay archivo de carta de aceptación adicional. Puedes revisar la Hoja de Inscripción oficial arriba.
              </div>
            )}
          </div>

          {/* Información de Empresa y Supervisor si aplica */}
          {empresa && (
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                Información de la Empresa y Supervisor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase">Empresa</p>
                  <p className="font-bold text-slate-900">{empresa.nombre}</p>
                  <p className="text-xs text-slate-600 mt-1">{empresa.direccion || "Sin dirección"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-bold uppercase">Supervisor</p>
                  <p className="font-bold text-slate-900">
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
      )}

      {/* ────────────────── TAB 2: PLAN DE TRABAJO (MODO LECTURA) ────────────────── */}
      {activeTab === "plan" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-3">
              <span>Cronograma y Plan de Trabajo por Mes (Modo Lectura)</span>
              <span className="text-xs bg-rose-50 text-brand-red font-bold px-3 py-1 rounded-full border border-rose-200">
                {actividades.length} actividades registradas
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Como coordinador puedes consultar las diferentes actividades programadas y el avance por meses sin modificar los registros.
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
                const actsMonth = actividades.filter((a) => (a.periodo || 1) === periodoNum);
                return (
                  <div
                    key={periodoNum}
                    className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-red text-white flex items-center justify-center font-extrabold text-sm">
                          M{periodoNum}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">
                            Mes {periodoNum} de Desarrollo
                          </h3>
                          <p className="text-xs text-slate-500">
                            {actsMonth.length} actividades programadas
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                            <th className="py-3 px-3 w-16 text-center">Semana</th>
                            <th className="py-3 px-3 w-12 text-center">#</th>
                            <th className="py-3 px-4">Descripción de la Actividad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {actsMonth.map((act) => (
                            <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 text-center font-bold text-brand-red bg-rose-50/50">
                                Sem {act.semana}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                                {act.numero}
                              </td>
                              <td className="py-3 px-4 text-slate-800 font-medium leading-relaxed">
                                {act.descripcion}
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
      )}

      {/* ────────────────── TAB 3: DOCUMENTOS DE VALIDACIÓN ────────────────── */}
      {(activeTab as string) === "documentos" && (
        <DocumentosPropuestaSection propuestaId={propuesta.id} />
      )}
    </div>
  );
}
