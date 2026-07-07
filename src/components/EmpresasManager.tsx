"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { createEmpresa, updateEmpresa, deleteEmpresa, toggleEmpresaStatus, EmpresaData, SupervisorData } from "@/app/actions/empresas";

const MapSelector = dynamic(() => import("./MapSelector"), { ssr: false });

export default function EmpresasManager({ initialEmpresas }: { initialEmpresas: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const getEmptyForm = (): EmpresaData => ({
    nombre: "",
    area: "",
    descripcion: "",
    antecedentes: "",
    direccion: "",
    organigramaUrl: "",
    mapaUrl: "",
    supervisores: [],
  });

  const [formData, setFormData] = useState<EmpresaData>(getEmptyForm());
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingId(null);
    setError(null);
    setIsModalOpen(false);
  };

  const handleEdit = (emp: any) => {
    setFormData({
      nombre: emp.nombre || "",
      area: emp.area || "",
      descripcion: emp.descripcion || "",
      antecedentes: emp.antecedentes || "",
      direccion: emp.direccion || "",
      organigramaUrl: emp.organigramaUrl || "",
      mapaUrl: emp.mapaUrl || "",
      supervisores: emp.supervisores || [],
    });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validations
    if (formData.supervisores.length === 0) {
      setError("Debes agregar al menos un supervisor para la empresa.");
      setIsSaving(false);
      return;
    }

    let res;
    if (editingId) {
      res = await updateEmpresa(editingId, formData);
    } else {
      res = await createEmpresa(formData);
    }

    setIsSaving(false);
    if (res.success) {
      resetForm();
    } else {
      setError(res.error || "Ocurrió un error al guardar la empresa.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta empresa? Esto eliminará también a sus supervisores. Esta acción no se puede deshacer.")) {
      const res = await deleteEmpresa(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const handleToggle = async (id: number, current: boolean) => {
    if (confirm(`¿Estás seguro de ${current ? "deshabilitar" : "habilitar"} esta empresa?`)) {
      await toggleEmpresaStatus(id, current);
    }
  };

  const handleChange = (field: keyof EmpresaData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es muy pesado. El límite es 2MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange("organigramaUrl", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Supervisor Form Handlers
  const addSupervisor = () => {
    setFormData(prev => ({
      ...prev,
      supervisores: [
        ...prev.supervisores,
        { titulo: "", nombres: "", apellidos: "", cargo: "", especialidad: "", telefono: "", correo: "" }
      ]
    }));
  };

  const updateSupervisor = (index: number, field: keyof SupervisorData, value: string) => {
    setFormData(prev => {
      const sups = [...prev.supervisores];
      sups[index] = { ...sups[index], [field]: value };
      return { ...prev, supervisores: sups };
    });
  };

  const removeSupervisor = (index: number) => {
    setFormData(prev => {
      const sups = [...prev.supervisores];
      sups.splice(index, 1);
      return { ...prev, supervisores: sups };
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Empresas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las instituciones o empresas donde los egresados pueden realizar su Trabajo de Grado.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-brand-red hover:bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Empresa
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialEmpresas.map((emp) => (
          <div key={emp.id} className={`border rounded-xl p-5 shadow-sm bg-white flex flex-col relative overflow-hidden transition-all ${emp.habilitada ? "border-brand-red/20 ring-1 ring-brand-red/10" : "border-gray-200 opacity-80"}`}>
            
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{emp.nombre}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{emp.area || "Sin área especificada"}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2 z-10 relative flex-1">
              <p className="text-sm text-gray-600 line-clamp-2">{emp.descripcion}</p>
              
              <div className="flex gap-2 pt-2">
                {emp.mapaUrl && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${emp.mapaUrl}`} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Ver Mapa
                  </a>
                )}
                {emp.organigramaUrl && (
                  <a href={emp.organigramaUrl} target="_blank" rel="noreferrer" className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100 flex items-center gap-1 hover:bg-purple-100 transition">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Organigrama
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-sm mt-auto">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="font-semibold text-gray-700">{emp.supervisores?.length || 0} Supervisores</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between z-10 relative">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${emp.habilitada ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {emp.habilitada ? 'Activa' : 'Deshabilitada'}
              </span>
              <button
                onClick={() => handleToggle(emp.id, emp.habilitada)}
                className={`text-sm font-bold underline ${emp.habilitada ? 'text-gray-500 hover:text-red-600' : 'text-green-600 hover:text-green-800'}`}
              >
                {emp.habilitada ? 'Deshabilitar' : 'Habilitar'}
              </button>
            </div>
          </div>
        ))}

        {initialEmpresas.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No hay empresas en el catálogo aún.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-xl text-gray-800">
                {editingId ? "Editar Empresa / Institución" : "Registrar Nueva Empresa"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Empresa Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-brand-red border-b pb-2">1. Datos de la Institución</h4>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Empresa</label>
                      <input type="text" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.nombre} onChange={(e) => handleChange("nombre", e.target.value)} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Área o Sector</label>
                      <input type="text" placeholder="Ej. Tecnología, Manufactura, ONG..." className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.area} onChange={(e) => handleChange("area", e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                      <textarea rows={3} className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)}></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Antecedentes</label>
                      <textarea rows={2} className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.antecedentes} onChange={(e) => handleChange("antecedentes", e.target.value)}></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Física (Texto)</label>
                      <input type="text" placeholder="Dirección completa..." className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.direccion} onChange={(e) => handleChange("direccion", e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Ubicación GPS (Mapa)</label>
                      <MapSelector value={formData.mapaUrl || ""} onChange={(val) => handleChange("mapaUrl", val)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                        <span>Organigrama de la Empresa (Imagen o PDF)</span>
                        {formData.organigramaUrl && <span className="text-emerald-600 text-xs flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Archivo Subido</span>}
                      </label>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-brand-red hover:file:bg-red-100" 
                        onChange={handleFileUpload} 
                      />
                      <p className="text-xs text-gray-500 mt-1">Límite: 2MB. Selecciona un archivo para reemplazar el existente.</p>
                    </div>
                  </div>

                  {/* Supervisores */}
                  <div className="space-y-4 flex flex-col">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-brand-red">2. Supervisores / Contactos</h4>
                      <button type="button" onClick={addSupervisor} className="text-xs bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                        + Agregar Supervisor
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {formData.supervisores.length === 0 ? (
                        <div className="text-center p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                          Debes agregar al menos un supervisor como contacto para la empresa.
                        </div>
                      ) : (
                        formData.supervisores.map((sup, index) => (
                          <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                            <button type="button" onClick={() => removeSupervisor(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
                                <input type="text" placeholder="Ej. Ing, Lic..." className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.titulo} onChange={(e) => updateSupervisor(index, "titulo", e.target.value)} />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-600 mb-1">Especialidad</label>
                                <input type="text" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.especialidad} onChange={(e) => updateSupervisor(index, "especialidad", e.target.value)} />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nombres *</label>
                                <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.nombres} onChange={(e) => updateSupervisor(index, "nombres", e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Apellidos *</label>
                                <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.apellidos} onChange={(e) => updateSupervisor(index, "apellidos", e.target.value)} />
                              </div>
                            </div>

                            <div className="mb-3">
                              <label className="block text-xs font-bold text-gray-600 mb-1">Cargo</label>
                              <input type="text" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.cargo} onChange={(e) => updateSupervisor(index, "cargo", e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                                <input type="tel" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.telefono} onChange={(e) => updateSupervisor(index, "telefono", e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Correo Electrónico</label>
                                <input type="email" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.correo} onChange={(e) => updateSupervisor(index, "correo", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || formData.supervisores.length === 0}
                  className="bg-brand-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
