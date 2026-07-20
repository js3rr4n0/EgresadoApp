"use client";

import { useState, useEffect } from "react";
import { saveActividades } from "@/app/actions/actividades";
import { useRouter } from "next/navigation";

interface Actividad {
  id: string; // internal id for UI
  periodo: number;
  semana: number;
  descripcion: string;
}

interface PeriodoDisplay {
  num: number;
  name: string;
  range: string;
}

interface ActividadesFormProps {
  propuestaId: number;
  initialFechas: { fechaInicio: string, fechaFin: string };
  initialActividades: any[];
}

export default function ActividadesForm({ propuestaId, initialFechas, initialActividades }: ActividadesFormProps) {
  const router = useRouter();
  
  const [fechaInicio, setFechaInicio] = useState(initialFechas?.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(initialFechas?.fechaFin || "");
  
  const [periodos, setPeriodos] = useState<PeriodoDisplay[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number>(1);
  
  const [actividades, setActividades] = useState<Actividad[]>([]);
  
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse initial activities
  useEffect(() => {
    if (initialActividades && initialActividades.length > 0) {
      setActividades(initialActividades.map(a => ({
        id: crypto.randomUUID(),
        periodo: a.periodo,
        semana: a.semana,
        descripcion: a.descripcion
      })));
    }
  }, [initialActividades]);

  // Handle date changes and generate periods
  useEffect(() => {
    if (fechaInicio) {
      const start = new Date(fechaInicio);
      const end = new Date(start);
      end.setDate(start.getDate() + 150);
      setFechaFin(end.toISOString().split('T')[0]);

      // Generate periods (months)
      const generatedPeriods: PeriodoDisplay[] = [];
      let current = new Date(start);
      let periodNum = 1;
      
      while (current <= end) {
        const monthStart = new Date(current);
        // Find end of this month, or 'end' date, whichever is earlier
        let monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Last day of month
        if (monthEnd > end) {
          monthEnd = new Date(end);
        }

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const name = monthNames[monthStart.getMonth()];
        
        const formatStr = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        generatedPeriods.push({
          num: periodNum,
          name: name,
          range: `${formatStr(monthStart)} al ${formatStr(monthEnd)}`
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

  const handleDateChange = (val: string) => {
    setFechaInicio(val);
  };

  const addRow = () => {
    setActividades([...actividades, {
      id: crypto.randomUUID(),
      periodo: selectedPeriodo,
      semana: 1,
      descripcion: ""
    }]);
  };

  const updateRow = (id: string, field: keyof Actividad, value: any) => {
    setActividades(actividades.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const deleteRow = (id: string) => {
    if (confirm("¿Eliminar esta actividad?")) {
      setActividades(actividades.filter(a => a.id !== id));
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

    if (actividades.some(a => !a.descripcion.trim())) {
      setError("Todas las actividades deben tener una descripción.");
      setPending(false);
      return;
    }

    // Assign sequential numbers per period
    const finalData: any[] = [];
    for (let p = 1; p <= periodos.length; p++) {
      const perActs = actividades.filter(a => a.periodo === p);
      perActs.forEach((act, index) => {
        finalData.push({
          periodo: act.periodo,
          semana: act.semana,
          numero: index + 1,
          descripcion: act.descripcion
        });
      });
    }

    const res = await saveActividades(propuestaId, finalData, fechaInicio, fechaFin);
    if (res.success) {
      const params = new URLSearchParams(window.location.search);
      params.set("step", "6");
      router.push(`?${params.toString()}`);
    } else {
      setError(res.error || "Error al guardar");
      setPending(false);
    }
  };

  const currentPeriodActs = actividades.filter(a => a.periodo === selectedPeriodo);

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {/* Dates Selection */}
      <div className="bg-slate-50 border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Fechas de Ejecución</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Inicio de Pasantía</label>
            <input type="date" value={fechaInicio} onChange={(e) => handleDateChange(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">Fin de Pasantía (Automático a 150 días)</label>
            <input type="date" value={fechaFin} readOnly className="w-full px-3 py-2 rounded-lg border border-border bg-slate-100 cursor-not-allowed text-sm" />
          </div>
        </div>
      </div>

      {periodos.length > 0 && (
        <>
          {/* Periods grid */}
          <div>
            <h3 className="text-lg font-bold text-card-dark mb-1">Períodos del Plan</h3>
            <p className="text-xs text-muted mb-4">Estos son los períodos (meses) generados a partir de tus fechas.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {periodos.map(p => {
                const isActive = selectedPeriodo === p.num;
                return (
                  <button
                    key={p.num}
                    type="button"
                    onClick={() => setSelectedPeriodo(p.num)}
                    className={`relative overflow-hidden flex flex-col items-start p-4 rounded-xl border transition-all duration-200 text-left ${
                      isActive 
                        ? 'border-brand-red bg-red-50/40 shadow-md ring-1 ring-brand-red/20 scale-[1.02]' 
                        : 'border-border bg-white hover:border-brand-red/30 hover:bg-slate-50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-xs shadow-sm ${
                        isActive ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.num}
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-red-100 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></span>
                          <span className="text-[9px] font-bold text-brand-red uppercase">Activo</span>
                        </div>
                      )}
                    </div>
                    <p className={`text-base font-bold tracking-tight mb-0.5 ${isActive ? 'text-brand-red' : 'text-card-dark'}`}>{p.name}</p>
                    <p className={`text-[11px] font-semibold tracking-wide ${isActive ? 'text-red-700/70' : 'text-slate-400'}`}>
                      {p.range}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activities Table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 border-b border-border flex justify-between items-center">
              <div>
                <h4 className="font-bold text-card-dark">Actividades del Período {selectedPeriodo}</h4>
                <p className="text-xs text-muted">Añade las actividades que realizarás en este mes.</p>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar Actividad
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3 w-40">Semana</th>
                    <th className="px-4 py-3 w-32 text-center">Nº Actividad</th>
                    <th className="px-4 py-3 w-32 text-center">Código</th>
                    <th className="px-4 py-3">Descripción de actividad</th>
                    <th className="px-4 py-3 w-20 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPeriodActs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        No hay actividades para este período. Haz clic en "Agregar Actividad".
                      </td>
                    </tr>
                  ) : (
                    currentPeriodActs.map((act, idx) => {
                      const numero = idx + 1;
                      const codigo = `${act.periodo}.${act.semana}.${numero}`;
                      return (
                        <tr key={act.id} className="border-b border-border last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <select 
                              value={act.semana}
                              onChange={(e) => updateRow(act.id, 'semana', parseInt(e.target.value))}
                              className="w-full bg-white border border-border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-red outline-none"
                            >
                              <option value={1}>SEMANA 1</option>
                              <option value={2}>SEMANA 2</option>
                              <option value={3}>SEMANA 3</option>
                              <option value={4}>SEMANA 4</option>
                              <option value={5}>SEMANA 5</option>
                              <option value={6}>SEMANA 6</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex w-8 h-8 items-center justify-center bg-slate-100 text-slate-600 rounded font-bold">
                              {numero}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                              {codigo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={act.descripcion}
                              onChange={(e) => updateRow(act.id, 'descripcion', e.target.value)}
                              placeholder="Ej. Capacitación inicial"
                              required
                              className="w-full bg-white border border-border rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-brand-red outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => deleteRow(act.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Borrar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        </>
      )}

      <div className="flex justify-between items-center pt-6 border-t border-border mt-8">
        <button type="button" onClick={() => router.push('?step=4')} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
          ← Volver a Carta de Aceptación
        </button>
        <button 
          type="submit" 
          disabled={pending || periodos.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Siguiente Fase"}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </form>
  );
}
