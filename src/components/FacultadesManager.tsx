"use client";

import { useState } from "react";
import { createFacultad, deleteFacultad, updateFacultad, createCarrera, deleteCarrera, updateCarrera } from "@/app/actions/facultades";

type Facultad = {
  id: number;
  nombre: string;
  codigo: string | null;
  activo: boolean;
};

type Carrera = {
  id: number;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  facultadId: number;
  facultadNombre: string;
};

export default function FacultadesManager({
  initialFacultades,
  initialCarreras
}: {
  initialFacultades: Facultad[];
  initialCarreras: Carrera[];
}) {
  const [facultades, setFacultades] = useState(initialFacultades);
  const [carreras, setCarreras] = useState(initialCarreras);
  const [pending, setPending] = useState(false);
  const [editingFacultadId, setEditingFacultadId] = useState<number | null>(null);

  const handleCreateFacultad = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await createFacultad(formData);
    if (res.success) {
      window.location.reload(); 
    } else {
      alert(res.error);
    }
    setPending(false);
  };

  const handleEditFacultad = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateFacultad(id, formData);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
      setPending(false);
    }
  };

  const handleDeleteFacultad = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la facultad ${nombre}?`)) return;
    setPending(true);
    const res = await deleteFacultad(id);
    if (res.success) {
      setFacultades(prev => prev.filter(f => f.id !== id));
    } else {
      alert(res.error);
    }
    setPending(false);
  };

  const handleCreateCarrera = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await createCarrera(formData);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setPending(false);
  };

  const [editingCarreraId, setEditingCarreraId] = useState<number | null>(null);

  const handleEditCarrera = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateCarrera(id, formData);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
      setPending(false);
    }
  };

  const handleDeleteCarrera = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la carrera ${nombre}?`)) return;
    setPending(true);
    const res = await deleteCarrera(id);
    if (res.success) {
      setCarreras(prev => prev.filter(c => c.id !== id));
    } else {
      alert(res.error);
    }
    setPending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Facultades Card */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-brand-red flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h2 className="text-lg font-bold text-card-dark">Facultades</h2>
        </div>

        <form onSubmit={handleCreateFacultad} className="bg-muted-bg p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-card-dark uppercase tracking-widest mb-1.5">Nombre de Facultad</label>
            <input name="nombre" type="text" required placeholder="Ej: Ingeniería" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none" />
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-bold text-card-dark uppercase tracking-widest mb-1.5">Código</label>
            <input name="codigo" type="text" placeholder="FING" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-brand-red/20 outline-none uppercase" />
          </div>
          <div className="flex items-end">
            <button disabled={pending} type="submit" className="w-10 h-10 rounded-lg bg-card-dark text-white flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest">Código</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest">Nombre</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest text-center">Estado</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {facultades.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  {editingFacultadId === f.id ? (
                    <td colSpan={4} className="py-2">
                      <form onSubmit={(e) => handleEditFacultad(e, f.id)} className="flex items-center gap-2">
                        <input name="codigo" defaultValue={f.codigo || ""} className="w-20 px-2 py-1 border border-border rounded text-sm uppercase outline-none focus:ring-2 focus:ring-brand-red/20" />
                        <input name="nombre" required defaultValue={f.nombre} className="flex-1 px-2 py-1 border border-border rounded text-sm outline-none focus:ring-2 focus:ring-brand-red/20" />
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="activo" defaultChecked={f.activo} className="rounded" /> Activo
                        </label>
                        <button type="submit" disabled={pending} className="p-1.5 text-white bg-emerald-500 rounded hover:bg-emerald-600 disabled:opacity-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                        <button type="button" onClick={() => setEditingFacultadId(null)} className="p-1.5 text-white bg-slate-400 rounded hover:bg-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="py-3 font-bold text-card-dark">{f.codigo || "-"}</td>
                      <td className="py-3 text-muted">{f.nombre}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${f.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {f.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingFacultadId(f.id)} className="text-slate-300 hover:text-slate-500" title="Editar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDeleteFacultad(f.id, f.nombre)} disabled={pending} className="text-slate-300 hover:text-brand-red"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Carreras Card */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h2 className="text-lg font-bold text-card-dark">Carreras</h2>
        </div>

        <form onSubmit={handleCreateCarrera} className="bg-muted-bg p-4 rounded-xl border border-border flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-card-dark uppercase tracking-widest mb-1.5">Nombre de Carrera</label>
              <input name="nombre" type="text" required placeholder="Ej: Ing. Sistemas" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-bold text-card-dark uppercase tracking-widest mb-1.5">Código</label>
              <input name="codigo" type="text" placeholder="IINF" className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-blue-600/20 outline-none uppercase" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-card-dark uppercase tracking-widest mb-1.5">Pertenece a la Facultad</label>
              <select name="facultadId" required className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-blue-600/20 outline-none bg-white">
                <option value="">Seleccione...</option>
                {facultades.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
            <button disabled={pending} type="submit" className="w-full sm:w-auto px-4 h-10 rounded-lg bg-card-dark text-white flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors font-bold text-sm disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Agregar
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest">Código</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest">Carrera y Facultad</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest text-center">Estado</th>
                <th className="pb-3 font-bold text-[10px] text-card-dark uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {carreras.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  {editingCarreraId === c.id ? (
                    <td colSpan={4} className="py-2">
                      <form onSubmit={(e) => handleEditCarrera(e, c.id)} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input name="codigo" defaultValue={c.codigo || ""} className="w-20 px-2 py-1 border border-border rounded text-sm uppercase outline-none focus:ring-2 focus:ring-blue-600/20" />
                          <input name="nombre" required defaultValue={c.nombre} className="flex-1 px-2 py-1 border border-border rounded text-sm outline-none focus:ring-2 focus:ring-blue-600/20" />
                          <select name="facultadId" defaultValue={c.facultadId} required className="w-32 px-2 py-1 border border-border rounded text-sm outline-none focus:ring-2 focus:ring-blue-600/20 bg-white">
                            {facultades.map(f => (
                              <option key={f.id} value={f.id}>{f.codigo || f.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="activo" defaultChecked={c.activo} className="rounded" /> Activo
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={pending} className="p-1.5 text-white bg-emerald-500 rounded hover:bg-emerald-600 disabled:opacity-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                            <button type="button" onClick={() => setEditingCarreraId(null)} className="p-1.5 text-white bg-slate-400 rounded hover:bg-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="py-3 font-bold text-card-dark">{c.codigo || "-"}</td>
                      <td className="py-3">
                        <div className="text-muted text-sm">{c.nombre}</div>
                        <div className="text-[10px] text-brand-red font-bold mt-0.5">{c.facultadNombre}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${c.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCarreraId(c.id)} className="text-slate-300 hover:text-slate-500" title="Editar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDeleteCarrera(c.id, c.nombre)} disabled={pending} className="text-slate-300 hover:text-brand-red"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
