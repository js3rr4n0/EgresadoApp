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
  cohorte: string | null;
  cohortesAsignadas: { cohorte: string; activa: boolean }[] | null;
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
  const [carreraFilter, setCarreraFilter] = useState("Carrera");
  const [cohorteFilter, setCohorteFilter] = useState("Cohorte");

  const availableCarreras = useMemo(() => {
    const carrerasSet = new Set<string>();
    initialUsuarios.forEach((u) => {
      if (u.carrera) carrerasSet.add(u.carrera);
    });
    return Array.from(carrerasSet).sort();
  }, [initialUsuarios]);

  const availableCohortes = useMemo(() => {
    const cohortes = new Set<string>();
    initialUsuarios.forEach((u) => {
      if (u.cohorte) cohortes.add(u.cohorte);
      if (u.cohortesAsignadas) {
        u.cohortesAsignadas.forEach((c) => cohortes.add(c.cohorte));
      }
    });
    return Array.from(cohortes).sort().reverse();
  }, [initialUsuarios]);

  const formatCohorte = (cohorte: string | null) => {
    if (!cohorte) return "";
    const match = cohorte.match(/^C([12])(\d{4})$/);
    if (match) {
      return `C${match[1]}-${match[2]}`;
    }
    return cohorte;
  };

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
      setUsuarios((prev) => prev.map((u) => (u.id === user.id ? { ...u, activo: !u.activo } : u)));
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
      setUsuarios((prev) => prev.filter((u) => u.id !== user.id));
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
      const matchesCarrera = carreraFilter === "Carrera" || user.carrera === carreraFilter;
      const matchesCohorte =
        cohorteFilter === "Cohorte" ||
        user.cohorte === cohorteFilter ||
        (user.cohortesAsignadas && user.cohortesAsignadas.some((c) => c.cohorte === cohorteFilter));

      return matchesSearch && matchesRole && matchesStatus && matchesFaculty && matchesCarrera && matchesCohorte;
    });
  }, [usuarios, search, roleFilter, statusFilter, facultyFilter, carreraFilter, cohorteFilter]);

  return (
    <div className="space-y-4 w-full">
      {/* Filters Bar */}
      <div className="bg-white border border-border rounded-xl p-3 shadow-xs flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, correo o carnet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full border border-border bg-muted-bg text-xs focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cohorteFilter}
            onChange={(e) => setCohorteFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground focus:outline-none bg-white min-w-[100px]"
          >
            <option>Cohorte</option>
            {availableCohortes.map((c) => (
              <option key={c} value={c}>
                {formatCohorte(c)}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground focus:outline-none bg-white min-w-[110px]"
          >
            <option>Todos los Roles</option>
            <option value="admin">admin</option>
            <option value="decanato">decanato</option>
            <option value="asesor">asesor</option>
            <option value="coordinador">coordinador</option>
            <option value="egresado">egresado</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground focus:outline-none bg-white min-w-[90px]"
          >
            <option>Estado</option>
            <option>Activos</option>
            <option>Inactivos</option>
          </select>
          <select
            value={facultyFilter}
            onChange={(e) => {
              setFacultyFilter(e.target.value);
              setCarreraFilter("Carrera");
            }}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground focus:outline-none bg-white min-w-[110px]"
          >
            <option>Facultad</option>
            {facultades.map((f) => (
              <option key={f.id} value={f.nombre}>
                {f.nombre}
              </option>
            ))}
          </select>
          <select
            value={carreraFilter}
            onChange={(e) => setCarreraFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground focus:outline-none bg-white min-w-[110px] max-w-[160px]"
          >
            <option>Carrera</option>
            {availableCarreras.map((c) => (
              <option key={c} value={c} className="truncate">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container - Fits 100% width cleanly */}
      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="border-b border-border bg-slate-50">
              <tr>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider">Nombre Completo</th>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider">Correo</th>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider">Rol</th>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider">Facultad</th>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider">Carrera</th>
                <th className="px-2 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider text-center">Estado</th>
                <th className="px-2 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider text-center">Cohorte</th>
                <th className="px-3 py-3 font-bold text-card-dark text-[11px] uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2.5 max-w-[160px]">
                    <div className="font-bold text-brand-red truncate" title={user.nombreCompleto}>
                      {user.nombreCompleto}
                    </div>
                    {user.carnet && <div className="text-[10px] text-slate-500 font-mono">{user.carnet}</div>}
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <div className="text-slate-700 truncate" title={user.correo}>
                      {user.correo}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider inline-block">
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 max-w-[130px]">
                    {user.facultad ? (
                      <span className="block font-bold text-brand-red truncate text-xs" title={user.facultad}>
                        {user.facultad}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[160px]">
                    {user.carrera ? (
                      <span className="block text-slate-600 truncate text-xs" title={user.carrera}>
                        {user.carrera}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={() => handleToggle(user)}
                      disabled={togglingId === user.id}
                      className={`inline-flex items-center transition-opacity ${togglingId === user.id ? "opacity-50" : "hover:opacity-80"}`}
                      title={user.activo ? "Click para Desactivar" : "Click para Activar"}
                    >
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${user.activo ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${user.activo ? "left-[17px]" : "left-0.5"}`}></div>
                      </div>
                    </button>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {user.cohorte ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 inline-block font-mono">
                        {formatCohorte(user.cohorte)}
                      </span>
                    ) : user.cohortesAsignadas && user.cohortesAsignadas.length > 0 ? (
                      <div className="flex flex-col gap-0.5 items-center">
                        {user.cohortesAsignadas
                          .filter((c) => c.activa)
                          .map((c) => (
                            <span key={c.cohorte} className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 inline-block font-mono">
                              {formatCohorte(c.cohorte)}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/usuarios/${user.id}/editar`}
                        className="p-1 text-slate-400 hover:text-slate-800 transition-colors rounded-md hover:bg-slate-100"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className={`p-1 text-slate-400 hover:text-brand-red transition-colors rounded-md hover:bg-red-50 ${deletingId === user.id ? "opacity-50" : ""}`}
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsuarios.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    No se encontraron usuarios que coincidan con los filtros aplicados.
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
