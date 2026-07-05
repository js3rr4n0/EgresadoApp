"use client";

import { useState } from "react";
import { uploadDocumento } from "@/app/actions/documentos";

interface DocumentGateProps {
  hasServicio: boolean;
  hasNotas: boolean;
  hasPago: boolean;
}

export default function DocumentGate({ hasServicio, hasNotas, hasPago }: DocumentGateProps) {
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
    },
    {
      id: "certificacion_notas",
      title: "Certificación de Notas (CUM > 7.0)",
      desc: "Historial académico que compruebe tu CUM requerido para optar a pasantía.",
      done: hasNotas,
    },
    {
      id: "pago_tg",
      title: "Recibo de Pago (Trabajo de Graduación)",
      desc: "Comprobante de pago del arancel correspondiente al proceso de graduación.",
      done: hasPago,
    },
  ];

  const totalDone = [hasServicio, hasNotas, hasPago].filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-red/10 mb-6">
          <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h1 className="text-3xl font-bold text-card-dark">Expediente de Graduación</h1>
        <p className="text-muted mt-3 text-lg">
          Para habilitar el envío de tu propuesta de pasantía, es obligatorio que subas los siguientes documentos de pre-requisito.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div>
            <h2 className="font-bold text-card-dark text-lg">Progreso de Expediente</h2>
            <p className="text-sm text-muted">Archivos subidos y verificados</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-brand-red">{totalDone}</span>
            <span className="text-lg font-bold text-muted">/3</span>
          </div>
        </div>

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

              <div className="mt-4 sm:mt-0 sm:ml-6 shrink-0">
                {doc.done ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold border border-emerald-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Completado
                  </span>
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
        </div>
      </div>
    </div>
  );
}
