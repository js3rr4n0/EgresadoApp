"use client";

import { useState } from "react";
import Papa from "papaparse";
import { validateAndInsertCsv } from "@/app/actions/csv";

type ImportType = "facultades" | "carreras" | "usuarios";

const EXPECTED_HEADERS = {
  facultades: ["nombre", "codigo", "activa"],
  carreras: ["nombre", "codigo", "facultad_codigo", "activa"],
  usuarios: ["nombre_completo", "correo", "rol", "carnet", "cohorte", "carrera_codigo", "facultad_codigo", "activo", "carreras_asignadas", "cohortes_asignadas"],
};

export default function CsvUploader() {
  const [selectedType, setSelectedType] = useState<ImportType>("facultades");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isValidating, setIsValidating] = useState(false);

  const resetState = () => {
    setFileName(null);
    setParsedData(null);
    setErrors([]);
    setIsSuccess(false);
    setIsValidating(false);
  };

  const handleTypeChange = (type: ImportType) => {
    setSelectedType(type);
    resetState();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsSuccess(false);
    setErrors([]);
    setParsedData(null);
    setIsValidating(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: async (results) => {
        if (results.errors.length > 0) {
          setErrors(results.errors.map(err => `Error CSV Fila ${err.row}: ${err.message}`));
          setIsValidating(false);
          return;
        }

        const data = results.data as any[];
        // Basic column validation
        const expected = EXPECTED_HEADERS[selectedType];
        const actual = Object.keys(data[0] || {});
        
        const missing = expected.filter(h => !actual.includes(h));
        if (missing.length > 0) {
          setErrors([`El archivo no tiene el formato correcto. Faltan las columnas: ${missing.join(", ")}`]);
          setIsValidating(false);
          return;
        }

        setParsedData(data);
        
        // Immediate Validation against DB
        const result = await validateAndInsertCsv(selectedType, data, true); // dryRun = true
        if (!result.success && result.errors) {
          setErrors(result.errors);
        }
        setIsValidating(false);
      },
      error: (error: any) => {
        setErrors([`Error al leer el archivo: ${error.message}`]);
        setIsValidating(false);
      }
    });
  };

  const handleConfirmAndUpload = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsPending(true);
    setErrors([]);

    const result = await validateAndInsertCsv(selectedType, parsedData);
    
    if (result.success) {
      setIsSuccess(true);
      setParsedData(null); // Clear preview to show success message clearly
    } else {
      setErrors(result.errors || ["Ocurrió un error desconocido."]);
    }
    
    setIsPending(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Sidebar: Formats */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        <h3 className="text-sm font-bold text-card-dark uppercase tracking-widest mb-2">1. Selecciona Formato</h3>
        
        {(Object.keys(EXPECTED_HEADERS) as ImportType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              selectedType === type 
                ? "bg-red-50/50 border-brand-red shadow-sm" 
                : "bg-white border-border hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-card-dark mb-1">
              <svg className={`w-4 h-4 ${selectedType === type ? "text-brand-red" : "text-muted"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {type}.csv
            </div>
            <div className="text-[10px] text-muted font-mono leading-relaxed truncate">
              {EXPECTED_HEADERS[type].join(", ")}
            </div>
          </button>
        ))}
      </div>

      {/* Main Area: Upload / Preview */}
      <div className="flex-1 w-full min-w-0 bg-white border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
        {/* State 1: Upload (No data, no success) */}
        {!parsedData && !isSuccess && (
          <div>
            <h3 className="text-lg font-bold text-card-dark mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-card-dark text-white flex items-center justify-center text-xs">2</span>
              Sube el archivo {selectedType}.csv
            </h3>
            
            <div className="mt-4 border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-red mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <h4 className="font-bold text-card-dark mb-1">Haz clic para buscar en tu equipo</h4>
              <p className="text-sm text-muted mb-6">Archivo requerido en formato .CSV</p>
              
              <label className="cursor-pointer bg-white border border-border px-6 py-2 rounded-lg text-sm font-bold text-card-dark hover:bg-slate-50 transition-colors shadow-sm">
                Seleccionar Archivo
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            
            {errors.length > 0 && (
              <div className="mt-6 bg-red-50 border border-red-100 rounded-lg p-4">
                <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Error en el archivo
                </h4>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                  {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Estructura requerida para {selectedType}.csv:
              </h4>
              <div className="flex flex-wrap gap-2">
                {EXPECTED_HEADERS[selectedType].map(col => (
                  <span key={col} className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 text-xs font-mono rounded-md">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* State 2: Preview / Validation */}
        {parsedData && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-card-dark flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-card-dark text-white flex items-center justify-center text-xs">3</span>
                  Previsualización de Datos
                </h3>
                <p className="text-sm text-muted mt-1">Archivo cargado: <span className="font-bold">{fileName}</span> ({parsedData.length} registros encontrados)</p>
              </div>
              <button onClick={resetState} className="text-sm font-bold text-brand-red hover:text-red-700 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Cancelar y subir otro
              </button>
            </div>

            {errors.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-red-100/50 border-b border-red-200 flex items-center gap-2 font-bold text-red-800 text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Se encontraron {errors.length} error(es) en el archivo
                </div>
                <div className="p-4 max-h-48 overflow-y-auto space-y-2">
                  {errors.map((err, idx) => {
                    const match = err.match(/^Fila (\d+): (.*)/);
                    if (match) {
                      return (
                        <div key={idx} className="flex gap-3 text-sm text-red-700 items-start">
                          <span className="px-1.5 py-0.5 bg-red-200/50 rounded font-bold text-xs whitespace-nowrap">Fila {match[1]}</span>
                          <span>{match[2]}</span>
                        </div>
                      );
                    }
                    return <div key={idx} className="text-sm text-red-700">{err}</div>;
                  })}
                </div>
              </div>
            )}

            <div className="border border-border rounded-xl overflow-hidden mb-6">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 border-b border-border z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold text-card-dark text-xs uppercase tracking-widest">#</th>
                      {EXPECTED_HEADERS[selectedType].map(col => (
                        <th key={col} className="px-4 py-3 font-bold text-card-dark text-xs uppercase tracking-widest">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedData.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-muted font-bold">{idx + 1}</td>
                        {EXPECTED_HEADERS[selectedType].map(col => (
                          <td key={col} className="px-4 py-3 text-card-dark truncate max-w-[200px]">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 100 && (
                <div className="p-3 bg-slate-50 text-center text-xs font-bold text-muted border-t border-border">
                  Mostrando los primeros 100 registros de {parsedData.length}...
                </div>
              )}
            </div>

            <div className={`mt-auto p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${errors.length > 0 ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${errors.length > 0 ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h4 className={`font-bold ${errors.length > 0 ? 'text-slate-500' : 'text-emerald-800'}`}>
                    {errors.length > 0 ? 'No puedes subir un archivo con errores' : '¿La información de la tabla es correcta?'}
                  </h4>
                  <p className={`text-xs ${errors.length > 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                    {errors.length > 0 ? 'Corrige los errores detallados arriba y vuelve a intentar.' : 'Verifica que las columnas coincidan con lo esperado antes de subir a la base de datos.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleConfirmAndUpload} 
                disabled={errors.length > 0 || isPending || isValidating}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                {isPending ? (
                  <>Procesando subida...</>
                ) : isValidating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Validando datos...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Confirmar y Subir a Base de Datos
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* State 3: Success */}
        {isSuccess && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-card-dark mb-2">¡Importación Exitosa!</h3>
            <p className="text-muted mb-8 max-w-md">Todos los registros del archivo fueron validados y guardados correctamente en la base de datos.</p>
            <button onClick={resetState} className="px-6 py-2.5 rounded-lg border border-border font-bold text-card-dark hover:bg-slate-50 transition-colors shadow-sm">
              Subir otro archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
