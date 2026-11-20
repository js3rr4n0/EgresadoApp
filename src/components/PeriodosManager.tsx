"use client";

import { useState } from "react";
import { createPeriodo, updatePeriodo, deletePeriodo, togglePeriodoActivo, PeriodoData } from "@/app/actions/periodos";

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00Z"); // Force UTC to avoid timezone shift
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().split("T")[0];
}

export function calculateDates(finRecepcion: string) {
  const maxAprobacionPropuesta = addDays(finRecepcion, 21); // 3 semanas base
  const maxInicioProceso = maxAprobacionPropuesta; // Inicio de Ejecución
  
  const maxPrimerInforme = addMonths(maxInicioProceso, 1);
  const maxSegundoInforme = addMonths(maxInicioProceso, 2);
  const maxTercerInforme = addMonths(maxInicioProceso, 3);
  const maxCuartoInforme = addMonths(maxInicioProceso, 4);
  
  const visitaAsesorInicio = maxSegundoInforme;
  const visitaAsesorFin = maxTercerInforme;
  
  const maxInformeFinal = addMonths(maxInicioProceso, 5);
  const maxAprobacionFinal = addMonths(maxInicioProceso, 6);

  return {
    maxAprobacionPropuesta,
    maxInicioProceso,
    maxPrimerInforme,
    maxSegundoInforme,
    maxTercerInforme,
    maxCuartoInforme,
    visitaAsesorInicio,
    visitaAsesorFin,
    maxInformeFinal,
    maxAprobacionFinal,
  };
}

