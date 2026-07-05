import { getPeriodos, activarPeriodo } from "@/app/actions/periodos";
import PeriodoForm from "@/components/PeriodoForm";

export default async function PeriodosPage() {
  const result = await getPeriodos();
  const periodos = result.success && result.data ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-red">Fechas Clave y Periodos</h1>
        <p className="text-muted text-sm mt-1">
          Configura y administra los periodos académicos para la recepción de propuestas de graduación.
        </p>
      </div>

      <PeriodoForm />

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted-bg">
          <h3 className="font-bold text-card-dark">Historial de Periodos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Periodo ID</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Recepción</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Informes (1° / Final)</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-center">Estado</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periodos.map((p) => {
                const isActive = p.activo;
                
                // Formatear fechas
                const formatearFecha = (d: string | null | Date) => {
                  if (!d) return "N/A";
                  const date = new Date(d);
                  return new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
                };

                return (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isActive ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-brand-red">#{p.id}</div>
                    </td>
                    <td className="px-6 py-4 text-card-dark">
                      <span className="block font-medium">{formatearFecha(p.inicioRecepcion)}</span>
                      <span className="block text-muted text-xs">al {formatearFecha(p.finRecepcion)}</span>
                    </td>
                    <td className="px-6 py-4 text-card-dark">
                      <span className="block font-medium">{formatearFecha(p.fechaPrimerInforme)}</span>
                      <span className="block text-muted text-xs">Final: {formatearFecha(p.fechaInformeFinal)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest ${
                        isActive 
                          ? 'bg-amber-100 text-amber-700 border-amber-200' 
                          : 'bg-muted-bg text-muted border-border'
                      }`}>
                        {isActive ? 'Activo' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isActive && (
                        <form action={async () => {
                          "use server";
                          await activarPeriodo(p.id);
                        }}>
                          <button type="submit" className="text-sm font-semibold text-brand-red hover:text-brand-red-hover transition-colors">
                            Activar este periodo
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {periodos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    No hay periodos configurados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
