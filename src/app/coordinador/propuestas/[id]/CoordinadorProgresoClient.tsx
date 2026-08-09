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
    teamMembers?: any[];
    asesor: any;
    empresa: any;
    supervisor: any;
    carta: any;
    actividades: any[];
    detallesProyecto: any;
    documentos: any[];
    historial?: any[];
  };
}

export default function CoordinadorProgresoClient({ data }: CoordinadorProgresoClientProps) {
  const {
    propuesta,
    estudiante,
    teamMembers = [],
    asesor,
    empresa,
    supervisor,
    carta,
    actividades = [],
    detallesProyecto,
    historial = [],
  } = data;

  const [activeTab, setActiveTab] = useState<
    "documentos" | "pdf" | "datos" | "detalles" | "plan" | "historial"
  >("documentos");

  const getTipoLabel = (tipo: string) => {
    if (tipo === "pasantia") return "Pasantía";
    if (tipo === "proyecto") return "Proyecto Específico";
    return "Investigación";
  };

  const periodosUnicos = Array.from(
    new Set(actividades.map((a) => a.periodo || 1))
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
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
                Revisión de Propuesta #{propuesta.numero}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-brand-red border border-rose-200">
                {getTipoLabel(propuesta.tipo)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Estudiante: <span className="font-bold text-slate-800">{estudiante.nombreCompleto}</span> ({estudiante.carnet}) | Asesor: <span className="font-bold text-slate-800">{asesor?.nombreCompleto || "Sin Asesor"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`/coordinador/propuestas/${propuesta.id}/imprimir?ganttOnly=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            📊 Exportar Gantt (PDF 1 pág)
          </a>
          <a
            href={`/coordinador/propuestas/${propuesta.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors shadow-xs"
          >
            📄 Ver Documento PDF ↗
          </a>
          <Link
            href="/coordinador"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-slate-200"
          >
            <span>← Volver al Panel</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar Navigation */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-1.5 flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveTab("documentos")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "documentos"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>📋 Validar Documentos (4 Obligatorios)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("pdf");
          }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "pdf"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>📄 Documento PDF (Hoja Oficial)</span>
        </button>

        <button
          onClick={() => setActiveTab("datos")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "datos"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>👤 Estudiante, Empresa y Actores</span>
        </button>

        <button
          onClick={() => setActiveTab("detalles")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "detalles"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>📝 Detalles y Objetivos del Proyecto</span>
        </button>

        <button
          onClick={() => setActiveTab("plan")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "plan"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>📅 Plan de Trabajo ({actividades.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === "historial"
              ? "bg-white text-brand-red shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <span>📜 Histórico</span>
          {historial.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-brand-red font-extrabold">
              {historial.length}
            </span>
          )}
        </button>
      </div>

      {/* ────────────────── TAB 1: VALIDAR DOCUMENTOS ────────────────── */}
      {activeTab === "documentos" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <DocumentosPropuestaSection propuestaId={propuesta.id} />
        </div>
      )}

      {/* ────────────────── TAB 2: DOCUMENTO PDF (VISOR OFICIAL) ────────────────── */}
      {activeTab === "pdf" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          <div className="bg-slate-100 p-3.5 border-b border-slate-200 flex items-center justify-between px-6 text-xs text-slate-600">
            <span className="font-bold text-slate-800">📄 Hoja Oficial de Inscripción de Trabajo de Graduación</span>
            <div className="flex items-center gap-3">
              <a
                href={`/coordinador/propuestas/${propuesta.id}/imprimir?ganttOnly=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 hover:underline"
              >
                Gantt 1 pág 📊
              </a>
              <a
                href={`/coordinador/propuestas/${propuesta.id}/imprimir`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-brand-red hover:underline flex items-center gap-1"
              >
                Abrir en Pestaña Completa ↗
              </a>
            </div>
          </div>
          <iframe
            src={`/coordinador/propuestas/${propuesta.id}/imprimir`}
            className="w-full flex-1 border-none min-h-[700px]"
            title={`Documento Propuesta ${propuesta.id}`}
          />
        </div>
      )}

      {/* ────────────────── TAB 3: ESTUDIANTE, EMPRESA Y ACTORES ────────────────── */}
      {activeTab === "datos" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
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
              <p className="text-xs text-slate-500">{estudiante.correo}</p>
              <p className="text-xs font-bold text-brand-red mt-1">{estudiante.carrera}</p>
            </div>

            {teamMembers.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                <span className="text-xs text-slate-500 font-bold block uppercase">Integrantes del Equipo</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teamMembers.map((tm: any) => (
                    <div key={tm.id} className="p-2 bg-white rounded border border-slate-200 text-xs">
                      <p className="font-bold text-slate-900">{tm.nombreCompleto}</p>
                      <p className="text-slate-500 font-mono">{tm.carnet} - {tm.correo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500 font-bold block uppercase">Asesor Encargado</span>
              <p className="font-bold text-brand-red text-base">{asesor?.nombreCompleto || "Sin Asesor"}</p>
              <p className="text-xs text-slate-500">{asesor?.correo}</p>
            </div>
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
                    {supervisor ? `${supervisor.nombres || supervisor.nombreCompleto || ""} ${supervisor.apellidos || ""}` : "Sin supervisor asignado"}
                  </p>
                  {supervisor && (
                    <p className="text-xs text-slate-600 mt-1">{supervisor.cargo} | {supervisor.correo || supervisor.telefono}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actores Intervinientes del Proyecto */}
          {detallesProyecto && (
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
                Actores Intervinientes en el Proyecto
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Patrocinador</span>
                  <p className="font-bold text-slate-800 mt-0.5">{detallesProyecto.actorPatrocinador || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Beneficiario</span>
                  <p className="font-bold text-slate-800 mt-0.5">{detallesProyecto.actorBeneficiario || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Ejecutor</span>
                  <p className="font-bold text-slate-800 mt-0.5">{detallesProyecto.actorEjecutor || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Financista</span>
                  <p className="font-bold text-slate-800 mt-0.5">{detallesProyecto.actorFinancista || "N/A"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 4: DETALLES Y OBJETIVOS DEL PROYECTO ────────────────── */}
      {activeTab === "detalles" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-slate-200 pb-3">
            Detalles Técnicos y Objetivos del Proyecto
          </h2>

          {detallesProyecto ? (
            <div className="space-y-6 text-sm">
              {/* Descripción / Planteamiento del Problema */}
              {detallesProyecto.descripcionProblema && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                    Planteamiento / Descripción del Problema
                  </h3>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                    {detallesProyecto.descripcionProblema}
                  </p>
                </div>
              )}

              {/* Justificación */}
              {detallesProyecto.justificacion && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                    Justificación del Proyecto
                  </h3>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                    {detallesProyecto.justificacion}
                  </p>
                </div>
              )}

              {/* Alcance */}
              {detallesProyecto.alcance && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                    Alcance y Delimitación
                  </h3>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                    {detallesProyecto.alcance}
                  </p>
                </div>
              )}

              {/* Objetivo General */}
              {detallesProyecto.objetivoGeneral && (
                <div className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 space-y-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                    Objetivo General
                  </h3>
                  <p className="text-slate-900 font-bold leading-relaxed">
                    {detallesProyecto.objetivoGeneral}
                  </p>
                </div>
              )}

              {/* Objetivos Específicos */}
              {detallesProyecto.objetivosEspecificos && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-red">
                    Objetivos Específicos
                  </h3>
                  {Array.isArray(detallesProyecto.objetivosEspecificos) ? (
                    <ul className="space-y-2">
                      {detallesProyecto.objetivosEspecificos.map((obj: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                          <span className="font-extrabold text-brand-red">{idx + 1}.</span>
                          <div className="flex-1">
                            {typeof obj === "object" && obj !== null ? (
                              <>
                                {obj.titulo && <strong className="block text-slate-900">{obj.titulo}</strong>}
                                <span className="text-slate-700">{obj.descripcion || JSON.stringify(obj)}</span>
                              </>
                            ) : (
                              <span className="text-slate-700">{String(obj)}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-800 whitespace-pre-line text-xs">
                      {typeof detallesProyecto.objetivosEspecificos === "object"
                        ? JSON.stringify(detallesProyecto.objetivosEspecificos, null, 2)
                        : String(detallesProyecto.objetivosEspecificos)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
              No hay detalles adicionales ni objetivos registrados aún para esta propuesta.
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 5: PLAN DE TRABAJO ────────────────── */}
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
              Como coordinador puedes consultar las diferentes actividades programadas y el avance por meses.
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

      {/* ────────────────── TAB 6: HISTÓRICO DE CAMBIOS ────────────────── */}
      {activeTab === "historial" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 uppercase tracking-wider text-xs">
            Histórico de Acciones y Cambios de Estado
          </h2>

          {historial.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No hay eventos registrados en el historial aún.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-rose-200 pl-6">
              {historial.map((h: any, idx: number) => {
                const fechaStr = new Date(h.creadoEn).toLocaleDateString("es-SV", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={h.id || idx} className="relative flex items-start gap-3 text-xs">
                    <div className="w-3 h-3 rounded-full bg-brand-red ring-4 ring-rose-50 mt-1 shrink-0 -ml-5 z-10" />
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-bold text-slate-700">{h.usuarioNombre || "Sistema"}</span>
                        <span>{fechaStr}</span>
                      </div>
                      <p className="font-extrabold text-slate-900">
                        Cambio de estado: <span className="text-rose-700">{h.de}</span> → <span className="text-emerald-700">{h.a}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
