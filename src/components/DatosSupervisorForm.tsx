"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { solicitarRevisionEmpresa } from "@/app/actions/propuestas";

interface Supervisor {
  id: number;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
  especialidad: string | null;
  titulo: string | null;
  sucursalId: number | null;
}

interface Sucursal {
  id: number;
  nombre: string;
}

interface DatosSupervisorFormProps {
  propuestaId: number;
  empresaId: number | null;
  initialSupervisorId: number | null;
  supervisores: Supervisor[];
  sucursales: Sucursal[];
}

export default function DatosSupervisorForm({
  propuestaId,
  empresaId,
  initialSupervisorId,
  supervisores,
  sucursales,
}: DatosSupervisorFormProps) {
  const router = useRouter();
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(initialSupervisorId || null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [problemMode, setProblemMode] = useState<"edit_existing" | "create_new" | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Revision Form state
  const [revData, setRevData] = useState({
    supervisor: {
      titulo: "",
      nombres: "",
      apellidos: "",
      cargo: "",
      especialidad: "",
      telefono: "",
      correo: "",
      targetSucursalId: undefined as number | undefined,
      targetSupervisorId: undefined as number | undefined,
    }
  });

  const selectedSupervisor = supervisores.find(s => s.id === selectedSupervisorId);

  const handleProblemSelection = (mode: "edit_existing" | "create_new") => {
    setProblemMode(mode);
    setProblemModalOpen(false);

    if (mode === "edit_existing" && selectedSupervisor) {
      setRevData({
        supervisor: {
          titulo: selectedSupervisor.titulo || "",
          nombres: selectedSupervisor.nombres || "",
          apellidos: selectedSupervisor.apellidos || "",
          cargo: selectedSupervisor.cargo || "",
          especialidad: selectedSupervisor.especialidad || "",
          telefono: selectedSupervisor.telefono || "",
          correo: selectedSupervisor.correo || "",
          targetSucursalId: selectedSupervisor.sucursalId || undefined,
          targetSupervisorId: selectedSupervisor.id,
        }
      });
    } else {
      setRevData({
        supervisor: {
          titulo: "",
          nombres: "",
          apellidos: "",
          cargo: "",
          especialidad: "",
          telefono: "",
          correo: "",
          targetSucursalId: undefined,
          targetSupervisorId: undefined,
        }
      });
    }
    
    setFormModalOpen(true);
  };

  const handleExistingSupervisorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setRevData({
        supervisor: {
          titulo: "",
          nombres: "",
          apellidos: "",
          cargo: "",
          especialidad: "",
          telefono: "",
          correo: "",
          targetSucursalId: undefined,
          targetSupervisorId: undefined,
        }
      });
      return;
    }

    const sup = supervisores.find(s => s.id === Number(val));
    if (sup) {
      setRevData({
        supervisor: {
          titulo: sup.titulo || "",
          nombres: sup.nombres || "",
          apellidos: sup.apellidos || "",
          cargo: sup.cargo || "",
          especialidad: sup.especialidad || "",
          telefono: sup.telefono || "",
          correo: sup.correo || "",
          targetSucursalId: sup.sucursalId || undefined,
          targetSupervisorId: sup.id,
        }
      });
    }
  };

  const handleSave = async (proceed: boolean) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/propuestas/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propuestaId, supervisorId: selectedSupervisorId }),
      });
      const data = await res.json();
      setIsSaving(false);
      
      if (data.success) {
        if (proceed) {
          router.push(`?step=4`);
        } else {
          alert("Borrador guardado correctamente.");
        }
        router.refresh();
      } else {
        alert(data.error || "Error al guardar el supervisor.");
      }
    } catch (error) {
      setIsSaving(false);
      alert("Error de conexión al guardar.");
    }
  };

  const handleSubmitRevision = async () => {
    setIsSubmittingRevision(true);
    const dataToSend = {
      empresa: { targetEmpresaId: empresaId }, // Mantener la empresa
      supervisor: revData.supervisor
    };
    const res = await solicitarRevisionEmpresa(propuestaId, dataToSend, problemMode || "create_new");
    setIsSubmittingRevision(false);

    if (res.success) {
      setConfirmModalOpen(false);
      setFormModalOpen(false);
      alert("Solicitud de supervisor enviada correctamente.");
      router.refresh();
    } else {
      alert(res.error || "Error al enviar la solicitud.");
    }
  };

  if (!empresaId) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl text-center">
        <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h3 className="font-bold text-lg mb-2">Empresa no seleccionada</h3>
        <p className="max-w-md mx-auto">Debes completar el Paso 2 seleccionando una empresa antes de poder elegir un supervisor.</p>
        <button 
          onClick={() => router.push('?step=2')}
          className="mt-6 px-6 py-2.5 bg-brand-red text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          Ir al Paso 2
        </button>
      </div>
    );
  }

  const InputLock = () => (
    <div className="absolute right-3 top-3 text-slate-400">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">
            Selecciona un supervisor <span className="text-brand-red">*</span>
          </label>
          <select
            value={selectedSupervisorId || ""}
            onChange={(e) => setSelectedSupervisorId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-2.5 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none"
          >
            <option value="">-- Seleccionar Supervisor --</option>
            {supervisores.map(sup => (
              <option key={sup.id} value={sup.id}>
                {sup.nombres} {sup.apellidos} {sup.cargo ? `(${sup.cargo})` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedSupervisor && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-card-dark border-b border-slate-200 pb-2">Datos del supervisor seleccionado</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nombres</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.nombres} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Apellidos</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.apellidos} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Cargo</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.cargo || "Sin cargo"} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Especialidad</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.especialidad || "Sin especialidad"} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Teléfono</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.telefono || "Sin teléfono"} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Correo Electrónico</label>
                <div className="relative">
                  <input type="text" readOnly value={selectedSupervisor.correo || "Sin correo"} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 cursor-not-allowed" />
                  <InputLock />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg">¿El supervisor no está en la lista o tiene datos erróneos?</h3>
            <p className="text-blue-800/80 text-sm mt-1">
              Si tu supervisor no se encuentra registrado en la empresa o deseas actualizar sus datos, presiona{" "}
              <button onClick={() => setProblemModalOpen(true)} type="button" className="font-bold underline hover:text-blue-600">aquí</button>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center sm:justify-start gap-4 mt-8 pt-6 border-t border-border flex-wrap">
        <button 
          type="button" 
          onClick={() => handleSave(false)}
          disabled={isSaving || !selectedSupervisorId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          {isSaving ? "Guardando..." : "Guardar Borrador"}
        </button>
        <button 
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSaving || !selectedSupervisorId}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-red text-white hover:bg-red-700 font-bold text-sm transition-colors disabled:opacity-50"
        >
          Siguiente Paso
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* 1. Problem Modal */}
      {problemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-border">
              <h3 className="text-xl font-bold text-card-dark">¿Cuál es el problema con el supervisor?</h3>
              <p className="text-sm text-muted mt-1">Selecciona la opción que mejor describa tu situación.</p>
            </div>
            <div className="p-6 space-y-4">
              <button 
                onClick={() => handleProblemSelection("edit_existing")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[#3b82f6] hover:bg-[#eff6ff] transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-[#4f46e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-card-dark">Tu supervisor existe pero los datos no son correctos</h4>
                  <p className="text-sm text-muted">Podrás seleccionar un supervisor y enviar una solicitud para actualizar su información.</p>
                </div>
              </button>

              <button 
                onClick={() => handleProblemSelection("create_new")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[#8b5cf6] hover:bg-[#f5f3ff] transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#ede9fe] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-card-dark">Tu supervisor no existe</h4>
                  <p className="text-sm text-muted">Podrás registrar un nuevo supervisor para la empresa.</p>
                </div>
              </button>
            </div>
            <div className="p-6 border-t border-border bg-slate-50/50">
              <button 
                onClick={() => setProblemModalOpen(false)}
                className="w-full px-5 py-3 rounded-xl border border-border bg-white text-card-dark font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal for adding/editing supervisor */}
      {formModalOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-border flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-card-dark">
                {problemMode === "edit_existing" ? "Actualizar datos de supervisor" : "Registrar nuevo supervisor"}
              </h3>
              <button onClick={() => setFormModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm mb-6 border border-blue-100">
                <p><strong>Importante:</strong> Al enviar esta solicitud, tu propuesta entrará en estado de revisión y <strong>no podrás continuar al siguiente paso</strong> hasta que administración apruebe los datos del supervisor.</p>
              </div>

              {problemMode === "edit_existing" && (
                <div className="mb-6 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Selecciona el supervisor a editar <span className="text-brand-red">*</span></label>
                  <select 
                    value={revData.supervisor.targetSupervisorId || ""} 
                    onChange={handleExistingSupervisorSelect}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                  >
                    <option value="">-- Seleccionar supervisor --</option>
                    {supervisores.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.nombres} {sup.apellidos} {sup.cargo ? `(${sup.cargo})` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Título (Ej: Ing., Lic.)</label>
                    <input type="text" value={revData.supervisor.titulo} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, titulo: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Sucursal (Opcional)</label>
                    <select value={revData.supervisor.targetSucursalId || ""} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, targetSucursalId: e.target.value ? Number(e.target.value) : undefined}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red">
                      <option value="">-- No pertenece a sucursal específica --</option>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Nombres <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.nombres} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, nombres: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Apellidos <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.apellidos} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, apellidos: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Especialidad</label>
                  <input type="text" value={revData.supervisor.especialidad} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, especialidad: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Cargo</label>
                  <input type="text" value={revData.supervisor.cargo} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, cargo: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Teléfono</label>
                    <input type="tel" value={revData.supervisor.telefono} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, telefono: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Correo Electrónico</label>
                    <input type="email" value={revData.supervisor.correo} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, correo: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0 bg-white">
              <button onClick={() => setFormModalOpen(false)} type="button" className="px-5 py-2.5 rounded-lg border border-border text-card-dark font-bold text-sm bg-white hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={!revData.supervisor.nombres || !revData.supervisor.apellidos || (problemMode === "edit_existing" && !revData.supervisor.targetSupervisorId)}
                onClick={() => setConfirmModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-[#b90000] hover:bg-[#a00000] text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                Mandar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-card-dark">Confirmar envío</h3>
              <p className="text-sm text-muted">Una vez enviada, deberás esperar a que administración valide al supervisor para poder avanzar.</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-border flex gap-3">
              <button onClick={() => setConfirmModalOpen(false)} disabled={isSubmittingRevision} className="flex-1 py-2 rounded-lg border border-border text-sm font-bold text-card-dark hover:bg-white transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSubmitRevision} disabled={isSubmittingRevision} className="flex-1 py-2 rounded-lg bg-[#b90000] text-white text-sm font-bold hover:bg-[#a00000] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {isSubmittingRevision ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
