"use client";

import { useState } from "react";
import { saveCartaAceptacion } from "@/app/actions/carta";
import { useRouter, useSearchParams } from "next/navigation";

interface CartaFormProps {
  propuestaId: number;
  initialData: any; // data from DB if it exists
  empresaInfo: any;
  isLocked: boolean;
}

export default function CartaForm({ propuestaId, initialData, empresaInfo, isLocked }: CartaFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for dynamic date calculation feedback
  const [fechaEmision, setFechaEmision] = useState(initialData?.fechaEmision || "");
  const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio || "");
  const [fechaFin, setFechaFin] = useState(initialData?.fechaFin || "");
  const [diasDiff, setDiasDiff] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const threeWeeksFromNow = new Date();
  threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);
  const defaultMinInicio = threeWeeksFromNow.toISOString().split('T')[0];

  const [minInicioStrDyn, setMinInicioStrDyn] = useState<string>(() => {
    if (initialData?.fechaEmision) {
      const d = new Date(initialData.fechaEmision);
      d.setDate(d.getDate() + 21);
      return d.toISOString().split('T')[0];
    }
    return defaultMinInicio;
  });

  const handleDateChange = (type: "emision" | "inicio" | "fin", val: string) => {
    if (type === "emision") {
      setFechaEmision(val);
      if (val) {
        const emisionDate = new Date(val);
        const minInicio = new Date(emisionDate);
        minInicio.setDate(emisionDate.getDate() + 21);
        const minInicioStrNew = minInicio.toISOString().split('T')[0];
        
        setMinInicioStrDyn(minInicioStrNew);
        setFechaInicio(minInicioStrNew);

        // Auto-set fechaFin (150 days)
        const finDate = new Date(minInicio);
        finDate.setDate(minInicio.getDate() + 150);
        const finStr = finDate.toISOString().split('T')[0];
        setFechaFin(finStr);
        setDiasDiff(150);
      } else {
        setMinInicioStrDyn(defaultMinInicio);
      }
    } else if (type === "inicio") {
      setFechaInicio(val);
      // Auto-calculate fin (150 days)
      if (val) {
        const start = new Date(val);
        const end = new Date(start);
        end.setDate(start.getDate() + 150);
        const endStr = end.toISOString().split('T')[0];
        setFechaFin(endStr);
        setDiasDiff(150);
      } else {
        setFechaFin("");
        setDiasDiff(null);
      }
    } else {
      setFechaFin(val);
      if (fechaInicio && val) {
        const d1 = new Date(fechaInicio);
        const d2 = new Date(val);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDiasDiff(diffDays);
      } else {
        setDiasDiff(null);
      }
    }
  };

  const openBase64Pdf = (base64Url: string) => {
    if (!base64Url) return;
    const newWin = window.open('', '_blank');
    if (!newWin) {
      alert("Por favor, permite las ventanas emergentes (pop-ups) en tu navegador.");
      return;
    }
    
    if (base64Url.startsWith('data:image/')) {
      newWin.document.write(`
        <html>
          <head><title>Visor de Imagen</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#0f172a;min-height:100vh;">
            <img src="${base64Url}" style="max-width:100%;max-height:100vh;" />
          </body>
        </html>
      `);
    } else {
      newWin.document.write(`
        <html>
          <head><title>Visor de Documento</title></head>
          <body style="margin:0;padding:0;">
            <iframe width="100%" height="100%" style="border:none;" src="${base64Url}"></iframe>
          </body>
        </html>
      `);
    }
    newWin.document.close();
  };

  const [removedFile, setRemovedFile] = useState(false);
  const [removedFirma, setRemovedFirma] = useState(false);

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingFirma, setUploadingFirma] = useState(false);

  const handlePartialUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("propuestaId", propuestaId.toString());
    formData.append(fieldName, file);
    formData.append("isPartial", "true");

    if (fieldName === "archivoPdf") setUploadingPdf(true);
    if (fieldName === "emisorFirma") setUploadingFirma(true);
    
    setError(null);
    const result = await saveCartaAceptacion(formData);
    
    if (fieldName === "archivoPdf") setUploadingPdf(false);
    if (fieldName === "emisorFirma") setUploadingFirma(false);

    if (result.success) {
      if (fieldName === "archivoPdf") setRemovedFile(false);
      if (fieldName === "emisorFirma") setRemovedFirma(false);
      router.refresh(); // Fetch the new file URL
    } else {
      setError(result.error || `Error al subir el ${fieldName}`);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("propuestaId", propuestaId.toString());

    // Make sure we pass the dates if they're not fully updated in form via UI updates
    formData.set("fechaEmision", fechaEmision);
    formData.set("fechaInicio", fechaInicio);
    formData.set("fechaFin", fechaFin);

    const result = await saveCartaAceptacion(formData);

    if (result.success) {
      // Proceed to step 5
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", "5");
      router.push(`?${params.toString()}`);
    } else {
      setError(result.error || "Error desconocido");
      setPending(false);
    }
  };

    if (!empresaInfo) {
      return (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h2 className="text-xl font-bold text-amber-800 mb-2">Datos Empresariales Faltantes</h2>
          <p className="text-sm text-amber-700">Debes completar y seleccionar tu empresa y supervisor en la Etapa 2 antes de poder llenar tu Carta de Aceptación.</p>
        </div>
      );
    }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}

        {/* Read-Only Empresa Info */}
        <div className="bg-slate-50 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Información Vinculada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-muted uppercase">Empresa de Pasantía</p>
              <p className="font-semibold text-card-dark mt-1">{empresaInfo.nombre}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase">Supervisor Asignado</p>
              <p className="font-semibold text-card-dark mt-1">{empresaInfo.supervisor}</p>
              <p className="text-sm text-slate-500">{empresaInfo.supervisorCargo}</p>
            </div>
          </div>
        </div>

        {/* PDF Upload */}
        <div className="bg-slate-50 border border-dashed border-border rounded-xl p-6 text-center">
          {initialData?.archivoUrl && !removedFile ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="font-bold text-emerald-800 text-sm mb-4">Carta de Aceptación Subida</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => openBase64Pdf(initialData.archivoUrl)} className="text-xs font-bold bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors">Ver Documento</button>
                {!isLocked && (
                  <button type="button" onClick={() => setRemovedFile(true)} className="text-xs font-bold bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">Eliminar / Reemplazar</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-brand-red mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="font-bold text-card-dark text-sm">PDF de la Carta de Aceptación</p>
              <p className="text-xs text-muted mt-1 mb-4">Sube el documento escaneado firmado y sellado por la empresa.</p>
              {uploadingPdf ? (
                <div className="text-sm font-bold text-brand-red animate-pulse">Subiendo documento...</div>
              ) : (
                <input type="file" name="archivoPdf" accept="application/pdf,image/*" onChange={(e) => handlePartialUpload(e, "archivoPdf")} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-brand-red hover:file:bg-red-100 cursor-pointer" required={!initialData?.archivoUrl && !isLocked} disabled={isLocked} />
              )}
            </>
          )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fechas */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-bold text-brand-red uppercase tracking-wider mb-4 border-b pb-2">Fechas de Pasantía</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Emisión de la Carta</label>
              <input type="date" name="fechaEmision" max={todayStr} value={fechaEmision} onChange={(e) => handleDateChange("emision", e.target.value)} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Inicio de Pasantía (Min. 3 semanas)</label>
              <input type="date" name="fechaInicio" min={minInicioStrDyn} value={fechaInicio} onChange={(e) => handleDateChange("inicio", e.target.value)} required disabled={isLocked} className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Fin de Pasantía (150 días)</label>
              <input type="date" name="fechaFin" value={fechaFin} onChange={(e) => handleDateChange("fin", e.target.value)} required disabled={isLocked} readOnly className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-red/20 outline-none text-sm bg-slate-50 cursor-not-allowed" title="Se calcula automáticamente" />
            </div>
          </div>
          
          {/* Visual Date Feedback */}
          {diasDiff !== null && (
            <p className={`mt-2 text-xs font-bold ${diasDiff >= 150 && diasDiff <= 155 ? 'text-emerald-600' : 'text-red-500'}`}>
              Duración calculada: {diasDiff} días {diasDiff >= 150 && diasDiff <= 155 ? '(Válida)' : '(Invalida)'}
            </p>
          )}
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
              <label className="block text-xs font-bold text-foreground mb-1 flex justify-between">
                <span>Imagen de Firma Digital</span>
              </label>
              {initialData?.emisorFirmaUrl && !removedFirma ? (
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={initialData.emisorFirmaUrl} alt="Firma del Emisor" className="h-12 object-contain bg-white border border-gray-200 rounded p-1" />
                  <div className="flex flex-col gap-1 items-start">
                    <button type="button" onClick={() => openBase64Pdf(initialData.emisorFirmaUrl)} className="text-xs font-bold text-emerald-600 hover:underline">Ver Firma</button>
                    {!isLocked && (
                      <button type="button" onClick={() => setRemovedFirma(true)} className="text-xs font-bold text-red-600 hover:underline">Eliminar / Reemplazar</button>
                    )}
                  </div>
                </div>
              ) : (
                uploadingFirma ? (
                  <div className="text-sm font-bold text-brand-red animate-pulse mt-2">Subiendo firma...</div>
                ) : (
                  <input type="file" name="emisorFirma" accept="image/*" onChange={(e) => handlePartialUpload(e, "emisorFirma")} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-card-dark hover:file:bg-slate-200 cursor-pointer" required={!initialData?.emisorFirmaUrl && !isLocked} disabled={isLocked} />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Warning */}
      <div className="bg-[#fffdf7] border-2 border-amber-300 rounded-xl p-5 shadow-sm mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wide mb-1">Aviso Importante</h3>
          <p className="text-sm text-amber-800 leading-relaxed font-medium">
            Los datos digitados deberán ser idénticos a los de la carta de aceptación adjunta, de otra manera su propuesta será <span className="font-bold text-red-600 underline">RECHAZADA</span>.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-border">
        <button type="button" onClick={() => router.push('?step=2')} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
          ← Volver a Datos Empresariales
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
