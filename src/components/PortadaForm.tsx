"use client";

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

  // Split full name into names and surnames approximately for display
  const nombresSplit = (initialData.nombreCompleto || "").split(" ");
  const half = Math.ceil(nombresSplit.length / 2);
  const nombres = nombresSplit.slice(0, half).join(" ");
  const apellidos = nombresSplit.slice(half).join(" ");

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
          onClick={() => alert("Comuníquese con administración si sus datos son erróneos.")}
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
  );
}

