"use client";

import { useState } from "react";
import { initPropuesta } from "@/app/actions/propuestas";

interface CrearPropuestaModalButtonProps {
  existingCount: number;
  isTeamMember?: boolean;
  isLocked?: boolean;
}

export default function CrearPropuestaModalButton({
  existingCount,
  isTeamMember = false,
  isLocked = false,
}: CrearPropuestaModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const isDisabled = isTeamMember || isLocked || existingCount >= 3;

  return (
    <>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-brand-red hover:bg-brand-red-dark text-white shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          isTeamMember
            ? "No puedes crear propuestas mientras pertenezcas a un equipo de trabajo."
            : isLocked
            ? "No puedes crear otra propuesta mientras tengas una propuesta enviada en proceso de evaluación."
            : existingCount >= 3
            ? "Has alcanzado el límite máximo de 3 propuestas."
            : "Crear nueva propuesta"
        }
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span>
          {isTeamMember
            ? "Perteneces a un Equipo"
            : isLocked
            ? "Propuesta en Evaluación"
            : existingCount >= 3
            ? "Límite Alcanzado (3/3)"
            : existingCount > 0
            ? `Crear Propuesta #${existingCount + 1}`
            : "Crear Nueva Propuesta"}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">¿Qué proceso de graduación deseas realizar?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Selecciona la modalidad para tu nueva propuesta.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {existingCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Ya tienes <strong>{existingCount}</strong> propuesta(s) registrada(s). Esta se creará como la <strong>Propuesta #{existingCount + 1}</strong>.
                  </span>
                </div>
              )}

              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProcess === "investigacion"
                    ? "border-brand-red bg-brand-red/5"
                    : "border-slate-200 hover:border-brand-red/30 bg-white"
                }`}
              >
                <div className="mt-1">
                  <input
                    type="radio"
                    name="proceso_modal"
                    className="w-4 h-4 text-brand-red focus:ring-brand-red"
                    checked={selectedProcess === "investigacion"}
                    onChange={() => setSelectedProcess("investigacion")}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedProcess === "investigacion" ? "bg-brand-red text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">Investigación</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Realiza un estudio profundo sobre un tema específico para generar nuevo conocimiento.</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProcess === "pasantia"
                    ? "border-brand-red bg-brand-red/5"
                    : "border-slate-200 hover:border-brand-red/30 bg-white"
                }`}
              >
                <div className="mt-1">
                  <input
                    type="radio"
                    name="proceso_modal"
                    className="w-4 h-4 text-brand-red focus:ring-brand-red"
                    checked={selectedProcess === "pasantia"}
                    onChange={() => setSelectedProcess("pasantia")}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedProcess === "pasantia" ? "bg-brand-red text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">Pasantía</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Desarrolla actividades prácticas en una institución u organización.</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProcess === "proyecto"
                    ? "border-brand-red bg-brand-red/5"
                    : "border-slate-200 hover:border-brand-red/30 bg-white"
                }`}
              >
                <div className="mt-1">
                  <input
                    type="radio"
                    name="proceso_modal"
                    className="w-4 h-4 text-brand-red focus:ring-brand-red"
                    checked={selectedProcess === "proyecto"}
                    onChange={() => setSelectedProcess("proyecto")}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedProcess === "proyecto" ? "bg-brand-red text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6a3 3 0 116 0 3 3 0 01-6 0zM12 18v-2m-3 2h6" />
                      </svg>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">Proyecto</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Desarrolla un producto, servicio o propuesta para resolver una necesidad.</p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!selectedProcess || isInitializing}
                onClick={async () => {
                  try {
                    if (!selectedProcess) return;
                    setIsInitializing(true);
                    const res = await initPropuesta(selectedProcess);
                    if (res?.success) {
                      window.location.href = res.propuestaId ? `/egresado/redactar?id=${res.propuestaId}` : "/egresado/redactar";
                    } else {
                      alert(res?.error || "Ocurrió un error al iniciar la propuesta.");
                      setIsInitializing(false);
                    }
                  } catch (err: any) {
                    console.error("Client Error:", err);
                    alert("Error de conexión: " + err.message);
                    setIsInitializing(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-brand-red hover:bg-brand-red-dark text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isInitializing ? "Creando..." : "Comenzar Redacción"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
