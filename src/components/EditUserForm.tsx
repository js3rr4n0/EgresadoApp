"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUsuario } from "@/app/actions/usuarios";
import Link from "next/link";

interface Carrera {
  id: number;
  nombre: string;
}

interface UsuarioData {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: string;
  carnet: string | null;
  carreraId: number | null;
  activo: boolean;
}

export default function EditUserForm({ user, carreras }: { user: UsuarioData; carreras: Carrera[] }) {
  const router = useRouter();
  const [rol, setRol] = useState(user.rol);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateUsuario(user.id, formData);

    if (result.success) {
      router.push("/admin/usuarios");
      router.refresh();
    } else {
      setError(result.error || "Ocurrió un error inesperado al actualizar.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-brand-red rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Información Personal */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-card-dark flex items-center gap-2 mb-6 text-brand-red">
          <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Información Personal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Nombre Completo</label>
            <input name="nombreCompleto" type="text" required defaultValue={user.nombreCompleto} className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Correo Institucional</label>
            <input name="correo" type="email" required defaultValue={user.correo} className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">
              Carnet (Opcional)
            </label>
            <input name="carnet" type="text" defaultValue={user.carnet || ""} className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Contraseña</label>
            <div className="relative">
              <input type="password" disabled value="********" className="w-full px-4 py-2.5 rounded-lg border border-border text-muted bg-slate-50 focus:outline-none transition-all cursor-not-allowed" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted font-medium">(Solo lectura)</span>
            </div>
            <p className="text-xs text-muted mt-1.5">Por seguridad, la contraseña no se puede editar aquí.</p>
          </div>
        </div>
      </div>

      {/* Rol y Adscripción */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-card-dark mb-6">Rol y Adscripción</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Rol</label>
            <select 
              name="rol" 
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            >
              <option value="admin">admin</option>
              <option value="decanato">decanato</option>
              <option value="asesor">asesor</option>
              <option value="egresado">egresado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Carrera Principal</label>
            <select name="carreraId" defaultValue={user.carreraId || ""} className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all">
              <option value="">Ninguna / No Aplica</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="activo" defaultChecked={user.activo} className="w-5 h-5 rounded border-gray-300 text-brand-red focus:ring-brand-red" />
          <span className="text-sm font-bold text-card-dark">Usuario Activo</span>
        </label>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/admin/usuarios" className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted-bg transition-colors text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={pending} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-card-dark hover:bg-slate-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {pending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
