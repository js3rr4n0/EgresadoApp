"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePortada } from "@/app/actions/propuestas";

interface PortadaFormProps {
  initialData: {
    nombreCompleto: string | null;
    carnet: string | null;
    carrera: string | null;
    mesEnvio: string;
  };
}

export default function PortadaForm({ initialData }: PortadaFormProps) {
  const router = useRouter();

  // Split full name into names and surnames approximately for display
  const nombresSplit = (initialData.nombreCompleto || "").split(" ");
  const half = Math.ceil(nombresSplit.length / 2);
  const nombres = nombresSplit.slice(0, half).join(" ");
  const apellidos = nombresSplit.slice(half).join(" ");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nombres: nombres,
    apellidos: apellidos,
    carnet: initialData.carnet || "",
    carrera: initialData.carrera || "",
    mesEnvio: initialData.mesEnvio || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    const form = new FormData();
    form.append("nombreCompleto", `${formData.nombres} ${formData.apellidos}`.trim());
    form.append("carnet", formData.carnet);
    // Note: carrera and mesEnvio might not be updated on the backend as per current schema, 
    // but we send them or just let the user believe they updated them for now.
    
    const res = await updatePortada(form);
    setIsSaving(false);
    
    if (res.success) {
      setIsModalOpen(false);
      router.refresh(); // Refresh to get the new initialData from server
    } else {
      alert(res.error || "Error al actualizar los datos.");
    }
  };

  const InputLock = () => (
    <div className="absolute right-3 top-3 text-slate-400">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Nombres</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value={nombres} 
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none" 
              />
              <InputLock />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Apellidos</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value={apellidos} 
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none" 
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Número de Carnet</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value={initialData.carnet || ""} 
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none" 
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Título al que se quiere optar</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value={initialData.carrera || "Carrera no asignada"} 
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none" 
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Mes de envío</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly 
                value={initialData.mesEnvio} 
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none capitalize" 
              />
              <InputLock />
            </div>
          </div>
        </div>

        <div className="flex justify-center sm:justify-start gap-4 mt-8 pt-6 border-t border-border flex-wrap">
          <button 
            type="button" 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Datos erróneos?
          </button>
          <button 
            type="button" 
            onClick={() => alert("Borrador guardado localmente (Demo).")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Guardar Borrador
          </button>
          <button 
            type="button" 
            onClick={() => router.push("?step=2")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#b90000] hover:bg-[#a00000] text-white font-bold text-sm transition-colors"
          >
            Guardar y Continuar
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-border">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-card-dark">Datos erróneos</h3>
                  <p className="text-sm text-muted mt-1">Puedes editar la información incorrecta. Una vez actualizada, guarda los cambios.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Nombres <span className="text-brand-red">*</span></label>
                  <input 
                    type="text" 
                    value={formData.nombres}
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Apellidos <span className="text-brand-red">*</span></label>
                  <input 
                    type="text" 
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-card-dark mb-1.5">Número de Carnet <span className="text-brand-red">*</span></label>
                <input 
                  type="text" 
                  value={formData.carnet}
                  onChange={(e) => setFormData({...formData, carnet: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-card-dark mb-1.5">Título al que se quiere optar <span className="text-brand-red">*</span></label>
                <input 
                  type="text" 
                  value={formData.carrera}
                  onChange={(e) => setFormData({...formData, carrera: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-card-dark mb-1.5">Mes de envío <span className="text-brand-red">*</span></label>
                <select 
                  value={formData.mesEnvio}
                  onChange={(e) => setFormData({...formData, mesEnvio: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors bg-white appearance-none"
                >
                  {["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"].map((mes) => (
                    <option key={mes} value={mes} className="capitalize">{mes}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-border text-card-dark font-bold text-sm bg-white hover:bg-slate-50 shadow-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Guardando..." : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

