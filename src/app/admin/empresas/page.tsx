import { getEmpresas, toggleEmpresaStatus } from "@/app/actions/empresas";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function EmpresasPage() {
  const result = await getEmpresas();
  const empresas = result.success && result.data ? result.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-red">Catálogo de Empresas</h1>
          <p className="text-muted text-sm mt-1">
            Administra las instituciones disponibles para las propuestas de pasantía.
          </p>
        </div>
        
        <Link
          href="/admin/csv"
          className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar CSV
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Buscar por nombre de empresa o área..." className="w-full pl-10 pr-4 py-2 rounded-full border border-border bg-muted-bg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
        </div>
        <div className="flex gap-4">
          <select className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white">
            <option>Estado de Habilitación</option>
            <option>Habilitadas</option>
            <option>Deshabilitadas</option>
          </select>
          <select className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white">
            <option>Verificación</option>
            <option>Verificadas</option>
            <option>No Verificadas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Institución</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Área / Rubro</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-center">Verificación</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-center">Estado (Habilitada)</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {empresas.map((emp) => (
                <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${!emp.habilitada ? 'opacity-70 bg-slate-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className={`font-bold ${emp.habilitada ? 'text-brand-red' : 'text-muted'}`}>
                      {emp.nombre}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-card-dark">
                    {emp.area || <span className="text-muted italic">Sin especificar</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                      emp.verificada 
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {emp.verificada ? 'Verificada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <form action={async () => {
                      "use server";
                      await toggleEmpresaStatus(emp.id, emp.habilitada);
                    }}>
                      <button type="submit" className="inline-flex items-center" title={emp.habilitada ? 'Deshabilitar empresa' : 'Habilitar empresa'}>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${emp.habilitada ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${emp.habilitada ? 'left-[22px]' : 'left-0.5'}`}></div>
                        </div>
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-muted hover:text-card-dark transition-colors" title="Detalles">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    No hay empresas registradas en el catálogo.
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
