"use client";

import { useState, useEffect } from "react";
import { saveCartaAceptacion } from "@/app/actions/carta";
import { guardarPersonasCarta } from "@/app/actions/personasCarta";
import { useRouter } from "next/navigation";
import PersonasCarta from "./PersonasCarta";
import { revisarEntrada, type EntradaPersonasCarta } from "@/lib/personasCarta";
import type { DatosPersonasCarta } from "@/lib/personasCartaServidor";

interface CartaProyectoFormProps {
  /** R5: firmantes y supervisor de la empresa, lo elegido y la última solicitud a la administración. */
  personas: DatosPersonasCarta;
  // Pasos del asistente según el orden de la ficha (P2); por defecto, el orden de la fase 1.
  pasoSiguiente?: number;
  pasoAnterior?: number;
  propuestaId: number;
  initialData?: any;
  isLocked: boolean;
  isReadOnly?: boolean;
  isInvestigacion?: boolean;
}

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "";
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export default function CartaProyectoForm({
  pasoSiguiente,
  pasoAnterior,
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
  isInvestigacion = false,
  personas,
}: CartaProyectoFormProps) {
  const router = useRouter();

  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const defaultEmision = initialData?.fechaEmision || getTodayStr();
  const defaultInicio = initialData?.fechaInicio || addDays(defaultEmision, 21);
  const defaultFin = initialData?.fechaFin || addDays(defaultInicio, 150);

  const [fechaEmision, setFechaEmision] = useState(defaultEmision);
  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);

  // R5: los firmantes y el supervisor se eligen de la empresa (o se agregan como solicitud); ya no se escriben a mano
  const [entrada, setEntrada] = useState<EntradaPersonasCarta>(() => ({
    firmanteIds: personas.seleccion.firmanteIds,
    // Los nuevos de una solicitud todavía pendiente se muestran para poder corregirlos
    firmantesNuevos: personas.ultima?.estado === "pendiente" ? personas.ultima.datos.firmantesNuevos ?? [] : [],
    supervisorId: personas.seleccion.supervisorId,
    supervisorNuevo: personas.ultima?.estado === "pendiente" ? personas.ultima.datos.supervisorNuevo ?? null : null,
    sinSupervisor: personas.seleccion.sinSupervisor,
    motivoSinSupervisor: personas.seleccion.motivoSinSupervisor,
  }));

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(initialData?.archivoUrl || null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = isLocked || isReadOnly;

  const handleEmisionChange = (val: string) => {
    setFechaEmision(val);
    if (val) {
      const calculatedInicio = addDays(val, 21);
      setFechaInicio(calculatedInicio);
      const calculatedFin = addDays(calculatedInicio, 150);
      setFechaFin(calculatedFin);
    }
  };

  const handleInicioChange = (val: string) => {
    setFechaInicio(val);
    if (val) {
      const calculatedFin = addDays(val, 150);
      setFechaFin(calculatedFin);
    }
  };

  const openPdf = (url: string) => {
    const newWin = window.open("", "_blank");
    if (newWin) {
      newWin.document.write(`
        <html>
          <head><title>Carta de Aceptación</title></head>
          <body style="margin:0;padding:0;">
            <iframe width="100%" height="100%" style="border:none;" src="${url}"></iframe>
          </body>
        </html>
      `);
      newWin.document.close();
    }
  };

  const handleSave = async (shouldAdvance: boolean) => {
    if (disabled) return;

    if (!existingPdfUrl && !pdfFile) {
      setError("Debes adjuntar la carta de aceptación en formato PDF.");
      return;
    }

    if (!fechaEmision || !fechaInicio || !fechaFin) {
      setError("Por favor completa las fechas de la carta.");
      return;
    }
    const problemas = revisarEntrada(entrada);
    if (problemas.length) {
      setError(problemas.join(" "));
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("propuestaId", propuestaId.toString());
    formData.append("fechaEmision", fechaEmision);
    formData.append("fechaInicio", fechaInicio);
    formData.append("fechaFin", fechaFin);

    if (pdfFile) {
      if (pdfFile.size > 10 * 1024 * 1024) {
        setError("El archivo no debe superar los 10MB.");
        setPending(false);
        return;
      }
      formData.append("archivoPdf", pdfFile);
    }

    const res = await saveCartaAceptacion(formData);

    const resPersonas = res.success ? await guardarPersonasCarta(propuestaId, entrada) : null;

    if (!res.success) {
      setError(res.error || "Error al guardar la carta de aceptación.");
    } else if (!resPersonas?.success) {
      setError(resPersonas?.error || "No se pudieron guardar los firmantes y el supervisor.");
    } else {
      setSuccess(
        resPersonas.solicitud
          ? "Carta guardada. Los firmantes o el supervisor nuevos (o la falta de supervisor) se enviaron a la administración para validarlos."
          : "Carta de aceptación guardada correctamente.",
      );
      if ((res as any).archivoUrl) setExistingPdfUrl((res as any).archivoUrl);
      if (shouldAdvance) {
        router.push(`?id=${propuestaId}&step=${pasoSiguiente ?? 4}`);
        router.refresh();
      }
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">
          {isInvestigacion ? "Carta de Aceptación de Investigación" : "Carta de Aceptación de Proyecto"}
        </h2>
        <p className="text-sm text-muted mt-1">
          Adjunta la carta de aceptación otorgada por la institución o empresa en formato PDF y elige quiénes la firman y quién será el supervisor.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Upload File Block */}
        <div className="p-4 bg-slate-50 border border-border rounded-xl">
          <label className="block text-sm font-bold text-card-dark mb-2">
            Documento de Carta de Aceptación (PDF) <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {!disabled && (
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm transition-colors shadow-sm shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pdfFile ? "Cambiar Archivo PDF" : "Seleccionar PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}

            {pdfFile && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                Archivo seleccionado: {pdfFile.name}
              </span>
            )}

            {existingPdfUrl && !pdfFile && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                  PDF Cargado previamente
                </span>
                <button
                  type="button"
                  onClick={() => openPdf(existingPdfUrl)}
                  className="text-xs font-bold text-brand-red underline hover:text-brand-red-hover"
                >
                  Ver PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Pickers with Automated Logic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-card-dark mb-1">
              Fecha de Emisión de Carta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaEmision}
              onChange={(e) => handleEmisionChange(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Calcula automáticamente la fecha de inicio (+21 días) y fin (+150 días).
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-1">
              {isInvestigacion ? "Fecha de Inicio de Investigación" : "Fecha de Inicio de Proyecto"} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => handleInicioChange(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Debe ser al menos 3 semanas (21 días) posterior a la fecha de emisión.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-1">
              {isInvestigacion ? "Fecha de Fin de Investigación" : "Fecha de Fin de Proyecto"} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Período exacto establecido de 150 días de ejecución.
            </p>
          </div>
        </div>

        {/* R5: firmantes y supervisor de la empresa */}
        {personas.empresaId ? (
          <PersonasCarta firmantes={personas.firmantes} supervisores={personas.supervisores} valor={entrada} onChange={setEntrada} ultima={personas.ultima} disabled={disabled} />
        ) : (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Para elegir firmantes y supervisor, primero selecciona la empresa en el paso Datos empresariales.
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
          <button
            type="button"
            onClick={() => router.push(`?id=${propuestaId}&step=${pasoAnterior ?? 2}`)}
            className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors cursor-pointer"
          >
            {pasoAnterior ? "← Paso anterior" : "← Volver a Actores"}
          </button>

          {!disabled && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSave(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Guardar Borrador
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSave(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {pending ? "Guardando..." : "Guardar y Continuar"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