export default function PeriodosManager({ initialPeriodos }: { initialPeriodos: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const getEmptyForm = (): PeriodoData => ({
    nombre: "",
    inicioRecepcion: "",
    finRecepcion: "",
    maxAprobacionPropuesta: "",
    maxInicioProceso: "",
    maxPrimerInforme: "",
    maxSegundoInforme: "",
    maxTercerInforme: "",
    maxCuartoInforme: "",
    visitaAsesorInicio: "",
    visitaAsesorFin: "",
    maxInformeFinal: "",
    maxAprobacionFinal: "",
  });

  const [formData, setFormData] = useState<PeriodoData>(getEmptyForm());
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingId(null);
    setError(null);
    setIsModalOpen(false);
  };

  const handleEdit = (p: any) => {
    setFormData({ ...p });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleAutoFill = () => {
    if (!formData.finRecepcion) {
      alert("Debes definir primero la Fecha de Fin de Recepción");
      return;
    }
    const dates = calculateDates(formData.finRecepcion);
    setFormData((prev) => ({ ...prev, ...dates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const start = new Date(formData.inicioRecepcion);
    const end = new Date(formData.finRecepcion);

    if (end <= start) {
      setError("La fecha de fin de recepción debe ser posterior a la de inicio.");
      setIsSaving(false);
      return;
    }

    let res;
    if (editingId) {
      res = await updatePeriodo(editingId, formData);
    } else {
      res = await createPeriodo(formData);
    }

    setIsSaving(false);
    if (res.success) {
      resetForm();
    } else {
      setError(res.error || "Ocurrió un error.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar este ciclo académico? Esto no se puede deshacer.")) {
      const res = await deletePeriodo(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleToggle = async (id: number, current: boolean) => {
    if (confirm(`¿Estás seguro de ${current ? "cerrar" : "activar"} este ciclo académico?`)) {
      await togglePeriodoActivo(id, current);
    }
  };

  const handleDateChange = (field: keyof PeriodoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Ciclos y Periodos Académicos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Cada ciclo es una cohorte: define la recepción de propuestas de todas las modalidades y las fechas de pasantía.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-brand-red hover:bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Ciclo
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialPeriodos.map((p) => {
          const isRecepcionAbierta = p.activo && new Date() <= new Date(p.finRecepcion + 'T23:59:59');
          const badgeText = !p.activo ? 'Ciclo Cerrado' : (isRecepcionAbierta ? 'Recepción Abierta' : 'Recepción Cerrada');
          const badgeClass = !p.activo ? 'bg-gray-100 text-gray-600' : (isRecepcionAbierta ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800');
          const cardClass = !p.activo 
            ? "border-gray-200 opacity-80" 
            : (isRecepcionAbierta ? "border-emerald-200 ring-1 ring-emerald-100" : "border-amber-200 ring-1 ring-amber-100");
          const ribbonClass = isRecepcionAbierta ? "bg-emerald-500/10" : "bg-amber-500/10";

          return (
            <div key={p.id} className={`border rounded-xl p-5 shadow-sm bg-white flex flex-col relative overflow-hidden transition-all ${cardClass}`}>
              {p.activo && <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -z-0 ${ribbonClass}`}></div>}
              
              <div className="flex justify-between items-start z-10 relative">
                <h3 className="font-bold text-lg text-gray-800">{p.nombre}</h3>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3 z-10 relative flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-gray-500 font-medium">Recepción:</span>
                  <span className={`font-bold ${isRecepcionAbierta ? "text-gray-700" : "text-amber-600"}`}>{p.inicioRecepcion} a {p.finRecepcion}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                  <span className="text-gray-500 font-medium">Informe final (pasantía):</span>
                  <span className="font-bold text-gray-700">{p.maxInformeFinal}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-gray-500 font-medium">Fin Periodo Técnico:</span>
                  <span className="font-bold text-gray-700">{p.maxAprobacionFinal}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between z-10 relative">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${badgeClass}`}>
                  {badgeText}
                </span>
                <button
                  onClick={() => handleToggle(p.id, p.activo)}
                  className={`text-sm font-bold underline ${p.activo ? 'text-gray-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-800'}`}
                >
                  {p.activo ? 'Cerrar Ciclo' : 'Abrir Ciclo'}
                </button>
              </div>
            </div>
          );
        })}

        {initialPeriodos.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No hay ciclos académicos creados aún.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden my-8 relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-800">
                {editingId ? "Editar Ciclo Académico" : "Crear Nuevo Ciclo Académico"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {/* H8 (recorrido integral): lo común del ciclo primero; las fechas que solo usa la pasantía, en su sección. */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="font-bold text-brand-red border-b pb-2">1. Ciclo y recepción de propuestas (todas las modalidades)</h4>
                  <div>
                    <label htmlFor="ciclo-nombre" className="block text-sm font-bold text-gray-700 mb-1">Nombre del ciclo (cohorte)</label>
                    <input
                      id="ciclo-nombre"
                      type="text"
                      required
                      placeholder="Ej. C2-2025"
                      className="w-full border-gray-300 border p-3 rounded-lg focus:ring-brand-red focus:border-brand-red text-gray-900"
                      value={formData.nombre}
                      onChange={(e) => handleDateChange("nombre", e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Es la cohorte de los egresados (carga masiva y usuarios) y la que se marca al habilitar una ficha.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ciclo-inicio" className="block text-sm font-bold text-gray-700 mb-1">Inicio de recepción</label>
                      <input
                        id="ciclo-inicio"
                        type="date"
                        required
                        className="w-full border-gray-300 border p-3 rounded-lg focus:ring-brand-red focus:border-brand-red text-gray-900 text-sm"
                        value={formData.inicioRecepcion}
                        onChange={(e) => handleDateChange("inicioRecepcion", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="ciclo-fin" className="block text-sm font-bold text-gray-700 mb-1">Fin de recepción</label>
                      <input
                        id="ciclo-fin"
                        type="date"
                        required
                        className="w-full border-gray-300 border p-3 rounded-lg focus:ring-brand-red focus:border-brand-red text-gray-900 text-sm"
                        value={formData.finRecepcion}
                        onChange={(e) => handleDateChange("finRecepcion", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-900">
                    <b>Proyecto e investigación</b> toman sus períodos, informes y plazos de su ficha (pestaña Ejecución del constructor).
                    De este ciclo usan la recepción de propuestas y la cohorte.
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-brand-red border-b pb-2">2. Fechas de referencia del ciclo</h4>
                    <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ciclo-maxAprobacionPropuesta" className="block text-xs font-bold text-gray-700 mb-1">Aprobación de propuestas</label>
                      <input id="ciclo-maxAprobacionPropuesta" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxAprobacionPropuesta} onChange={(e) => handleDateChange("maxAprobacionPropuesta", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxInicioProceso" className="block text-xs font-bold text-gray-700 mb-1">Inicio de ejecución</label>
                      <input id="ciclo-maxInicioProceso" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxInicioProceso} onChange={(e) => handleDateChange("maxInicioProceso", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxAprobacionFinal" className="block text-xs font-bold text-gray-700 mb-1">Finalización del periodo técnico</label>
                      <input id="ciclo-maxAprobacionFinal" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxAprobacionFinal} onChange={(e) => handleDateChange("maxAprobacionFinal", e.target.value)} />
                    </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-brand-red border-b pb-2">3. Pasantía</h4>
                  <p className="text-xs text-gray-500">Solo las usa la pasantía (asistente de la fase 1): los cuatro informes mensuales, la visita del asesor y el informe final consolidado.</p>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-800 mb-3">Se pueden calcular a partir del <b>fin de recepción</b> (regla de los 150 días de pasantía); también llena las fechas de referencia.</p>
                    <button type="button" onClick={handleAutoFill} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm">
                      ✨ Calcular fechas automáticamente
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ciclo-maxPrimerInforme" className="block text-xs font-bold text-gray-700 mb-1">Primer informe</label>
                      <input id="ciclo-maxPrimerInforme" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxPrimerInforme} onChange={(e) => handleDateChange("maxPrimerInforme", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxSegundoInforme" className="block text-xs font-bold text-gray-700 mb-1">Segundo informe</label>
                      <input id="ciclo-maxSegundoInforme" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxSegundoInforme} onChange={(e) => handleDateChange("maxSegundoInforme", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxTercerInforme" className="block text-xs font-bold text-gray-700 mb-1">Tercer informe</label>
                      <input id="ciclo-maxTercerInforme" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxTercerInforme} onChange={(e) => handleDateChange("maxTercerInforme", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxCuartoInforme" className="block text-xs font-bold text-gray-700 mb-1">Cuarto informe</label>
                      <input id="ciclo-maxCuartoInforme" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxCuartoInforme} onChange={(e) => handleDateChange("maxCuartoInforme", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-visitaAsesorInicio" className="block text-xs font-bold text-gray-700 mb-1">Inicio de la visita del asesor</label>
                      <input id="ciclo-visitaAsesorInicio" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.visitaAsesorInicio} onChange={(e) => handleDateChange("visitaAsesorInicio", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-visitaAsesorFin" className="block text-xs font-bold text-gray-700 mb-1">Fin de la visita del asesor</label>
                      <input id="ciclo-visitaAsesorFin" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.visitaAsesorFin} onChange={(e) => handleDateChange("visitaAsesorFin", e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ciclo-maxInformeFinal" className="block text-xs font-bold text-gray-700 mb-1">Informe final (consolidado)</label>
                      <input id="ciclo-maxInformeFinal" type="date" required className="w-full border-gray-300 border p-2 rounded focus:ring-brand-red text-sm" value={formData.maxInformeFinal} onChange={(e) => handleDateChange("maxInformeFinal", e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Ciclo y Fechas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
