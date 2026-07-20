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

interface Sucursal {
  id: number;
  empresaId: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  mapaUrl: string | null;
  descripcion?: string | null;
  antecedentes?: string | null;
}

interface DatosEmpresarialesFormProps {
  propuestaId: number;
  initialEmpresaId: number | null;
  initialSucursalId?: number | null;
  empresas: Empresa[];
  sucursales?: Sucursal[];
}

export default function DatosEmpresarialesForm({
  propuestaId,
  initialEmpresaId,
  initialSucursalId,
  empresas,
  sucursales = [],
}: DatosEmpresarialesFormProps) {
  const router = useRouter();
  
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(initialEmpresaId || null);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(initialSucursalId || null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
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

  const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId);
  const selectedSucursal = sucursales.find((s) => s.id === selectedSucursalId);

  // Initialize search query if there's a selection
  useState(() => {
    if (selectedEmpresa) {
      if (selectedSucursal) {
        setSearchQuery(`${selectedSucursal.nombre} (Sucursal - ${selectedEmpresa.nombre})`);
      } else {
        setSearchQuery(`${selectedEmpresa.nombre} (Matriz)`);
      }
    }
  });

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const options: any[] = [];
  empresas.forEach(emp => {
    const searchMatriz = removeAccents(emp.nombre.toLowerCase());
    options.push({ type: 'matriz', id: emp.id, empresaId: emp.id, nombre: emp.nombre, label: `${emp.nombre} (Matriz)`, search: searchMatriz, habilitada: emp.habilitada });
    const empSucursales = sucursales.filter(s => s.empresaId === emp.id);
    empSucursales.forEach(suc => {
      const searchSuc = removeAccents(`${suc.nombre.toLowerCase()} ${emp.nombre.toLowerCase()}`);
      options.push({
        type: 'sucursal',
        id: suc.id,
        empresaId: emp.id,
        nombre: suc.nombre,
        label: `${suc.nombre} (Sucursal - ${emp.nombre})`,
        search: searchSuc,
        habilitada: emp.habilitada
      });
    });
  });

  const normalizedQuery = removeAccents(searchQuery.toLowerCase());
  const filteredOptions = options.filter(opt => opt.search.includes(normalizedQuery));

  const handleSelectOption = (opt: any) => {
    setSelectedEmpresaId(opt.empresaId);
    if (opt.type === 'sucursal') {
      setSelectedSucursalId(opt.id);
      setSearchQuery(opt.label);
    } else {
      setSelectedSucursalId(null);
      setSearchQuery(opt.label);
    }
    setIsDropdownOpen(false);
  };

  const handleSave = async (isContinue: boolean = false) => {
    setIsSaving(true);
    const res = await updateEmpresa(propuestaId, selectedEmpresaId, selectedSucursalId);
    setIsSaving(false);

    if (res.success) {
      if (isContinue) {
        if (!selectedEmpresaId) {
          alert("Por favor selecciona una empresa antes de continuar.");
          return;
        }
        router.push("?step=4");
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
    const val = e.target.value;
    if (!val) {
      setRevData(prev => ({ 
        ...prev, 
        empresa: { ...prev.empresa, nombre: "", targetEmpresaId: undefined, targetSucursalId: undefined }
      }));
      return;
    }
    
    const [type, idStr] = val.split('-');
    const id = Number(idStr);
    const opt = options.find(o => o.type === type && o.id === id);
    
    if (opt) {
      const emp = empresas.find(x => x.id === opt.empresaId);
      const suc = type === 'sucursal' ? sucursales.find(x => x.id === id) : null;
      
      setRevData(prev => ({
        ...prev,
        empresa: {
          nombre: opt.label,
          area: emp?.area || "",
          descripcion: emp?.descripcion || "",
          antecedentes: emp?.antecedentes || "",
          direccion: suc?.direccion || emp?.direccion || "",
          organigramaUrl: emp?.organigramaUrl || "",
          mapaUrl: suc?.mapaUrl || emp?.mapaUrl || "",
          targetEmpresaId: opt.empresaId,
          targetSucursalId: type === 'sucursal' ? id : undefined,
        }
      }));
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
                if (e.target.value === "") {
                  setSelectedEmpresaId(null);
                  setSelectedSucursalId(null);
                }
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              placeholder="Escribe para buscar empresa o sucursal..."
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
            />
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        if (!opt.habilitada) {
                          e.preventDefault();
                          return;
                        }
                        handleSelectOption(opt);
                      }}
                      className={`px-4 py-2 ${opt.habilitada ? 'cursor-pointer hover:bg-red-50 hover:text-brand-red transition-colors' : 'cursor-not-allowed opacity-50 line-through bg-gray-50 text-gray-500'} ${
                        opt.habilitada && ((opt.type === 'matriz' && opt.id === selectedEmpresaId && !selectedSucursalId) ||
                        (opt.type === 'sucursal' && opt.id === selectedSucursalId))
                          ? "bg-red-50 text-brand-red font-bold"
                          : (!opt.habilitada ? "" : "text-slate-700")
                      }`}
                    >
                      {opt.label} {!opt.habilitada && <span className="text-xs ml-2 font-normal">(Deshabilitada)</span>}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted">No se encontraron empresas ni sucursales.</div>
                )}
              </div>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
                    value={selectedSucursal?.descripcion || selectedEmpresa.descripcion || "Sin descripción"}
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none resize-y min-h-[150px]"
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
                  value={selectedSucursal?.antecedentes || selectedEmpresa.antecedentes || "Sin antecedentes"}
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 cursor-not-allowed focus:outline-none resize-y min-h-[150px]"
                />
                <InputLock />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">
                Dirección de la empresa o sucursal <span className="text-brand-red">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={selectedSucursal ? (selectedSucursal.direccion || "Sin dirección") : (selectedEmpresa.direccion || "Sin dirección")}
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
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex justify-center items-center h-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedEmpresa.organigramaUrl} alt="Organigrama" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted bg-slate-100 rounded-lg inline-block">No disponible</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Mapa de ubicación <span className="text-brand-red">*</span>
                </label>
                {(selectedSucursal?.mapaUrl || selectedEmpresa.mapaUrl) ? (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden h-[200px]">
                    <iframe src={selectedSucursal?.mapaUrl || selectedEmpresa.mapaUrl!} className="w-full h-full border-0" allowFullScreen loading="lazy"></iframe>
                  </div>
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
                      <option value="">Selecciona la empresa o sucursal a corregir...</option>
                      {empresas.filter(e => e.habilitada).map(emp => {
                        const empSucursales = sucursales.filter(s => s.empresaId === emp.id);
                        return (
                          <optgroup key={emp.id} label={emp.nombre}>
                            <option value={`matriz-${emp.id}`}>{emp.nombre} (Matriz)</option>
                            {empSucursales.map(suc => (
                              <option key={suc.id} value={`sucursal-${suc.id}`}>
                                {suc.nombre} (Sucursal)
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
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
                  <textarea rows={10} value={revData.empresa.descripcion} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, descripcion: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-y min-h-[150px]" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-card-dark mb-1.5">Antecedentes <span className="text-brand-red">*</span></label>
                  <textarea rows={10} value={revData.empresa.antecedentes} onChange={e => setRevData(p => ({...p, empresa: {...p.empresa, antecedentes: e.target.value}}))} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-y min-h-[150px]" />
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
