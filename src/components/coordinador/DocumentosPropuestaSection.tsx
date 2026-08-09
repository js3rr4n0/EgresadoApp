"use client";

import { useState, useEffect } from "react";
import {
  getDocumentosPropuesta,
  uploadDocumentoPropuesta,
  deleteDocumentoPropuesta,
  TIPOS_DOCUMENTOS_REQUERIDOS,
} from "@/app/actions/documentosPropuesta";

interface Props {
  propuestaId: number;
  onStatusChange?: (allUploaded: boolean) => void;
  canUpload?: boolean;
}

export default function DocumentosPropuestaSection({
  propuestaId,
  onStatusChange,
  canUpload = true,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [docsData, setDocsData] = useState<{
    docs: Record<string, any>;
    missingDocs: string[];
    allRequiredUploaded: boolean;
  }>({
    docs: {},
    missingDocs: [],
    allRequiredUploaded: false,
  });

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const res = await getDocumentosPropuesta(propuestaId);
    setLoading(false);
    if (res.success && res.data) {
      setDocsData(res.data);
      if (onStatusChange) {
        onStatusChange(res.data.allRequiredUploaded);
      }
    }
  };

  useEffect(() => {
    if (propuestaId) {
      fetchDocs();
    }
  }, [propuestaId]);

  const handleFileUpload = async (tipo: string, file: File) => {
    setUploadingType(tipo);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadDocumentoPropuesta(propuestaId, tipo, formData);
    setUploadingType(null);

    if (res.success) {
      setMessage(`¡Documento subido correctamente!`);
      await fetchDocs();
    } else {
      alert(res.error || "Error al subir documento.");
    }
  };

  const handleDelete = async (tipo: string) => {
    if (!confirm("¿Está seguro de eliminar este documento?")) return;
    setDeletingType(tipo);
    setMessage(null);

    const res = await deleteDocumentoPropuesta(propuestaId, tipo);
    setDeletingType(null);

    if (res.success) {
      setMessage("Documento eliminado.");
      await fetchDocs();
    } else {
      alert(res.error || "Error al eliminar documento.");
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs font-semibold text-slate-500">
        Cargando estado de documentos de la propuesta...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>📋 Documentos de Validación Obligatorios</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                docsData.allRequiredUploaded
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              {docsData.allRequiredUploaded ? "Completo (4/4)" : `Pendiente (${4 - docsData.missingDocs.length}/4)`}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Se requiere que los 4 documentos estén subidos y verificados para habilitar los botones de Aprobación/Rechazo.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Global Status Banner */}
      {docsData.allRequiredUploaded ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
            ✓
          </div>
          <div>
            <p className="font-extrabold text-emerald-950 text-sm">
              Requisitos Documentales Cumplidos
            </p>
            <p className="text-xs text-emerald-800">
              Se han subido y verificado la Propuesta aceptada/modificada, el Plan de trabajo firmado y ambos dictamenes. Las acciones de Aceptar y Rechazar están HABILITADAS.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-base shrink-0">
            🔒
          </div>
          <div>
            <p className="font-extrabold text-amber-950 text-sm">
              Botones de Acción Bloqueados
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Faltan los siguientes documentos obligatorios:{" "}
              <span className="font-bold text-amber-950">{docsData.missingDocs.join(", ")}</span>.
              Debe subir o solicitar dichos archivos para habilitar la resolución final.
            </p>
          </div>
        </div>
      )}

      {/* Grid of 4 Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TIPOS_DOCUMENTOS_REQUERIDOS.map((docItem) => {
          const doc = docsData.docs[docItem.tipo];
          const isUploaded = !!doc && !!doc.archivoUrl;
          const isUploading = uploadingType === docItem.tipo;
          const isDeleting = deletingType === docItem.tipo;

          return (
            <div
              key={docItem.tipo}
              className={`p-4 rounded-xl border transition-all ${
                isUploaded
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-slate-50 border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>{docItem.label}</span>
                  </h4>
                  {doc?.nombreArchivo && (
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5 font-mono">
                      {doc.nombreArchivo}
                    </p>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                    isUploaded
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {isUploaded ? "✓ Subido" : "Pendiente"}
                </span>
              </div>

              {isUploaded ? (
                <div className="flex items-center gap-2 pt-2 border-t border-emerald-100">
                  <a
                    href={doc.archivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>📄 Ver Documento</span>
                  </a>
                  {canUpload && (
                    <button
                      onClick={() => handleDelete(docItem.tipo)}
                      disabled={isDeleting}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-1.5 px-2.5 rounded-lg border border-rose-200 transition-colors"
                      title="Eliminar o Reemplazar Documento"
                    >
                      {isDeleting ? "..." : "🗑️ Reemplazar"}
                    </button>
                  )}
                </div>
              ) : (
                canUpload && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Seleccionar archivo PDF para subir:
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      disabled={isUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(docItem.tipo, f);
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-brand-red-dark cursor-pointer"
                    />
                    {isUploading && (
                      <p className="text-[11px] text-amber-700 font-bold mt-1">Subiendo archivo...</p>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
