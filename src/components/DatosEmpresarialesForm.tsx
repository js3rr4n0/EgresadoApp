"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmpresa } from "@/app/actions/propuestas";

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
              <button onClick={() => alert("Contacta a administración para registrar tu empresa.")} type="button" className="font-bold underline hover:text-blue-600">aquí</button>.
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
    </div>
  );
}
