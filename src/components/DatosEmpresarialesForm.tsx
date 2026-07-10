"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmpresa, solicitarRevisionEmpresa } from "@/app/actions/propuestas";

interface Empresa {
  id: number;
  nombre: string;
  area: string | null;
  descripcion: string | null;
  antecedentes: string | null;
  direccion: string | null;
  organigramaUrl: string | null;
  mapaUrl: string | null;
  habilitada: boolean;
}

interface DatosEmpresarialesFormProps {
  propuestaId: number;
  initialEmpresaId: number | null;
  empresas: Empresa[];
}

export default function DatosEmpresarialesForm({
  propuestaId,
  initialEmpresaId,
  empresas,
}: DatosEmpresarialesFormProps) {
  const router = useRouter();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | "">(
    initialEmpresaId || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [problemMode, setProblemMode] = useState<"edit_existing" | "create_new" | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Revision Form state
  const [revData, setRevData] = useState({
    empresa: {
      nombre: "",
      area: "",
      descripcion: "",
      antecedentes: "",
      direccion: "",
      organigramaUrl: "",
      mapaUrl: "",
    },
    supervisor: {
      nombres: "",
      apellidos: "",
      cargo: "",
      especialidad: "",
      telefono: "",
      correo: "",
    }
  });

  const selectedEmpresa = empresas.find((e) => e.id === Number(selectedEmpresaId));

  const handleSave = async (isContinue: boolean = false) => {
    setIsSaving(true);
    const empresaId = selectedEmpresaId !== "" ? Number(selectedEmpresaId) : null;
    const res = await updateEmpresa(propuestaId, empresaId);
    setIsSaving(false);

    if (res.success) {
      if (isContinue) {
        if (!empresaId) {
          alert("Por favor selecciona una empresa antes de continuar.");
          return;
        }
        router.push("?step=3");
      } else {
        alert("Borrador guardado exitosamente.");
        router.refresh();
      }
    } else {
      alert(res.error || "Error al guardar los datos empresariales.");
    }
  };

  const handleProblemSelection = (mode: "edit_existing" | "create_new") => {
    setProblemMode(mode);
    setProblemModalOpen(false);
    
    // Reset form data
    setRevData({
      empresa: { nombre: "", area: "", descripcion: "", antecedentes: "", direccion: "", organigramaUrl: "", mapaUrl: "" },
      supervisor: { nombres: "", apellidos: "", cargo: "", especialidad: "", telefono: "", correo: "" }
    });
    
    setFormModalOpen(true);
  };

  const handleExistingCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const emp = empresas.find(x => x.id === id);
    if (emp) {
      setRevData(prev => ({
        ...prev,
        empresa: {
          nombre: emp.nombre,
          area: emp.area || "",
          descripcion: emp.descripcion || "",
          antecedentes: emp.antecedentes || "",
          direccion: emp.direccion || "",
          organigramaUrl: emp.organigramaUrl || "",
          mapaUrl: emp.mapaUrl || "",
        }
      }));
    } else {
      setRevData(prev => ({ ...prev, empresa: { ...prev.empresa, nombre: "" }}));
    }
  };

  const handleSubmitRevision = async () => {
    setIsSubmittingRevision(true);
    const res = await solicitarRevisionEmpresa(propuestaId, revData, problemMode!);
    setIsSubmittingRevision(false);

    if (res.success) {
      setConfirmModalOpen(false);
      setFormModalOpen(false);
      alert("Solicitud enviada correctamente.");
      router.refresh();
    } else {
      alert(res.error || "Error al enviar la solicitud.");
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
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">
            Nombre de la empresa o institución <span className="text-brand-red">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedEmpresaId}
              onChange={(e) => setSelectedEmpresaId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors appearance-none"
            >
              <option value="">Selecciona una empresa...</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id} disabled={!empresa.habilitada}>
                  {empresa.nombre} {empresa.habilitada ? "(Habilitada)" : "(Deshabilitada)"}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {selectedEmpresa && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Área de la empresa <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={selectedEmpresa.area || "No definida"}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none"
                  />
                  <InputLock />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Descripción de la empresa <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={selectedEmpresa.descripcion || "Sin descripción"}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none resize-none"
                  />
                  <InputLock />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">
                Antecedentes de la institución o empresa <span className="text-brand-red">*</span>
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  value={selectedEmpresa.antecedentes || "Sin antecedentes"}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none resize-none"
                />
                <InputLock />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">
                Dirección de la empresa <span className="text-brand-red">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={selectedEmpresa.direccion || "Sin dirección"}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none"
                />
                <InputLock />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Organigrama de la empresa <span className="text-brand-red">*</span>
                </label>
                {selectedEmpresa.organigramaUrl ? (
                  <a
                    href={selectedEmpresa.organigramaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-bold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Ver Organigrama
                  </a>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted bg-slate-100 rounded-lg inline-block">No disponible</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Mapa de ubicación de la empresa <span className="text-brand-red">*</span>
                </label>
                {selectedEmpresa.mapaUrl ? (
                  <a
                    href={selectedEmpresa.mapaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Ver Mapa
                  </a>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted bg-slate-100 rounded-lg inline-block">No disponible</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg">¿Empresa no encontrada?</h3>
            <p className="text-blue-800/80 text-sm mt-1">
              Si tu empresa no existe o los datos no son los correctos presiona{" "}
              <button onClick={() => setProblemModalOpen(true)} type="button" className="font-bold underline hover:text-blue-600">aquí</button>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center sm:justify-start gap-4 mt-8 pt-6 border-t border-border flex-wrap">
        <button 
          type="button" 
          onClick={() => alert("Comuníquese con administración si sus datos son erróneos.")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Datos erróneos?
        </button>
        <button 
          type="button" 
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          {isSaving ? "Guardando..." : "Guardar Borrador"}
        </button>
        <button 
          type="button" 
          onClick={() => handleSave(true)}
          disabled={isSaving || !selectedEmpresaId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#b90000] hover:bg-[#a00000] text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          Guardar y Continuar
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>

      {/* 1. Problem Modal */}
      {problemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-border">
              <h3 className="text-xl font-bold text-card-dark">¿Cuál es el problema con la empresa?</h3>
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
                  <h4 className="font-bold text-card-dark">Tu empresa existe pero los datos no son correctos</h4>
                  <p className="text-sm text-muted">Podrás enviar una solicitud para actualizar la información.</p>
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
                  <h4 className="font-bold text-card-dark">Tu empresa no existe</h4>
                  <p className="text-sm text-muted">Podrás registrar una nueva empresa o institución.</p>
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

      {/* 2. Revision Form Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h3 className="text-xl font-bold text-card-dark">
                {problemMode === "edit_existing" ? "Actualizar datos de empresa existente" : "Registrar nueva empresa"}
              </h3>
              <button onClick={() => setFormModalOpen(false)} className="text-muted hover:text-foreground">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-slate-50/50">
              {/* EMPRESA SECTION */}
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-5">
                <h4 className="font-bold text-brand-red border-b border-border pb-2 mb-4">Datos de la Empresa</h4>
                
                {problemMode === "edit_existing" ? (
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Nombre de la empresa <span className="text-brand-red">*</span></label>
                    <select
                      onChange={handleExistingCompanySelect}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red bg-white"
                    >
                      <option value="">Selecciona la empresa a corregir...</option>
                      {empresas.filter(e => e.habilitada).map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Nombre de la empresa <span className="text-brand-red">*</span></label>
                    <input 
                      type="text"
                      value={revData.empresa.nombre}
                      onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, nombre: e.target.value}}))}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                      placeholder="Ej: TechSolutions S.A. de C.V."
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Área <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.empresa.area} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, area: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Dirección <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.empresa.direccion} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, direccion: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Descripción <span className="text-brand-red">*</span></label>
                  <textarea rows={2} value={revData.empresa.descripcion} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, descripcion: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Antecedentes <span className="text-brand-red">*</span></label>
                  <textarea rows={2} value={revData.empresa.antecedentes} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, antecedentes: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">URL Mapa (Opcional)</label>
                    <input type="url" value={revData.empresa.mapaUrl} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, mapaUrl: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">URL Organigrama (Opcional)</label>
                    <input type="url" value={revData.empresa.organigramaUrl} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, organigramaUrl: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                </div>
              </div>

              {/* SUPERVISOR SECTION */}
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-5">
                <h4 className="font-bold text-brand-red border-b border-border pb-2 mb-4">Datos del Supervisor</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Nombres <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.nombres} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, nombres: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Apellidos <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.apellidos} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, apellidos: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Cargo <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.cargo} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, cargo: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Especialidad <span className="text-brand-red">*</span></label>
                    <input type="text" value={revData.supervisor.especialidad} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, especialidad: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Teléfono <span className="text-brand-red">*</span></label>
                    <input type="tel" value={revData.supervisor.telefono} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, telefono: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-card-dark mb-1.5">Correo Electrónico <span className="text-brand-red">*</span></label>
                    <input type="email" value={revData.supervisor.correo} onChange={e => setRevData(p => ({...p, supervisor: {...p.supervisor, correo: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-border text-card-dark font-bold text-sm bg-white hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!revData.empresa.nombre}
                onClick={() => setConfirmModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-[#b90000] hover:bg-[#a00000] text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {problemMode === "edit_existing" ? "Revisar empresa" : "Mandar empresa para revisión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-card-dark mb-2">Advertencia de Revisión</h3>
              <p className="text-sm text-muted">
                La empresa será mandada a revisión, se entrará en un estado de Revisión de empresa y si es aprobada podrá seguir con el proceso de llenado, hasta entonces la propuesta permanecerá bloqueada.<br/><br/>
                ¿Está usted de acuerdo?
              </p>
            </div>
            <div className="p-6 border-t border-border flex justify-center gap-3 bg-slate-50/50">
              <button 
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSubmittingRevision}
                className="px-5 py-2.5 rounded-lg border border-border bg-white text-card-dark font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitRevision}
                disabled={isSubmittingRevision}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors disabled:opacity-50"
              >
                {isSubmittingRevision ? "Enviando..." : "Mandar para revisión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
