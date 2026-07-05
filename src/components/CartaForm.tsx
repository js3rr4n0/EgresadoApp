"use client";

import { useState } from "react";
import { saveCartaAceptacion } from "@/app/actions/carta";
import { useRouter, useSearchParams } from "next/navigation";

interface CartaFormProps {
  propuestaId: number;
  initialData: any; // data from DB if it exists
}

export default function CartaForm({ propuestaId, initialData }: CartaFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLocked = initialData?.bloqueada;

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for dynamic date calculation feedback
  const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(initialData?.fechaFin || "");
  const [diasDiff, setDiasDiff] = useState<number | null>(null);

  // Auto-calculate the difference to give visual feedback to the user before they submit
  const handleDateChange = (type: "inicio" | "fin", val: string) => {
    let start = type === "inicio" ? val : fechaInicio;
    let end = type === "fin" ? val : fechaFin;

    if (type === "inicio") setFechaInicio(val);
    if (type === "fin") setFechaFin(val);

    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDiasDiff(diffDays);
    } else {
      setDiasDiff(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("propuestaId", propuestaId.toString());

    const result = await saveCartaAceptacion(formData);

    if (result.success) {
      // Proceed to step 3
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", "3");
      router.push(`?${params.toString()}`);
    } else {
      setError(result.error || "Error desconocido");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {/* PDF Upload */}
      <div className="bg-slate-50 border border-dashed border-border rounded-xl p-6 text-center">
        <svg className="w-8 h-8 text-brand-red mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        <p className="font-bold text-card-dark text-sm">PDF de la Carta de Aceptación</p>
        <p className="text-xs text-muted mt-1 mb-4">Sube el documento escaneado firmado y sellado por la empresa.</p>
        <input type="file" name="archivoPdf" accept="application/pdf" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-brand-red hover:file:bg-red-100 cursor-pointer" required={!isLocked} disabled={isLocked} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fechas */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Fechas de Pasantía</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Emisión de la Carta</label>
              <input type="date" name="fechaEmision" defaultValue={initialData?.fechaEmision} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Inicio de Pasantía</label>
              <input type="date" name="fechaInicio" value={fechaInicio} onChange={(e) => handleDateChange("inicio", e.target.value)} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Fin de Pasantía</label>
              <input type="date" name="fechaFin" value={fechaFin} onChange={(e) => handleDateChange("fin", e.target.value)} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
          </div>
          
          {/* Visual Date Feedback */}
          {diasDiff !== null && (
            <p className={`mt-2 text-xs font-bold ${diasDiff >= 150 && diasDiff <= 155 ? 'text-emerald-600' : 'text-red-500'}`}>
              Duración calculada: {diasDiff} días {diasDiff >= 150 && diasDiff <= 155 ? '(Válida)' : '(Debe estar entre 150 y 155 días)'}
            </p>
          )}
        </div>

        {/* Supervisor */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Datos del Supervisor Empresarial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Título</label>
              <input type="text" name="supTitulo" placeholder="Ej. Ing, Lic" defaultValue={initialData?.supTitulo} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Cargo</label>
              <input type="text" name="supCargo" placeholder="Ej. Gerente de TI" defaultValue={initialData?.supCargo} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Nombres</label>
              <input type="text" name="supNombres" defaultValue={initialData?.supNombres} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Apellidos</label>
              <input type="text" name="supApellidos" defaultValue={initialData?.supApellidos} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Teléfono</label>
              <input type="text" name="supTelefono" defaultValue={initialData?.supTelefono} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Correo Electrónico</label>
              <input type="email" name="supCorreo" defaultValue={initialData?.supCorreo} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Emisor */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Emisor de la Carta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Nombre Completo del Emisor</label>
              <input type="text" name="emisorNombre" defaultValue={initialData?.emisorNombre} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Cargo del Emisor</label>
              <input type="text" name="emisorCargo" defaultValue={initialData?.emisorCargo} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1">Imagen de Firma Digital</label>
              <input type="file" name="emisorFirma" accept="image/*" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-card-dark hover:file:bg-slate-200 cursor-pointer" required={!isLocked} disabled={isLocked} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#fef9eb] border border-amber-200 rounded-lg p-4 flex items-start gap-3 mt-8">
        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <p className="text-xs text-amber-800 font-bold leading-relaxed">
          Advertencia: Si alguno de los datos digitados son diferentes a los de la carta de aceptación de la propuesta, su propuesta será RECHAZADA. Revisa exhaustivamente antes de continuar. Una vez guardado, esta etapa se bloqueará.
        </p>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border">
        <button type="button" onClick={() => router.push('?step=1')} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
          ← Volver a Portada
        </button>
        <button 
          type="submit" 
          disabled={pending || isLocked}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {pending ? "Validando..." : (isLocked ? "Bloqueado" : "Siguiente Fase")}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </form>
  );
}
