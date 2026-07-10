"use client";

import { useState } from "react";
import { uploadDocumento } from "@/app/actions/documentos";

interface DocumentGateProps {
  hasServicio: boolean;
  hasNotas: boolean;
  hasPago: boolean;
  urlServicio?: string;
  urlNotas?: string;
  urlPago?: string;
}

export default function DocumentGate({ hasServicio, hasNotas, hasPago, urlServicio, urlNotas, urlPago }: DocumentGateProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(tipo);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    const result = await uploadDocumento(formData);
    if (!result.success) {
      setError(result.error || "Error al subir el archivo.");
    }
    
    setUploading(null);
  };

  const docs = [
    {
      id: "servicio_social",
      title: "Constancia de Servicio Social",
      desc: "Documento oficial que certifica la finalización de tus horas de servicio social.",
      done: hasServicio,
      url: urlServicio,
    },
    {
      id: "certificacion_notas",
      title: "Certificación de Notas (CUM > 7.0)",
      desc: "Historial académico que compruebe tu CUM requerido para optar a pasantía.",
      done: hasNotas,
      url: urlNotas,
    },
    {
      id: "pago_tg",
      title: "Recibo de Pago (Trabajo de Graduación)",
      desc: "Comprobante de pago del arancel correspondiente al proceso de graduación.",
      done: hasPago,
      url: urlPago,
    },
  ];

  const totalDone = [hasServicio, hasNotas, hasPago].filter(Boolean).length;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="font-bold text-card-dark text-xl">Documentos Obligatorios</h2>
        <p className="text-sm text-muted mt-1">Debes subir los siguientes documentos para habilitar el envío de tu propuesta.</p>
      </div>
      <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {docs.map((doc) => (
            <div key={doc.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-lg border transition-all ${doc.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-border hover:border-brand-red/30'}`}>
              <div className="flex gap-4">
                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${doc.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {doc.done ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className="text-xs font-bold">!</span>
                  )}
                </div>
                <div>
                  <h3 className={`font-bold ${doc.done ? 'text-emerald-900' : 'text-card-dark'}`}>{doc.title}</h3>
                  <p className={`text-sm mt-1 ${doc.done ? 'text-emerald-700/80' : 'text-muted'}`}>{doc.desc}</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 sm:ml-6 shrink-0 flex items-center gap-2">
                {doc.done ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold border border-emerald-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Completado
                    </span>
                    {doc.url && (
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                        title="Ver Archivo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    )}
                  </>
                ) : (
                  <div>
                    <label className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                      uploading === doc.id 
                        ? 'bg-slate-100 text-slate-400 border border-border' 
                        : 'bg-brand-red hover:bg-brand-red-hover text-white shadow-sm'
                    }`}>
                      {uploading === doc.id ? (
                        "Subiendo..."
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Subir PDF
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="sr-only"
                        disabled={uploading === doc.id}
                        onChange={(e) => handleUpload(e, doc.id)}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* New block for Crear Propuesta inside Documentos Obligatorios */}
          <div className={`mt-6 flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-lg border transition-all ${totalDone === 3 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-border'}`}>
            <div className="flex gap-4">
              <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${totalDone === 3 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <div>
                <h3 className={`font-bold ${totalDone === 3 ? 'text-emerald-900' : 'text-card-dark'}`}>Crea tu Propuesta</h3>
                <p className={`text-sm mt-1 ${totalDone === 3 ? 'text-emerald-700/80' : 'text-muted'}`}>
                  {totalDone === 3 
                    ? "Ya has completado la subida de los tres documentos obligatorios." 
                    : "Puedes crear tu propuesta ahora, pero deberás subir los tres archivos para poder enviarla a revisión."}
                </p>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 sm:ml-6 shrink-0">
              <a 
                href="/egresado/redactar"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Crear Propuesta
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
