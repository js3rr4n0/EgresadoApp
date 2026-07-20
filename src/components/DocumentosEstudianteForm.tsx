"use client";

import { useState } from "react";
import { uploadDocumento, deleteDocumento } from "@/app/actions/documentos";
import { enviarPropuesta } from "@/app/actions/justificacion";
import { useRouter } from "next/navigation";

interface DocumentosEstudianteFormProps {
  propuestaId: number;
  isLocked: boolean;
  documentosSubidos: { tipo: string; archivoUrl: string }[];
}

export default function DocumentosEstudianteForm({ propuestaId, isLocked, documentosSubidos }: DocumentosEstudianteFormProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Mapped to existing DB enum values to retain uploads from DocumentGate
  const docs = [
    {
      id: "pago_tg",
      title: "Hoja de inscripción de trabajo de graduación",
      desc: "Documento oficial de inscripción al proceso de graduación.",
    },
    {
      id: "certificacion_notas",
      title: "Constancia de horas sociales",
      desc: "Comprobante de realización de tus horas sociales.",
    },
    {
      id: "servicio_social",
      title: "Carta de servicio social",
      desc: "Documento de aprobación de servicio social emitido por la entidad.",
    }
  ];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("El archivo no debe superar los 5MB.");
      return;
    }

    setUploading(tipo);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    const result = await uploadDocumento(formData);
    if (!result.success) {
      setError(result.error || "Error al subir el archivo.");
    } else {
      router.refresh();
    }
    setUploading(null);
  };

  const handleDelete = async (tipo: string) => {
    if (!confirm("¿Seguro que deseas eliminar este documento?")) return;
    setError(null);
    setUploading(tipo);
    const result = await deleteDocumento(tipo);
    if (!result.success) {
      setError(result.error || "Error al eliminar el archivo.");
    } else {
      router.refresh();
    }
    setUploading(null);
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

  const uploadedTypes = documentosSubidos.map(d => d.tipo);
  const allUploaded = docs.every(d => uploadedTypes.includes(d.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allUploaded) {
      setError("Debes adjuntar todos los documentos requeridos antes de mandar la propuesta.");
      return;
    }

    if (confirm("¿Estás seguro de mandar la propuesta? Una vez enviada, no podrás editarla hasta que sea revisada.")) {
      setPending(true);
      const res = await enviarPropuesta(propuestaId);
      if (res.success) {
        router.push("/egresado"); // Redirect back to dashboard where it shows status
      } else {
        setError(res.error || "Error al enviar la propuesta.");
        setPending(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      <div className="space-y-4">
        {docs.map(doc => {
          const uploadedDoc = documentosSubidos.find(d => d.tipo === doc.id);
          const isDone = !!uploadedDoc;
          
          return (
            <div key={doc.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-border hover:border-brand-red/30'}`}>
              <div className="flex items-start gap-4 mb-4 sm:mb-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {isDone ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDone ? 'text-emerald-900' : 'text-card-dark'}`}>{doc.title}</h3>
                  <p className="text-xs text-muted mt-1">{doc.desc}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                {isDone ? (
                  <>
                    <button 
                      onClick={() => openBase64Pdf(uploadedDoc.archivoUrl)}
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm text-xs font-bold"
                    >
                      Ver
                    </button>
                    {!isLocked && (
                      <>
                        <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors shadow-sm cursor-pointer text-xs font-bold ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}`}>
                          <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleUpload(e, doc.id)} disabled={uploading === doc.id} />
                          {uploading === doc.id ? "Subiendo..." : "Reemplazar"}
                        </label>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          disabled={uploading === doc.id}
                          type="button"
                          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors shadow-sm text-xs font-bold disabled:opacity-50"
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div>
                    <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-border text-card-dark hover:bg-slate-50 transition-colors shadow-sm cursor-pointer text-xs font-bold ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleUpload(e, doc.id)} disabled={uploading === doc.id || isLocked} />
                      {uploading === doc.id ? "Subiendo..." : "Seleccionar archivo"}
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!allUploaded && (
        <div className="bg-[#fffdf7] border-2 border-amber-300 rounded-xl p-5 shadow-sm mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wide mb-1">Aviso Importante</h3>
            <p className="text-sm text-amber-800 leading-relaxed font-medium">
              Faltan documentos necesarios y/o quedan etapas por completar. Sube todos los archivos requeridos para habilitar el envío de tu propuesta.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-6 border-t border-border mt-8">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push('?step=6')} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
            ← Volver a Justificación
          </button>
          
          <button 
            type="button" 
            onClick={() => window.open('/egresado/redactar/imprimir', '_blank')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white border border-brand-red text-brand-red rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Vista Previa
          </button>
        </div>

        <button 
          type="submit" 
          disabled={pending || isLocked || !allUploaded}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {pending ? "Enviando..." : (isLocked ? "Propuesta Bloqueada" : "Mandar propuesta")}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </button>
      </div>
    </form>
  );
}
