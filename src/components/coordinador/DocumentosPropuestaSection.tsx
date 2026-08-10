"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDocumentosPropuesta,
  uploadDocumentoPropuesta,
  deleteDocumentoPropuesta,
} from "@/app/actions/documentosPropuesta";
import { openDocument } from "@/lib/pdfViewer";

import { getRequiredDocsForTipo } from "@/lib/proposalUtils";

export const TIPOS_DOCUMENTOS_REQUERIDOS = [
  { tipo: "propuesta_aceptada", label: "Propuesta Aceptada / Modificada" },
  { tipo: "plan_trabajo_firmado", label: "Plan de Trabajo Firmado" },
  { tipo: "dictamen_plan_trabajo", label: "Dictamen de Plan de Trabajo" },
  { tipo: "dictamen_propuesta", label: "Dictamen de Propuesta" },
] as const;

interface Props {
  propuestaId: number;
  propuestaEstado?: string;
  propuestaTipo?: string;
  onStatusChange?: (allUploaded: boolean) => void;
  canUpload?: boolean;
}

export default function DocumentosPropuestaSection({
  propuestaId,
  propuestaEstado,
  propuestaTipo,
  onStatusChange,
  canUpload = true,
}: Props) {
  const [currentEstado, setCurrentEstado] = useState<string | undefined>(propuestaEstado);
  const [startingPlan, setStartingPlan] = useState(false);

  useEffect(() => {
    setCurrentEstado(propuestaEstado);
  }, [propuestaEstado]);

  const initialDocs = getRequiredDocsForTipo(propuestaTipo);

  const [loading, setLoading] = useState(true);
  const [docsData, setDocsData] = useState<{
    tipo?: string;
    requiredDocs?: Array<{ tipo: string; label: string }>;
    docs: Record<string, any>;
    missingDocs: string[];
    allRequiredUploaded: boolean;
  }>({
    requiredDocs: initialDocs,
    docs: {},
    missingDocs: initialDocs.map((t) => t.label),
    allRequiredUploaded: false,
  });

  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDarInicioPlan = async () => {
    if (!confirm("¿Está seguro de dar inicio oficial al Plan de Trabajo? El estado cambiará a 'En ejecución'.")) return;
    setStartingPlan(true);
    setMessage(null);
    try {
      const { darInicioPlanTrabajo } = await import("@/app/actions/coordinador");
      const res = await darInicioPlanTrabajo(Number(propuestaId));
      if (res && res.success) {
        setMessage({ type: "success", text: res.message || "Plan de Trabajo iniciado correctamente." });
        setCurrentEstado("en_ejecucion");
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        setMessage({ type: "error", text: res?.error || "Error al iniciar el Plan de Trabajo." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Error al procesar la solicitud." });
    } finally {
      setStartingPlan(false);
    }
  };

  const fetchDocs = useCallback(async () => {
    if (!propuestaId || isNaN(Number(propuestaId))) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getDocumentosPropuesta(Number(propuestaId));
      if (res && res.success && res.data) {
        setDocsData(res.data);
        if (onStatusChange) {
          onStatusChange(res.data.allRequiredUploaded);
        }
      } else if (res && !res.success) {
        console.warn("No se pudieron cargar documentos:", res.error);
      }
    } catch (err) {
      console.error("Error obteniendo documentos:", err);
    } finally {
      setLoading(false);
    }
  }, [propuestaId, onStatusChange]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleFileUpload = async (tipo: string, file: File) => {
    setUploadingType(tipo);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("propuestaId", propuestaId.toString());
      formData.append("tipo", tipo);
      formData.append("file", file);

      const res = await uploadDocumentoPropuesta(formData);
      if (res && res.success) {
        setMessage({ type: "success", text: `Documento subido correctamente.` });
        await fetchDocs();
      } else {
        setMessage({ type: "error", text: res?.error || "Error al subir documento." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Error al subir el archivo." });
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (tipo: string) => {
    if (!confirm("¿Está seguro de eliminar o reemplazar este documento?")) return;
    setDeletingType(tipo);
    setMessage(null);

    try {
      const res = await deleteDocumentoPropuesta(Number(propuestaId), tipo);
      if (res && res.success) {
        setMessage({ type: "success", text: "Documento eliminado." });
        await fetchDocs();
      } else {
        setMessage({ type: "error", text: res?.error || "Error al eliminar documento." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Error al procesar la solicitud." });
    } finally {
      setDeletingType(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-brand-red border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Cargando estado de documentos de la propuesta...</p>
      </div>
    );
  }

  const currentRequiredDocs = docsData.requiredDocs || Array.from(TIPOS_DOCUMENTOS_REQUERIDOS);
  const totalRequiredCount = currentRequiredDocs.length;

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
              {docsData.allRequiredUploaded
                ? `Completo (${totalRequiredCount}/${totalRequiredCount})`
                : `Pendiente (${totalRequiredCount - docsData.missingDocs.length}/${totalRequiredCount})`}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Se requiere que los {totalRequiredCount} documentos estén subidos y verificados para habilitar la aprobación final del expediente.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
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
              Requisitos Documentales Cumplidos ({totalRequiredCount}/{totalRequiredCount})
            </p>
            <p className="text-xs text-emerald-800">
              Se han subido y verificado todos los documentos requeridos. Las acciones de resolución están HABILITADAS.
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
              Revisión Documental Incompleta
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Faltan los siguientes documentos obligatorios:{" "}
              <span className="font-bold text-amber-950">{docsData.missingDocs.join(", ")}</span>.
              Sube los archivos en los recuadros de abajo para habilitar la aprobación del expediente.
            </p>
          </div>
        </div>
      )}

      {/* Grid of Document Cards */}
      <div className={`grid grid-cols-1 ${totalRequiredCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
        {currentRequiredDocs.map((docItem) => {
          const doc = docsData.docs[docItem.tipo];
          const isUploaded = !!doc && !!doc.archivoUrl;
          const isUploading = uploadingType === docItem.tipo;
          const isDeleting = deletingType === docItem.tipo;

          return (
            <div
              key={docItem.tipo}
              className={`p-5 rounded-2xl border transition-all ${
                isUploaded
                  ? "bg-emerald-50/50 border-emerald-300"
                  : "bg-slate-50 border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{docItem.label}</span>
                  </h4>
                  {doc?.nombreArchivo && (
                    <p className="text-[11px] text-slate-500 truncate max-w-[220px] mt-0.5 font-mono">
                      {doc.nombreArchivo}
                    </p>
                  )}
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    isUploaded
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {isUploaded ? "✓ Subido" : "Pendiente"}
                </span>
              </div>

              {isUploaded ? (
                <div className="space-y-3 pt-3 border-t border-emerald-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDocument(doc.archivoUrl, docItem.label)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>📄 Ver PDF Documento</span>
                    </button>
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(docItem.tipo)}
                        disabled={isDeleting}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-2 px-3 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
                        title="Eliminar Documento"
                      >
                        {isDeleting ? "..." : "🗑️ Eliminar"}
                      </button>
                    )}
                  </div>

                  {canUpload && (
                    <div className="pt-2 border-t border-emerald-200/70">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        🔄 Reemplazar por un nuevo PDF:
                      </label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(docItem.tipo, f);
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-800 cursor-pointer"
                      />
                      {isUploading && (
                        <p className="text-[11px] text-amber-700 font-bold mt-1">Actualizando archivo...</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                canUpload && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Subir archivo PDF de {docItem.label}:
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      disabled={isUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(docItem.tipo, f);
                      }}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-brand-red-dark cursor-pointer"
                    />
                    {isUploading && (
                      <p className="text-[11px] text-amber-700 font-bold">Subiendo archivo...</p>
                    )}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Botón / Estado Dar Inicio al Plan de Trabajo */}
      {currentEstado === "en_ejecucion" ? (
        <div className="bg-emerald-50 border-2 border-emerald-400 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 font-extrabold text-sm shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div className="text-left">
              <p className="text-sm font-extrabold text-emerald-900">¡Felicidades! Esta propuesta ya se encuentra en ejecución.</p>
              <p className="text-xs text-emerald-700 font-medium">El plan de trabajo ha iniciado oficialmente para el egresado y el asesor.</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 shadow-xs">
            ✓ En Ejecución
          </span>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>🚀 Dar Inicio al Plan de Trabajo</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Al hacer clic en este botón, el estado de la propuesta cambiará a <strong className="text-emerald-700 font-bold">En ejecución</strong> para el egresado y el asesor.
            </p>
            {!docsData.allRequiredUploaded && (
              <p className="text-[11px] text-amber-800 font-bold mt-1.5 flex items-center gap-1">
                <span>🔒</span>
                <span>Se requiere subir y verificar todos los documentos obligatorios ({totalRequiredCount}/{totalRequiredCount}) para habilitar el inicio del plan.</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDarInicioPlan}
            disabled={!docsData.allRequiredUploaded || startingPlan}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none disabled:active:scale-100 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {startingPlan ? (
              <span>Procesando...</span>
            ) : (
              <>
                <span>🚀</span>
                <span>Dar Inicio al Plan de Trabajo</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
