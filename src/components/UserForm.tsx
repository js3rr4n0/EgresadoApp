"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearUsuario } from "@/app/actions/usuarios";
import Link from "next/link";

interface Carrera {
  id: number;
  nombre: string;
}

interface Periodo {
  id: number;
  nombre: string;
  activo: boolean;
}

export default function UserForm({ carreras, periodos = [] }: { carreras: Carrera[], periodos?: Periodo[] }) {
  const router = useRouter();
  const [rol, setRol] = useState("egresado");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cohortesList, setCohortesList] = useState<{ cohorte: string, activa: boolean }[]>([]);
  const [newCohorte, setNewCohorte] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("cohortesAsignadas", JSON.stringify(cohortesList));
    const result = await crearUsuario(formData);

    if (result.success) {
      router.push("/admin/usuarios");
      router.refresh();
    } else {
      setError(result.error || "Ocurrió un error inesperado.");
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
        <h3 className="text-sm font-semibold text-card-dark flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Información Personal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Nombre Completo</label>
            <input name="nombreCompleto" type="text" required placeholder="Ej: Juan Pérez" className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Correo Institucional</label>
            <input name="correo" type="email" required placeholder="usuario@universidad.edu" className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
          </div>
          
          {/* Solo para egresados */}
          {rol === "egresado" && (
            <>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Carnet <span className="text-brand-red">*</span>
                </label>
                <input name="carnet" type="text" required placeholder="EJ: 20240101" className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Cohorte <span className="text-brand-red">*</span>
                </label>
                <select name="cohorte" required className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all bg-white">
                  <option value="">Seleccionar cohorte...</option>
                  {periodos.map(p => (
                    <option key={p.id} value={p.nombre}>{p.nombre} {p.activo ? "(Activo)" : ""}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-1.5">Contraseña Temporal</label>
            <input name="password" type="password" required placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all" />
            <p className="text-xs text-muted mt-1.5">El usuario deberá cambiarla al primer acceso.</p>
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

          {/* Solo para egresados */}
          {rol === "egresado" && (
            <div>
              <label className="block text-sm font-bold text-foreground mb-1.5">Carrera Principal</label>
              <select name="carreraId" required className="w-full px-4 py-2.5 rounded-lg border border-border text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all">
                <option value="">Seleccionar carrera</option>
                {carreras.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1.5">La facultad se asignará automáticamente en base a la carrera seleccionada.</p>
            </div>
          )}
        </div>

        {/* Cohortes Asignadas (Historial) - Solo para Asesor o Decanato */}
        {(rol === "asesor" || rol === "decanato") && (
          <div className="mt-6 pt-6 border-t border-border">
            <label className="block text-sm font-bold text-foreground mb-3">
              Historial de Cohortes Asignadas
            </label>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newCohorte}
                onChange={e => setNewCohorte(e.target.value)}
                placeholder="Ej: C12026"
                pattern="^C[12]\d{4}$"
                title="Debe ser C1 o C2 seguido del año (Ej: C12026)"
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
              />
              <button 
                type="button"
                onClick={() => {
                  if (newCohorte && !cohortesList.find(c => c.cohorte === newCohorte)) {
                    setCohortesList([...cohortesList, { cohorte: newCohorte, activa: true }]);
                    setNewCohorte("");
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-card-dark rounded-lg font-semibold transition-colors border border-border"
              >
                Añadir
              </button>
            </div>
            
            {cohortesList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cohortesList.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted-bg border border-border p-3 rounded-lg">
                    <span className="font-bold text-card-dark text-sm">{item.cohorte}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                          type="checkbox" 
                          checked={item.activa}
                          onChange={(e) => {
                            const updated = [...cohortesList];
                            updated[index].activa = e.target.checked;
                            setCohortesList(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red"
                        />
                        <span className={item.activa ? "text-emerald-600 font-bold" : "text-muted"}>
                          {item.activa ? "Activa" : "Cerrada"}
                        </span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setCohortesList(cohortesList.filter((_, i) => i !== index))}
                        className="text-muted hover:text-brand-red transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted italic text-center p-4 border border-dashed border-border rounded-lg bg-slate-50">
                Aún no hay cohortes asignadas
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="activo" defaultChecked className="w-5 h-5 rounded border-gray-300 text-brand-red focus:ring-brand-red" />
          <span className="text-sm font-bold text-card-dark">Usuario Activo</span>
        </label>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href="/admin/usuarios" className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted-bg transition-colors text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={pending} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-card-dark hover:bg-slate-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {pending ? "Guardando..." : "Guardar Usuario"}
          </button>
        </div>
      </div>
    </form>
  );
}
