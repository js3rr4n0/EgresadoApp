"use client";

import { useState } from "react";
import { updatePortada } from "@/app/actions/propuestas";
import { useRouter } from "next/navigation";

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
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombreCompleto: initialData.nombreCompleto || "",
    carnet: initialData.carnet || "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) {
      // Si no estamos editando, solo avanzamos (simulado localmente por ahora o redirect)
      alert("Avanzando a Carta de Aceptación...");
      return;
    }

    setPending(true);
    const form = new FormData();
    form.append("nombreCompleto", formData.nombreCompleto);
    form.append("carnet", formData.carnet);

    const res = await updatePortada(form);
    if (res.success) {
      setEditing(false);
      router.refresh();
    } else {
      alert(res.error);
    }
    setPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Nombre Completo</label>
          <div className="relative">
            <input 
              type="text" 
              name="nombreCompleto"
              readOnly={!editing} 
              value={formData.nombreCompleto} 
              onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-colors ${
                editing ? "bg-white border-brand-red focus:ring-2 focus:ring-brand-red/20" : "bg-muted-bg border-border text-muted cursor-not-allowed"
              }`} 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Número de Carnet</label>
          <div className="relative">
            <input 
              type="text" 
              name="carnet"
              readOnly={!editing} 
              value={formData.carnet}
              onChange={(e) => setFormData({ ...formData, carnet: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-colors ${
                editing ? "bg-white border-brand-red focus:ring-2 focus:ring-brand-red/20" : "bg-muted-bg border-border text-muted cursor-not-allowed"
              }`} 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Título al que se quiere optar</label>
          <div className="relative">
            <input 
              type="text" 
              readOnly 
              value={initialData.carrera || "Carrera no asignada"} 
              className="w-full px-4 py-2.5 rounded-lg bg-muted-bg border border-border text-muted cursor-not-allowed focus:outline-none" 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Mes de envío</label>
          <div className="relative">
            <input 
              type="text" 
              readOnly 
              value={initialData.mesEnvio} 
              className="w-full px-4 py-2.5 rounded-lg bg-muted-bg border border-border text-muted cursor-not-allowed focus:outline-none capitalize" 
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
        {!editing ? (
          <>
            <button 
              type="button" 
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Datos erróneos?
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors"
            >
              Guardar y Continuar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </>
        ) : (
          <>
            <button 
              type="button" 
              onClick={() => {
                setEditing(false);
                setFormData({
                  nombreCompleto: initialData.nombreCompleto || "",
                  carnet: initialData.carnet || "",
                });
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-muted hover:bg-slate-50 font-bold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={pending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Confirmar Cambios"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
