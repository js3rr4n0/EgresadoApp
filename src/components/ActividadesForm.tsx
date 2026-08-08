"use client";

import { useState, useEffect } from "react";
import { saveActividades } from "@/app/actions/actividades";
import { useRouter } from "next/navigation";

interface Actividad {
  id: string; // internal id for UI
  periodo: number;
  semana: number;
  titulo: string;
  descripcion: string;
}

interface PeriodoDisplay {
  num: number;
  name: string;
  range: string;
  weeks: number;
}

interface ActividadesFormProps {
  propuestaId: number;
  initialFechas: { fechaInicio: string; fechaFin: string };
  initialActividades: any[];
}

export default function ActividadesForm({
  propuestaId,
  initialFechas,
  initialActividades,
}: ActividadesFormProps) {
  const router = useRouter();

  const [fechaInicio, setFechaInicio] = useState(initialFechas?.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(initialFechas?.fechaFin || "");

  const [periodos, setPeriodos] = useState<PeriodoDisplay[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number>(1);

  const [actividades, setActividades] = useState<Actividad[]>([]);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGantt, setShowGantt] = useState(true);

  // Parse initial activities
  useEffect(() => {
    if (initialActividades && initialActividades.length > 0) {
      const sorted = [...initialActividades].sort((a, b) => {
        if (a.periodo !== b.periodo) return a.periodo - b.periodo;
        if (a.semana !== b.semana) return a.semana - b.semana;
        return (a.numero || 0) - (b.numero || 0);
      });

      setActividades(
        sorted.map((a) => ({
          id: crypto.randomUUID(),
          periodo: a.periodo,
          semana: a.semana,
          titulo: a.titulo || "",
          descripcion: a.descripcion || "",
        }))
      );
    }
  }, [initialActividades]);

  useEffect(() => {
    if (initialFechas?.fechaInicio) {
      setFechaInicio(initialFechas.fechaInicio);
    }
    if (initialFechas?.fechaFin) {
      setFechaFin(initialFechas.fechaFin);
    }
  }, [initialFechas?.fechaInicio, initialFechas?.fechaFin]);

  // Handle date changes and generate periods
  useEffect(() => {
    if (fechaInicio) {
      const start = new Date(fechaInicio);
      const end = new Date(start);
      end.setDate(start.getDate() + 150);
      setFechaFin(end.toISOString().split("T")[0]);

      // Generate periods (months)
      const generatedPeriods: PeriodoDisplay[] = [];
      let current = new Date(start);
      let periodNum = 1;

      while (current <= end) {
        const monthStart = new Date(current);
        let monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Last day of month
        if (monthEnd > end) {
          monthEnd = new Date(end);
        }

        const monthNames = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ];
        const name = monthNames[monthStart.getMonth()];

        const formatStr = (d: Date) =>
          `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

        const diffTime = Math.abs(monthEnd.getTime() - monthStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const weeks = Math.ceil(diffDays / 7);

        generatedPeriods.push({
          num: periodNum,
          name: name,
          range: `${formatStr(monthStart)} al ${formatStr(monthEnd)}`,
          weeks: weeks > 0 ? weeks : 1,
        });

        // Move to next month
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        periodNum++;
      }

      setPeriodos(generatedPeriods);
      if (selectedPeriodo > generatedPeriods.length) {
        setSelectedPeriodo(1);
      }
    } else {
      setPeriodos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio]);

  const addRow = () => {
    const periodActs = actividades.filter((a) => a.periodo === selectedPeriodo);
    const lastSemana = periodActs.length > 0 ? periodActs[periodActs.length - 1].semana : 1;

    const newAct: Actividad = {
      id: crypto.randomUUID(),
      periodo: selectedPeriodo,
      semana: lastSemana,
      titulo: "",
      descripcion: "",
    };

    setActividades((prev) => {
      const updated = [...prev, newAct];
      return updated.sort((a, b) => {
        if (a.periodo !== b.periodo) return a.periodo - b.periodo;
        return a.semana - b.semana;
      });
    });
  };

  const updateRow = (id: string, field: keyof Actividad, value: any) => {
    setActividades((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, [field]: value } : a));
      if (field === "semana") {
        return updated.sort((a, b) => {
          if (a.periodo !== b.periodo) return a.periodo - b.periodo;
          return a.semana - b.semana;
        });
      }
      return updated;
    });
  };

  const deleteRow = (id: string) => {
    if (confirm("¿Eliminar esta actividad?")) {
      setActividades(actividades.filter((a) => a.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!fechaInicio || !fechaFin) {
      setError("Las fechas de pasantía son obligatorias.");
      setPending(false);
      return;
    }

    if (periodos.length === 0) {
      setError("No se han generado períodos válidos a partir de la fecha de inicio.");
      setPending(false);
      return;
    }

    // Validation: Minimum 4 activities per period (month), 1 per week minimum
    for (let p = 1; p <= periodos.length; p++) {
      const pDef = periodos.find((per) => per.num === p);
      const pActs = actividades.filter((a) => a.periodo === p);

      if (pActs.length < 4) {
        setError(
          `El Período ${p} (${pDef?.name || `Mes ${p}`}) debe contener un mínimo de 4 actividades (al menos 1 por semana). Actualmente tiene ${pActs.length}.`
        );
        setSelectedPeriodo(p);
        setPending(false);
        return;
      }

      for (const act of pActs) {
        if (!act.titulo.trim()) {
          setError(`Todas las actividades deben tener un Título (revisar Período ${p}).`);
          setSelectedPeriodo(p);
          setPending(false);
          return;
        }
        if (!act.descripcion.trim()) {
          setError(`Todas las actividades deben tener una Descripción (revisar Período ${p}).`);
          setSelectedPeriodo(p);
          setPending(false);
          return;
        }
      }

      // Check minimum 1 activity per week for weeks 1..Math.min(4, pDef.weeks)
      const weeksToCover = Math.min(4, pDef?.weeks || 4);
      for (let w = 1; w <= weeksToCover; w++) {
        const hasActInWeek = pActs.some((a) => a.semana === w);
        if (!hasActInWeek) {
          setError(
            `El Período ${p} (${pDef?.name}) debe tener al menos 1 actividad registrada en la Semana ${w}.`
          );
          setSelectedPeriodo(p);
          setPending(false);
          return;
        }
      }
    }

    // Assign sequential numbers per period
    const finalData: any[] = [];
    for (let p = 1; p <= periodos.length; p++) {
      const perActs = actividades.filter((a) => a.periodo === p);
      perActs.forEach((act, index) => {
        finalData.push({
          periodo: act.periodo,
          semana: act.semana,
          numero: index + 1,
          titulo: act.titulo.trim(),
          descripcion: act.descripcion.trim(),
        });
      });
    }

    const res = await saveActividades(propuestaId, finalData, fechaInicio, fechaFin);
    if (res.success) {
      const params = new URLSearchParams(window.location.search);
      params.set("id", propuestaId.toString());
      params.set("step", "6");
      router.push(`?${params.toString()}`);
    } else {
      setError(res.error || "Error al guardar");
      setPending(false);
    }
  };

  const currentPeriodActs = actividades
    .filter((a) => a.periodo === selectedPeriodo)
    .sort((a, b) => a.semana - b.semana);
  const currentPeriodDef = periodos.find((p) => p.num === selectedPeriodo);
  const maxWeeks = currentPeriodDef ? currentPeriodDef.weeks : 4;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold flex items-center gap-3 shadow-xs">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Dates Display */}
      <div className="bg-slate-50 border border-border rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">
          Fechas de Ejecución (Calculadas en Carta de Aceptación)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Inicio de Pasantía (Establecida en Carta de Aceptación)
            </label>
            <input
              type="date"
              value={fechaInicio}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-border bg-slate-100 cursor-not-allowed text-sm font-semibold text-slate-700 outline-none"
              title="Fecha calculada automáticamente en la Carta de Aceptación"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Fin de Pasantía (Automático a 150 días)
            </label>
            <input
              type="date"
              value={fechaFin}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-border bg-slate-100 cursor-not-allowed text-sm font-semibold text-slate-700 outline-none"
              title="Fecha de finalización de pasantía"
            />
          </div>
        </div>
      </div>

      {periodos.length > 0 && (
        <>
          {/* Periods grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-card-dark">Períodos del Plan</h3>
                <p className="text-xs text-muted">
                  Se requieren al menos 4 actividades por período (mínimo 1 por semana).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGantt(!showGantt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
              >
                📊 {showGantt ? "Ocultar Gantt" : "Ver Diagrama de Gantt"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
              {periodos.map((p) => {
                const isActive = selectedPeriodo === p.num;
                const pActs = actividades.filter((a) => a.periodo === p.num);
                const isComplete = pActs.length >= 4;

                return (
                  <button
                    key={p.num}
                    type="button"
                    onClick={() => setSelectedPeriodo(p.num)}
                    className={`relative overflow-hidden flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left ${
                      isActive
                        ? "border-brand-red bg-red-50/40 shadow-md ring-1 ring-brand-red/20 scale-[1.02]"
                        : "border-border bg-white hover:border-brand-red/30 hover:bg-slate-50 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs shadow-xs ${
                          isActive ? "bg-brand-red text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.num}
                      </div>

                      <div className="flex items-center gap-1">
                        {isComplete ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ✓ {pActs.length} acts
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⚠️ {pActs.length}/4 acts
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-base font-bold tracking-tight mb-0.5 ${
                        isActive ? "text-brand-red" : "text-card-dark"
                      }`}
                    >
                      {p.name}
                    </p>
                    <p
                      className={`text-[11px] font-semibold tracking-wide ${
                        isActive ? "text-red-700/70" : "text-slate-400"
                      }`}
                    >
                      {p.range} ({p.weeks} {p.weeks === 1 ? "sem" : "sems"})
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activities Table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs mt-8">
            <div className="bg-slate-50 p-4 border-b border-border flex justify-between items-center flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-card-dark">Actividades del Período {selectedPeriodo} ({currentPeriodDef?.name})</h4>
                <p className="text-xs text-muted">
                  Este período contiene {maxWeeks} semanas. Registra el título y descripción de cada actividad en orden secuencial.
                </p>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors border border-blue-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Actividad
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-border">
                  <tr>
                    <th className="px-3 py-3 w-32">Semana</th>
                    <th className="px-3 py-3 w-20 text-center">Nº</th>
                    <th className="px-3 py-3 w-24 text-center">Código</th>
                    <th className="px-3 py-3 w-1/3">Título de Actividad</th>
                    <th className="px-3 py-3">Descripción de Actividad</th>
                    <th className="px-3 py-3 w-16 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPeriodActs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No hay actividades para este período. Haz clic en <strong>"Agregar Actividad"</strong> (se requieren mínimo 4).
                      </td>
                    </tr>
                  ) : (
                    currentPeriodActs.map((act, idx) => {
                      const minWeek = idx > 0 ? currentPeriodActs[idx - 1].semana : 1;
                      const numero = idx + 1;
                      const codigo = `${act.periodo}.${act.semana}.${numero}`;
                      return (
                        <tr key={act.id} className="border-b border-border last:border-0 hover:bg-slate-50/50">
                          <td className="px-3 py-3">
                            <select
                              value={act.semana > maxWeeks ? maxWeeks : act.semana}
                              onChange={(e) => updateRow(act.id, "semana", parseInt(e.target.value))}
                              className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none"
                            >
                              {Array.from({ length: maxWeeks }).map((_, i) => {
                                const weekNum = i + 1;
                                const isDisabled = weekNum < minWeek;
                                return (
                                  <option key={weekNum} value={weekNum} disabled={isDisabled}>
                                    Semana {weekNum} {isDisabled ? `(S${minWeek}+)` : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 text-slate-700 rounded font-bold text-xs">
                              {numero}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                              {codigo}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={act.titulo}
                              onChange={(e) => updateRow(act.id, "titulo", e.target.value)}
                              placeholder="Ej. Capacitación inicial"
                              required
                              className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={act.descripcion}
                              onChange={(e) => updateRow(act.id, "descripcion", e.target.value)}
                              placeholder="Ej. Inducción al sistema interno y herramientas..."
                              required
                              className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-brand-red outline-none"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => deleteRow(act.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Borrar Actividad"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ────────────────── DIAGRAMA DE GANTT RE-DISEÑADO ────────────────── */}
          {showGantt && actividades.length > 0 && (
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm space-y-0">
              <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="font-extrabold text-white text-base">Diagrama de Gantt del Plan de Pasantía</h4>
                    <p className="text-xs text-red-200">Cronograma cronológico generado dinámicamente según las semanas de cada período.</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full">
                  {actividades.length} Actividades Registradas
                </span>
              </div>

              <div className="overflow-x-auto p-4 bg-slate-50/50">
                <table className="w-full text-xs border-collapse min-w-[700px] bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="p-2.5 text-center border-r border-slate-700 w-24">Código</th>
                      <th className="p-2.5 text-left border-r border-slate-700 w-52">Título / Actividad</th>
                      {periodos.map((p) => (
                        <th key={p.num} colSpan={p.weeks} className="p-2 text-center border-r border-slate-700 bg-slate-900/90 font-bold">
                          <span className="inline-block bg-slate-800 px-2 py-0.5 rounded text-[10px] text-red-200">
                            {p.name} (MES {p.num})
                          </span>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] border-b border-slate-300">
                      <th className="p-2 border-r border-slate-200" colSpan={2}>
                        Semanas por Período
                      </th>
                      {periodos.flatMap((p) =>
                        Array.from({ length: p.weeks }).map((_, wIdx) => (
                          <th key={`${p.num}-${wIdx + 1}`} className="p-1.5 text-center border-r border-slate-200 w-10 font-mono bg-slate-50">
                            S{wIdx + 1}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {actividades.map((act, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={act.id} className={isEven ? "bg-white hover:bg-slate-50" : "bg-slate-50/60 hover:bg-slate-100/70"}>
                          <td className="p-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            <span className="inline-block bg-slate-100 text-red-900 border border-slate-300 px-1.5 py-0.5 rounded font-extrabold text-[11px]">
                              {act.periodo}.{act.semana}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            <span className="font-bold text-slate-900 text-xs block leading-tight">{act.titulo || "Sin Título"}</span>
                            <span className="text-[10px] text-slate-500 truncate block mt-0.5 leading-tight">{act.descripcion}</span>
                          </td>
                          {periodos.flatMap((p) =>
                            Array.from({ length: p.weeks }).map((_, wIdx) => {
                              const weekNum = wIdx + 1;
                              const isActiveCell = act.periodo === p.num && act.semana === weekNum;
                              return (
                                <td
                                  key={`${act.id}-${p.num}-${weekNum}`}
                                  className="p-0.5 border-r border-slate-200/60 text-center align-middle h-9"
                                >
                                  {isActiveCell && (
                                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-[10px] font-extrabold py-1.5 px-1 rounded-md shadow-xs flex items-center justify-center border border-red-500 gap-1 animate-in fade-in">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>
                                      <span>S{weekNum}</span>
                                    </div>
                                  )}
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

              <div className="bg-slate-100 px-4 py-2 flex items-center justify-between text-xs text-slate-600 font-semibold border-t border-slate-200">
                <span>Total Actividades Programadas: {actividades.length}</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-gradient-to-r from-red-600 to-red-700 border border-red-500 inline-block"></span>
                    Semana de Ejecución Programada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block"></span>
                    Sin Actividad
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-border mt-8">
        <button
          type="button"
          onClick={() => router.push("?step=4")}
          className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors"
        >
          ← Volver a Carta de Aceptación
        </button>
        <button
          type="submit"
          disabled={pending || periodos.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
        >
          {pending ? "Guardando..." : "Siguiente Fase"}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </form>
  );
}
