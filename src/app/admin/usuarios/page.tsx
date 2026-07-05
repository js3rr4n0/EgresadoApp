import { getUsuarios, toggleUserStatus } from "@/app/actions/usuarios";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function UsuariosPage() {
  const result = await getUsuarios();
  const usuarios = result.success && result.data ? result.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-brand-red">Gestión de Usuarios</h1>
        
        <Link
          href="/admin/usuarios/nuevo"
          className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Buscar por nombre o correo..." className="w-full pl-10 pr-4 py-2 rounded-full border border-border bg-muted-bg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" />
        </div>
        <div className="flex gap-4">
          <select className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white">
            <option>Todos los Roles</option>
            <option>Egresado</option>
            <option>Asesor</option>
            <option>Decanato</option>
            <option>Administrador</option>
          </select>
          <select className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white">
            <option>Estado</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
          <select className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white">
            <option>Facultad</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Nombre Completo</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Correo</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Rol</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase">Facultad / Carrera</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-center">Estado</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-center">Último Acceso</th>
                <th className="px-6 py-4 font-bold text-card-dark text-xs tracking-wider uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-brand-red">{user.nombreCompleto}</div>
                    {user.carnet && <div className="text-muted text-xs mt-0.5">{user.carnet}</div>}
                  </td>
                  <td className="px-6 py-4 text-card-dark">
                    {user.correo}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-muted-bg text-muted border border-border uppercase tracking-widest">
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.facultad ? (
                      <div>
                        <span className="block font-bold text-brand-red">{user.facultad}</span>
                        <span className="block text-muted text-xs">{user.carrera}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="block font-bold text-brand-red">Sin Asignar</span>
                        <span className="block text-muted text-xs">Sin Asignar</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center">
                      <div className={`w-10 h-5 rounded-full relative ${user.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${user.activo ? 'left-[22px]' : 'left-0.5'}`}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-muted italic text-xs">No ha accedido</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-muted hover:text-card-dark transition-colors" title="Editar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button className="text-muted hover:text-brand-red transition-colors" title="Eliminar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No hay usuarios registrados en el sistema.
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
