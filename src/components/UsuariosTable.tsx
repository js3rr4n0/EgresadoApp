"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toggleUserStatus, eliminarUsuario } from "@/app/actions/usuarios";

type Usuario = {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: string;
  carnet: string | null;
  carrera: string | null;
  facultad: string | null;
  activo: boolean;
};

interface UsuariosTableProps {
  initialUsuarios: Usuario[];
  facultades: { id: number; nombre: string }[];
}

export default function UsuariosTable({ initialUsuarios, facultades }: UsuariosTableProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos los Roles");
  const [statusFilter, setStatusFilter] = useState("Estado");
  const [facultyFilter, setFacultyFilter] = useState("Facultad");

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleToggle = async (user: Usuario) => {
    const actionText = user.activo ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro que deseas ${actionText} a ${user.nombreCompleto}?`)) {
      return;
    }

    setTogglingId(user.id);
    const res = await toggleUserStatus(user.id, !user.activo);
    if (res.success) {
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, activo: !u.activo } : u));
    } else {
      alert("Error al cambiar el estado");
    }
    setTogglingId(null);
  };

  const handleDelete = async (user: Usuario) => {
    if (!confirm(`PELIGRO: ¿Estás totalmente seguro que deseas ELIMINAR a ${user.nombreCompleto}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(user.id);
    const res = await eliminarUsuario(user.id);
    if (res.success) {
      setUsuarios(prev => prev.filter(u => u.id !== user.id));
    } else {
      alert(res.error || "Error al eliminar el usuario");
    }
    setDeletingId(null);
  };

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((user) => {
      const s = search.toLowerCase();
      const matchesSearch = 
        user.nombreCompleto.toLowerCase().includes(s) || 
        user.correo.toLowerCase().includes(s) || 
        (user.carnet && user.carnet.toLowerCase().includes(s));

      const matchesRole = roleFilter === "Todos los Roles" || user.rol.toLowerCase() === roleFilter.toLowerCase();
      
      let matchesStatus = true;
      if (statusFilter === "Activos") matchesStatus = user.activo;
      if (statusFilter === "Inactivos") matchesStatus = !user.activo;

      const matchesFaculty = facultyFilter === "Facultad" || user.facultad === facultyFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesFaculty;
    });
  }, [usuarios, search, roleFilter, statusFilter, facultyFilter]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Buscar por nombre, correo o carnet..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-border bg-muted-bg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red" 
          />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 lg:pb-0">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white min-w-[140px]"
          >
            <option>Todos los Roles</option>
            <option value="admin">admin</option>
            <option value="decanato">decanato</option>
            <option value="asesor">asesor</option>
            <option value="egresado">egresado</option>
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white min-w-[120px]"
          >
            <option>Estado</option>
            <option>Activos</option>
            <option>Inactivos</option>
          </select>
          <select 
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-border text-sm text-foreground focus:outline-none bg-white min-w-[140px]"
          >
            <option>Facultad</option>
            {facultades.map(f => (
              <option key={f.id} value={f.nombre}>{f.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border bg-slate-50">
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
              {filteredUsuarios.map((user) => (
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
                        <span className="block text-muted text-xs whitespace-normal line-clamp-1 min-w-[200px]">{user.carrera}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="block font-bold text-slate-400">Sin Asignar</span>
                        <span className="block text-slate-400 text-xs">N/A</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleToggle(user)}
                      disabled={togglingId === user.id}
                      className={`inline-flex items-center transition-opacity ${togglingId === user.id ? 'opacity-50' : 'hover:opacity-80'}`}
                      title={user.activo ? "Click para Desactivar" : "Click para Activar"}
                    >
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${user.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${user.activo ? 'left-[22px]' : 'left-0.5'}`}></div>
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-muted italic text-xs">No ha accedido</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/usuarios/${user.id}/editar`} className="text-muted hover:text-card-dark transition-colors" title="Editar">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </Link>
                      <button 
                        onClick={() => handleDelete(user)} 
                        disabled={deletingId === user.id}
                        className={`text-muted hover:text-brand-red transition-colors ${deletingId === user.id ? 'opacity-50' : ''}`} 
                        title="Eliminar (No recomendado)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No se encontraron usuarios que coincidan con la búsqueda.
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
