"use client";

import { useState, useEffect } from "react";
import { saveCartaAceptacion } from "@/app/actions/carta";
import { useRouter } from "next/navigation";

interface CartaProyectoFormProps {
  propuestaId: number;
  initialData?: any;
  isLocked: boolean;
  isReadOnly?: boolean;
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
  propuestaId,
  initialData,
  isLocked,
  isReadOnly = false,
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

  const [supTitulo, setSupTitulo] = useState(initialData?.supTitulo || "");
  const [supNombres, setSupNombres] = useState(initialData?.supNombres || "");
  const [supApellidos, setSupApellidos] = useState(initialData?.supApellidos || "");
  const [supCargo, setSupCargo] = useState(initialData?.supCargo || "");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (!existingPdfUrl && !pdfFile) {
      setError("Debes adjuntar la carta de aceptación en formato PDF.");
      return;
    }

    if (!fechaEmision || !fechaInicio || !fechaFin || !supNombres || !supApellidos || !supTitulo || !supCargo) {
      setError("Por favor completa todos los campos del formulario.");
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
    formData.append("supTitulo", supTitulo);
    formData.append("supNombres", supNombres);
    formData.append("supApellidos", supApellidos);
    formData.append("supCargo", supCargo);

    if (pdfFile) {
      formData.append("archivoPdf", pdfFile);
    }

    const res = await saveCartaAceptacion(formData);

    if (!res.success) {
      setError(res.error || "Error al guardar la carta de aceptación.");
    } else {
      setSuccess("Carta de aceptación guardada correctamente.");
      if ((res as any).archivoUrl) setExistingPdfUrl((res as any).archivoUrl);
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Carta de Aceptación de Proyecto</h2>
        <p className="text-sm text-muted mt-1">
          Adjunta la carta de aceptación otorgada por la institución o empresa en formato PDF y completa los datos del supervisor.
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              Fecha de Inicio de Proyecto <span className="text-red-500">*</span>
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
              Fecha de Fin de Proyecto <span className="text-red-500">*</span>
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

        {/* Supervisor Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">
              Nombres del Supervisor Encargado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supNombres}
              onChange={(e) => setSupNombres(e.target.value)}
              disabled={disabled}
              placeholder="Ej: Carlos Alberto"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">
              Apellidos del Supervisor Encargado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supApellidos}
              onChange={(e) => setSupApellidos(e.target.value)}
              disabled={disabled}
              placeholder="Ej: Mendoza Reyes"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">
              Título del Supervisor Designado <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supTitulo}
              onChange={(e) => setSupTitulo(e.target.value)}
              disabled={disabled}
              placeholder="Ej: Ingeniero, Licenciado, Msc., Dr."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">
              Cargo del Supervisor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supCargo}
              onChange={(e) => setSupCargo(e.target.value)}
              disabled={disabled}
              placeholder="Ej: Gerente de Innovación y Tecnología"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
          </div>
        </div>

        {!disabled && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar Carta"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
