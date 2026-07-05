"use client";

import { useState } from "react";
import { processCsvImport } from "@/app/actions/csv";

export default function CsvForm() {
  const [pending, setPending] = useState(false);
  const [reporte, setReporte] = useState<{ exitosos: number; errores: { linea: number; motivo: string }[] } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setReporte(null);
    setGlobalError(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file-upload") as File;
    
    if (!file || file.size === 0) {
      setGlobalError("Por favor, selecciona un archivo CSV.");
      setPending(false);
      return;
    }

    const result = await processCsvImport(formData);

    if (result.success && result.resultados) {
      setReporte(result.resultados);
    } else {
      setGlobalError(result.error || "Ocurrió un error inesperado al procesar el archivo.");
    }

    setPending(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Tipo de Entidad a Importar</label>
          <select name="entidad" className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red">
            <option value="usuarios">Usuarios del Sistema</option>
            <option value="facultades">Facultades y Carreras</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1.5">Archivo CSV</label>
          <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10 hover:bg-slate-50 transition-colors relative">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-transparent font-semibold text-brand-red hover:text-brand-red-hover">
                  <span>Sube un archivo</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    accept=".csv" 
                    className="sr-only" 
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                  />
                </label>
              </div>
              <p className="text-xs leading-5 text-gray-500 mt-1">Solo archivos .CSV hasta 10MB</p>
              {fileName && (
                <div className="mt-3 inline-block bg-brand-red/10 text-brand-red text-xs font-bold px-3 py-1 rounded-full">
                  Archivo seleccionado: {fileName}
                </div>
              )}
            </div>
          </div>
        </div>

        {globalError && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
            {globalError}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <button 
            type="submit" 
            disabled={pending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-card-dark hover:bg-slate-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {pending ? (
              <span>Procesando...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Procesar Importación
              </>
            )}
          </button>
        </div>
      </form>

      {/* Reporte de Resultados */}
      {reporte && (
        <div className="mt-8 border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-muted-bg px-6 py-4 border-b border-border">
            <h3 className="font-bold text-card-dark text-lg">Reporte de Importación</h3>
          </div>
          
          <div className="p-6 bg-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-emerald-100 text-emerald-700 px-4 py-3 rounded-lg border border-emerald-200 flex-1 text-center">
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Filas Procesadas</p>
                <p className="text-3xl font-black">{reporte.exitosos}</p>
              </div>
              <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg border border-red-200 flex-1 text-center">
                <p className="text-xs font-bold uppercase tracking-wider mb-1">Errores (Filas Ignoradas)</p>
                <p className="text-3xl font-black">{reporte.errores.length}</p>
              </div>
            </div>

            {reporte.errores.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Detalle de Errores por Fila
                </h4>
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {reporte.errores.map((err, idx) => (
                    <div key={idx} className="p-3 text-sm flex gap-4 hover:bg-slate-50">
                      <span className="font-bold text-card-dark min-w-[60px]">Línea {err.linea}:</span>
                      <span className="text-muted">{err.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
