import Link from "next/link";
import CsvForm from "@/components/CsvForm";

export default function CsvImportPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-red">Carga Masiva de Datos</h1>
        <p className="text-muted text-sm mt-1">
          Importa registros masivos al sistema utilizando archivos CSV. Sigue el formato exacto de las plantillas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-card-dark mb-4">Zona de Importación</h3>
            <CsvForm />
          </div>
        </div>

        {/* Right Col: Templates */}
        <div className="space-y-6">
          <div className="bg-card-dark text-white rounded-xl p-6 shadow-sm relative overflow-hidden">
             <svg className="absolute -right-4 -top-4 w-24 h-24 text-white/5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" />
            </svg>
            <h3 className="font-bold mb-4 relative z-10 text-lg">Plantillas Descargables</h3>
            <p className="text-sm text-slate-300 mb-6 relative z-10">
              Usa exclusivamente estas plantillas para evitar errores de validación. La primera fila siempre debe ser el encabezado.
            </p>
            
            <div className="space-y-3 relative z-10">
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm">
                <span className="font-semibold">Usuarios.csv</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm">
                <span className="font-semibold">Facultades_Carreras.csv</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm">
                <span className="font-semibold">Empresas_Supervisores.csv</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10 text-sm">
                <span className="font-semibold">Temas_Historicos.csv</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
          </div>

          <div className="bg-[#fef9eb] rounded-xl p-5 border border-amber-100 shadow-sm">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Importante
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              El proceso de importación validará cada fila individualmente. Si una fila contiene un error (ej. formato de correo inválido), esa fila se ignorará, pero el resto del archivo se procesará. Se generará un reporte de errores al finalizar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
