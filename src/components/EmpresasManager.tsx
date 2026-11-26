"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import DialogoEstadoEmpresa, { type ReporteParaDialogo } from "@/components/admin/DialogoEstadoEmpresa";
import { createEmpresa, updateEmpresa, deleteEmpresa, updateSucursalesSolo, EmpresaData, SupervisorData, FirmanteData, SucursalData } from "@/app/actions/empresas";
import Nota from "@/components/valoraciones/Nota";
import { estadisticasVacias, type EstadisticasEmpresa, type Modalidad } from "@/lib/estadisticasEmpresas";

const MapSelector = dynamic(() => import("./MapSelector"), { ssr: false });

type Orden = "nombre" | "procesos" | "reciente" | "cohortes" | "menor_valoracion" | "mayor_valoracion";
const POR_PAGINA = 15;
const claseSelect = "w-full px-3 py-2 rounded-lg border border-border focus:border-brand-red outline-none bg-white text-sm";
const claseIcono = "p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formDesde = (emp: any): EmpresaData => ({
  nombre: emp.nombre || "",
  area: emp.area || "",
  descripcion: emp.descripcion || "",
  antecedentes: emp.antecedentes || "",
  direccion: emp.direccion || "",
  organigramaUrl: emp.organigramaUrl || "",
  mapaUrl: emp.mapaUrl || "",
  supervisores: emp.supervisores || [],
  firmantes: emp.firmantes || [],
  organigramas: emp.organigramas || [],
  sucursales: emp.sucursales || [],
});

export interface NotasEmpresa {
  egresados: number | null;
  asesores: number | null;
  general: number | null;
}

export default function EmpresasManager({
  initialEmpresas,
  estadisticas = {},
  reportes = {},
  notas = {},
  editarId = null,
}: {
  initialEmpresas: any[];
  estadisticas?: Record<number, EstadisticasEmpresa>;
  /** Reportes vigentes en contra, por empresa (entrega V2). */
  reportes?: Record<number, ReporteParaDialogo[]>;
  /** Valoraciones promedio por empresa (entrega V3). */
  notas?: Record<number, NotasEmpresa>;
  editarId?: number | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterSucursales, setFilterSucursales] = useState("todas");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterModalidad, setFilterModalidad] = useState("");
  const [filterCohorte, setFilterCohorte] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [pagina, setPagina] = useState(1);

  const estadisticaDe = (id: number) => estadisticas[id] ?? estadisticasVacias();
  const [empresaEstado, setEmpresaEstado] = useState<{ id: number; nombre: string; habilitada: boolean } | null>(null);

  const areas = useMemo(
    () => Array.from(new Set(initialEmpresas.map(e => e.area).filter(Boolean))).sort() as string[],
    [initialEmpresas],
  );
  const cohortesDisponibles = useMemo(() => {
    const nombres = new Set<string>();
    Object.values(estadisticas).forEach(e => e.cohortes.forEach(c => nombres.add(c.nombre)));
    return [...nombres].sort().reverse();
  }, [estadisticas]);

  const filtradas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const lista = initialEmpresas.filter(emp => {
      const est = estadisticas[emp.id] ?? estadisticasVacias();
      if (filterArea && emp.area !== filterArea) return false;
      if (filterEstado === "activa" && !emp.habilitada) return false;
      if (filterEstado === "deshabilitada" && emp.habilitada) return false;
      if (filterEstado === "reportes" && !(reportes[emp.id]?.length)) return false;
      if (filterSucursales === "con" && (!emp.sucursales || emp.sucursales.length === 0)) return false;
      if (filterSucursales === "sin" && emp.sucursales && emp.sucursales.length > 0) return false;
      if (filterModalidad === "ninguna" && est.procesos > 0) return false;
      if (filterModalidad && filterModalidad !== "ninguna" && est.porModalidad[filterModalidad as Modalidad] === 0) return false;
      if (filterCohorte === "en_curso" && est.cohortesEnCurso === 0) return false;
      if (filterCohorte && filterCohorte !== "en_curso" && !est.cohortes.some(c => c.nombre === filterCohorte)) return false;
      if (q) {
        const coincide =
          emp.nombre.toLowerCase().includes(q) ||
          emp.sucursales?.some((s: any) => s.nombre.toLowerCase().includes(q)) ||
          est.asesores.some(a => a.nombre.toLowerCase().includes(q));
        if (!coincide) return false;
      }
      return true;
    });
    const est = (id: number) => estadisticas[id] ?? estadisticasVacias();
    const porNombre = (a: any, b: any) => a.nombre.localeCompare(b.nombre, "es");
    return lista.sort((a, b) => {
      if (orden === "procesos") return est(b.id).procesos - est(a.id).procesos || porNombre(a, b);
      if (orden === "menor_valoracion" || orden === "mayor_valoracion") {
        // Las empresas sin valoración van al final en ambos órdenes
        const na = notas[a.id]?.general ?? null, nb = notas[b.id]?.general ?? null;
        if (na == null || nb == null) return (na == null ? 1 : 0) - (nb == null ? 1 : 0) || porNombre(a, b);
        return (orden === "menor_valoracion" ? na - nb : nb - na) || porNombre(a, b);
      }
      if (orden === "cohortes") return est(b.id).cohortes.length - est(a.id).cohortes.length || porNombre(a, b);
      if (orden === "reciente") {
        const ia = est(a.id).cohortes.length, ib = est(b.id).cohortes.length;
        if (!ia || !ib) return ib - ia || porNombre(a, b);
        return est(b.id).ultimaCohorte!.inicio.localeCompare(est(a.id).ultimaCohorte!.inicio) || porNombre(a, b);
      }
      return porNombre(a, b);
    });
  }, [initialEmpresas, estadisticas, reportes, notas, searchTerm, filterArea, filterEstado, filterSucursales, filterModalidad, filterCohorte, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const [sucursalesModalOpen, setSucursalesModalOpen] = useState(false);
  const [currentEmpresaForSucs, setCurrentEmpresaForSucs] = useState<any>(null);
  const [tempSucs, setTempSucs] = useState<SucursalData[]>([]);
  const [isSavingSucs, setIsSavingSucs] = useState(false);

  const getEmptyForm = (): EmpresaData => ({
    nombre: "",
    area: "",
    descripcion: "",
    antecedentes: "",
    direccion: "",
    organigramaUrl: "",
    mapaUrl: "",
    supervisores: [],
    firmantes: [],
    organigramas: [],
    sucursales: [],
  });

  const [formData, setFormData] = useState<EmpresaData>(getEmptyForm());
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingId(null);
    setError(null);
    setIsModalOpen(false);
    if (window.location.search.includes("editar=")) window.history.replaceState(null, "", "/admin/empresas");
  };

  const handleEdit = (emp: any) => {
    setFormData(formDesde(emp));
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  // «Editar datos» desde la página de detalle llega como /admin/empresas?editar=ID. El formulario se abre después de
  // cargar la página: si se abre en el primer render, el mapa (Leaflet) falla al montarse.
  useEffect(() => {
    const emp = editarId ? initialEmpresas.find(e => e.id === editarId) : null;
    if (!emp) return;
    const t = setTimeout(() => handleEdit(emp), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Validations
    if (formData.supervisores.length === 0) {
      setError("Debes agregar al menos un supervisor para la empresa.");
      setIsSaving(false);
      return;
    }

    for (let i = 0; i < formData.supervisores.length; i++) {
      const sup = formData.supervisores[i];
      if (!sup.nombres || !sup.nombres.trim() || !sup.apellidos || !sup.apellidos.trim()) {
        setError(`El supervisor #${i + 1} debe incluir Nombres y Apellidos válidos (no se permiten campos vacíos).`);
        setIsSaving(false);
        return;
      }
    }

    let res;
    if (editingId) {
      res = await updateEmpresa(editingId, formData);
    } else {
      res = await createEmpresa(formData);
    }

    setIsSaving(false);
    if (res.success) {
      resetForm();
    } else {
      setError(res.error || "Ocurrió un error al guardar la empresa.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta empresa? Esto eliminará también a sus supervisores. Esta acción no se puede deshacer.")) {
      const res = await deleteEmpresa(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  // Habilitar o deshabilitar abre el diálogo que pide el motivo (entrega V2)
  const handleToggle = (emp: any) => setEmpresaEstado({ id: emp.id, nombre: emp.nombre, habilitada: emp.habilitada });

  const handleChange = (field: keyof EmpresaData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo es muy pesado. El límite es 10MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        organigramas: [{ url: event.target?.result as string }, ...prev.organigramas]
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeOrganigrama = (index: number) => {
    setFormData(prev => {
      const orgs = [...prev.organigramas];
      orgs.splice(index, 1);
      return { ...prev, organigramas: orgs };
    });
  };

  const handleOpenOrganigrama = (base64Data: string) => {
    if (!base64Data.startsWith('data:')) {
      window.open(base64Data, '_blank');
      return;
    }

    try {
      const arr = base64Data.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], {type: mime});
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert("Error al abrir el archivo.");
    }
  };

  // Supervisor Form Handlers
  const addSupervisor = () => {
    setFormData(prev => ({
      ...prev,
      supervisores: [
        ...prev.supervisores,
        { titulo: "", nombres: "", apellidos: "", cargo: "", especialidad: "", telefono: "", correo: "", sucursalId: null }
      ]
    }));
  };

  const updateSupervisor = (index: number, field: keyof SupervisorData, value: string) => {
    setFormData(prev => {
      const sups = [...prev.supervisores];
      sups[index] = { ...sups[index], [field]: value };
      return { ...prev, supervisores: sups };
    });
  };

  const removeSupervisor = (index: number) => {
    setFormData(prev => {
      const sups = [...prev.supervisores];
      sups.splice(index, 1);
      return { ...prev, supervisores: sups };
    });
  };

  // Firmantes Form Handlers
  const addFirmante = () => {
    setFormData(prev => ({
      ...prev,
      firmantes: [
        ...prev.firmantes,
        { titulo: "", nombres: "", apellidos: "", cargo: "", telefono: "", correo: "", firmaUrl: "", sucursalId: null }
      ]
    }));
  };

  const updateFirmante = (index: number, field: keyof FirmanteData, value: string) => {
    setFormData(prev => {
      const firms = [...prev.firmantes];
      firms[index] = { ...firms[index], [field]: value };
      return { ...prev, firmantes: firms };
    });
  };

  const removeFirmante = (index: number) => {
    setFormData(prev => {
      const firms = [...prev.firmantes];
      firms.splice(index, 1);
      return { ...prev, firmantes: firms };
    });
  };

  // Sucursales Form Handlers (Standalone Modal)
  const openSucursalesModal = (emp: any) => {
    setCurrentEmpresaForSucs(emp);
    setTempSucs(emp.sucursales || []);
    setSucursalesModalOpen(true);
  };

  const addTempSucursal = () => {
    setTempSucs(prev => [...prev, { nombre: "", direccion: "", telefono: "", mapaUrl: "", descripcion: "", antecedentes: "" }]);
  };

  const updateTempSucursal = (index: number, field: keyof SucursalData, value: string) => {
    setTempSucs(prev => {
      const sucs = [...prev];
      sucs[index] = { ...sucs[index], [field]: value };
      return sucs;
    });
  };

  const removeTempSucursal = (index: number) => {
    setTempSucs(prev => {
      const sucs = [...prev];
      sucs.splice(index, 1);
      return sucs;
    });
  };

  const handleSaveSucursales = async () => {
    if (!currentEmpresaForSucs) return;
    setIsSavingSucs(true);
    const res = await updateSucursalesSolo(currentEmpresaForSucs.id, tempSucs);
    setIsSavingSucs(false);
    if (res.success) {
      setSucursalesModalOpen(false);
      setCurrentEmpresaForSucs(null);
    } else {
      alert(res.error || "Ocurrió un error al guardar las sucursales.");
    }
  };

  const handleFirmaUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("La firma es muy pesada. El límite es 1MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateFirmante(index, "firmaUrl", event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Catálogo de Empresas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las instituciones o empresas donde los egresados pueden realizar su Trabajo de Grado.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-brand-red hover:bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Empresa
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-border mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <div className="relative w-full lg:w-96">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Buscar por nombre, sucursal o asesor..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPagina(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all text-sm"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 w-full">
            <select value={filterArea} onChange={(e) => { setFilterArea(e.target.value); setPagina(1); }} className={claseSelect}>
              <option value="">Todas las áreas</option>
              {areas.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
            <select value={filterEstado} onChange={(e) => { setFilterEstado(e.target.value); setPagina(1); }} className={claseSelect}>
              <option value="">Activas y deshabilitadas</option>
              <option value="activa">Solo activas</option>
              <option value="deshabilitada">Solo deshabilitadas</option>
              <option value="reportes">Con reportes vigentes</option>
            </select>
            <select value={filterModalidad} onChange={(e) => { setFilterModalidad(e.target.value); setPagina(1); }} className={claseSelect}>
              <option value="">Todas las modalidades</option>
              <option value="pasantia">Con pasantías</option>
              <option value="proyecto">Con proyectos</option>
              <option value="investigacion">Con investigaciones</option>
              <option value="ninguna">Sin procesos</option>
            </select>
            <select value={filterCohorte} onChange={(e) => { setFilterCohorte(e.target.value); setPagina(1); }} className={claseSelect}>
              <option value="">Todas las cohortes</option>
              <option value="en_curso">Con cohorte en curso</option>
              {cohortesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSucursales} onChange={(e) => { setFilterSucursales(e.target.value); setPagina(1); }} className={claseSelect}>
              <option value="todas">Con y sin sucursales</option>
              <option value="con">Con sucursales</option>
              <option value="sin">Sin sucursales</option>
            </select>
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={claseSelect}>
              <option value="nombre">Ordenar por nombre</option>
              <option value="procesos">Más procesos</option>
              <option value="reciente">Participación más reciente</option>
              <option value="cohortes">Más cohortes</option>
              <option value="menor_valoracion">Menor valoración</option>
              <option value="mayor_valoracion">Mayor valoración</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted">
          {filtradas.length === initialEmpresas.length
            ? `${initialEmpresas.length} empresas registradas`
            : `${filtradas.length} de ${initialEmpresas.length} empresas con los filtros aplicados`}
          {" · "}Los procesos cuentan las propuestas aprobadas en adelante, de cualquier modalidad.
        </p>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 min-w-[200px]">Empresa</th>
                <th className="px-2.5 py-3 text-left">Valoración</th>
                <th className="px-2.5 py-3 text-center">Procesos</th>
                <th className="px-2.5 py-3 text-center">Cohortes</th>
                <th className="px-2.5 py-3 text-left">Última cohorte</th>
                <th className="px-2.5 py-3 text-center">Asesores</th>
                <th className="px-2.5 py-3 text-left min-w-[150px]">Último asesor</th>
                <th className="px-2.5 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">No se encontraron empresas con los filtros aplicados.</td>
                </tr>
              )}
              {visibles.map((emp) => {
                const est = estadisticaDe(emp.id);
                return (
                  <tr key={emp.id} className={`hover:bg-gray-50/70 transition-colors ${emp.habilitada ? "" : "bg-gray-50/60 text-gray-500"}`}>
                    <td className="px-4 py-3">
                      <a href={`/admin/empresas/${emp.id}`} className="font-bold text-gray-800 hover:text-brand-red transition-colors">{emp.nombre}</a>
                      <p className="text-xs text-muted mt-0.5">
                        {emp.area || "Sin área especificada"}
                        {emp.sucursales?.length > 0 && ` · ${emp.sucursales.length} ${emp.sucursales.length === 1 ? "sucursal" : "sucursales"}`}
                      </p>
                    </td>
                    <td className="px-2.5 py-3">
                      <p className="text-[11px] whitespace-nowrap"><span className="text-gray-600">Egresados:</span> <Nota valor={notas[emp.id]?.egresados ?? null} /></p>
                      <p className="text-[11px] whitespace-nowrap mt-1"><span className="text-gray-600">Asesores:</span> <Nota valor={notas[emp.id]?.asesores ?? null} /></p>
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      <span className="font-bold text-gray-800">{est.procesos}</span>
                      {est.procesos > 0 && <p className="text-[11px] text-muted">{est.egresados} {est.egresados === 1 ? "egresado" : "egresados"}</p>}
                    </td>
                    <td className="px-2.5 py-3 text-center font-bold text-gray-800">{est.cohortes.length}</td>
                    <td className="px-2.5 py-3">
                      {est.ultimaCohorte ? (
                        <>
                          <span className="font-semibold text-gray-800 whitespace-nowrap">{est.ultimaCohorte.nombre}</span>
                          {est.cohortesEnCurso > 0 ? (
                            <p className="text-[11px] font-semibold text-brand-red">{est.cohortesEnCurso === 1 ? "1 cohorte en curso" : `${est.cohortesEnCurso} cohortes en curso`}</p>
                          ) : (
                            <p className="text-[11px] text-muted">{est.ultimaCohorte.nombreFase}</p>
                          )}
                        </>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-2.5 py-3 text-center font-bold text-gray-800">{est.asesores.length}</td>
                    <td className="px-2.5 py-3">
                      {est.ultimoAsesor ? (
                        <>
                          <span className="font-semibold text-gray-800">{est.ultimoAsesor.nombre}</span>
                          <p className="text-[11px] text-muted">{est.ultimoAsesor.cohorte}</p>
                        </>
                      ) : <span className="text-muted">Sin asesor</span>}
                    </td>
                    <td className="px-2.5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap ${emp.habilitada ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                        {emp.habilitada ? "Activa" : "Deshabilitada"}
                      </span>
                      {(reportes[emp.id]?.length ?? 0) > 0 && (
                        <a
                          href={`/admin/empresas/${emp.id}?vista=reportes`}
                          className="block mt-1.5 text-[11px] font-bold text-brand-red whitespace-nowrap hover:underline"
                          title="Reportes vigentes en contra de la empresa"
                        >
                          {reportes[emp.id].length === 1 ? "1 reporte" : `${reportes[emp.id].length} reportes`}
                        </a>
                      )}
                      <button
                        onClick={() => handleToggle(emp)}
                        className={`block mx-auto mt-1.5 text-[11px] font-bold underline-offset-2 hover:underline ${emp.habilitada ? "text-gray-500 hover:text-brand-red" : "text-green-700"}`}
                      >
                        {emp.habilitada ? "Deshabilitar" : "Habilitar"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/empresas/${emp.id}`} className="block text-center px-2.5 py-1.5 mb-1 text-xs font-bold text-brand-red bg-brand-red/5 hover:bg-brand-red hover:text-white rounded-lg transition-colors whitespace-nowrap">
                        Ver más
                      </a>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(emp)} title="Editar datos" className={claseIcono}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => openSucursalesModal(emp)} title="Sucursales" className={claseIcono}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </button>
                        <a href={`/admin/empresas/${emp.id}/imprimir`} target="_blank" rel="noreferrer" title="Descargar PDF" className={claseIcono}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </a>
                        <button onClick={() => handleDelete(emp.id)} title="Eliminar" className={claseIcono}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-gray-50 text-sm">
            <span className="text-muted">Página {paginaActual} de {totalPaginas}</span>
            <div className="flex gap-2">
              <button disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} className="px-3 py-1.5 rounded-lg border border-border bg-white font-semibold text-gray-700 disabled:opacity-40 hover:border-brand-red">Anterior</button>
              <button disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} className="px-3 py-1.5 rounded-lg border border-border bg-white font-semibold text-gray-700 disabled:opacity-40 hover:border-brand-red">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-xl text-gray-800">
                {editingId ? "Editar Empresa / Institución" : "Registrar Nueva Empresa"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Empresa Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-brand-red border-b pb-2">1. Datos de la Institución</h4>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Empresa</label>
                      <input type="text" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.nombre} onChange={(e) => handleChange("nombre", e.target.value)} />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Área o Sector</label>
                      <input type="text" placeholder="Ej. Tecnología, Manufactura, ONG..." className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.area} onChange={(e) => handleChange("area", e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                      <textarea rows={3} className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.descripcion} onChange={(e) => handleChange("descripcion", e.target.value)}></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Antecedentes</label>
                      <textarea rows={2} className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.antecedentes} onChange={(e) => handleChange("antecedentes", e.target.value)}></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Física (Texto)</label>
                      <input type="text" placeholder="Dirección completa..." className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm" value={formData.direccion} onChange={(e) => handleChange("direccion", e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Ubicación GPS (Mapa)</label>
                      <MapSelector value={formData.mapaUrl || ""} onChange={(val) => handleChange("mapaUrl", val)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                        <span>Organigrama de la Empresa (Imagen o PDF)</span>
                        {formData.organigramas.length > 0 && <span className="text-emerald-600 text-xs flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {formData.organigramas.length} en historial</span>}
                      </label>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-brand-red text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-brand-red hover:file:bg-red-100" 
                        onChange={handleFileUpload} 
                      />
                      <p className="text-xs text-gray-500 mt-1 mb-2">Límite: 10MB. Sube uno nuevo para agregarlo al historial.</p>
                      
                      {/* Historial de Organigramas */}
                      {formData.organigramas.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Historial (Más reciente primero):</p>
                          {formData.organigramas.map((org, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${index === 0 ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                                <span className="truncate text-gray-600">
                                  {org.subidoEn ? new Date(org.subidoEn).toLocaleDateString() : "Recién Subido"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleOpenOrganigrama(org.url)} className="text-blue-600 hover:underline text-xs">Ver</button>
                                {!org.id && (
                                  <button type="button" onClick={() => removeOrganigrama(index)} className="text-red-500 hover:text-red-700">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supervisores y Firmantes Column */}
                  <div className="space-y-8 flex flex-col">
                    {/* Supervisores */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-bold text-brand-red">2. Supervisores / Contactos</h4>
                        <button type="button" onClick={addSupervisor} className="text-xs bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                          + Agregar Supervisor
                        </button>
                      </div>

                      <div className="space-y-4">
                        {formData.supervisores.length === 0 ? (
                          <div className="text-center p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                            Debes agregar al menos un supervisor como contacto para la empresa.
                          </div>
                        ) : (
                          formData.supervisores.map((sup, index) => (
                            <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                              <button type="button" onClick={() => removeSupervisor(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm" title="Eliminar Supervisor">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
                                  <input type="text" placeholder="Ej. Ing..." className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.titulo || ""} onChange={(e) => updateSupervisor(index, "titulo", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Nombres *</label>
                                  <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.nombres} onChange={(e) => updateSupervisor(index, "nombres", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Apellidos *</label>
                                  <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.apellidos} onChange={(e) => updateSupervisor(index, "apellidos", e.target.value)} />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Cargo</label>
                                  <input type="text" placeholder="Ej. Jefe de IT..." className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.cargo} onChange={(e) => updateSupervisor(index, "cargo", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Especialidad</label>
                                  <input type="text" placeholder="Ej. Redes..." className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.especialidad} onChange={(e) => updateSupervisor(index, "especialidad", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Sucursal (Opcional)</label>
                                  <select 
                                    className="w-full border-gray-300 border p-2 rounded text-sm bg-white" 
                                    value={sup.sucursalId || ""} 
                                    onChange={(e) => updateSupervisor(index, "sucursalId", e.target.value ? Number(e.target.value) : null as any)}
                                  >
                                    <option value="">Sede Central</option>
                                    {formData.sucursales.filter(s => s.id).map(s => (
                                      <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                                  <input type="tel" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.telefono} onChange={(e) => updateSupervisor(index, "telefono", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Correo Electrónico</label>
                                  <input type="email" className="w-full border-gray-300 border p-2 rounded text-sm" value={sup.correo} onChange={(e) => updateSupervisor(index, "correo", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Firmantes */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-bold text-brand-red">3. Firmantes y Firmas</h4>
                        <button type="button" onClick={addFirmante} className="text-xs bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                          + Agregar Firmante
                        </button>
                      </div>

                      <div className="space-y-4">
                        {formData.firmantes.length === 0 ? (
                          <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
                            Puedes agregar firmantes legales y sus firmas escaneadas aquí.
                          </div>
                        ) : (
                          formData.firmantes.map((firm, index) => (
                            <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                              <button type="button" onClick={() => removeFirmante(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm" title="Eliminar Firmante">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Título</label>
                                  <input type="text" placeholder="Ej. Lic..." className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.titulo || ""} onChange={(e) => updateFirmante(index, "titulo", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Nombres *</label>
                                  <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.nombres} onChange={(e) => updateFirmante(index, "nombres", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Apellidos *</label>
                                  <input type="text" required className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.apellidos} onChange={(e) => updateFirmante(index, "apellidos", e.target.value)} />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Cargo *</label>
                                  <input type="text" required placeholder="Gerente General, HR..." className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.cargo || ""} onChange={(e) => updateFirmante(index, "cargo", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Sucursal (Opcional)</label>
                                  <select 
                                    className="w-full border-gray-300 border p-2 rounded text-sm bg-white" 
                                    value={firm.sucursalId || ""} 
                                    onChange={(e) => updateFirmante(index, "sucursalId", e.target.value ? Number(e.target.value) : null as any)}
                                  >
                                    <option value="">Sede Central</option>
                                    {formData.sucursales.filter(s => s.id).map(s => (
                                      <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                                  <input type="tel" className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.telefono || ""} onChange={(e) => updateFirmante(index, "telefono", e.target.value)} />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1">Correo Electrónico</label>
                                  <input type="email" className="w-full border-gray-300 border p-2 rounded text-sm" value={firm.correo || ""} onChange={(e) => updateFirmante(index, "correo", e.target.value)} />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-600 mb-1 flex justify-between">
                                    <span>Firma Escaneada (Imagen)</span>
                                    {firm.firmaUrl && <span className="text-emerald-600 text-[10px] flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Subida</span>}
                                  </label>
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="w-full border-gray-300 border p-1 rounded text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" 
                                    onChange={(e) => handleFirmaUpload(index, e)} 
                                  />
                                  {firm.firmaUrl && (
                                    <div className="mt-1 bg-white border border-gray-200 rounded p-1.5 flex justify-center">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={firm.firmaUrl} alt="Firma" className="max-h-10 object-contain" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || formData.supervisores.length === 0}
                  className="bg-brand-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {empresaEstado && (
        <DialogoEstadoEmpresa
          empresa={empresaEstado}
          reportes={reportes[empresaEstado.id] ?? []}
          notas={notas[empresaEstado.id] ?? null}
          onCerrar={() => setEmpresaEstado(null)}
        />
      )}

      {/* Sucursales Modal */}
      {sucursalesModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden my-8 relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-xl text-gray-800">
                Sucursales de {currentEmpresaForSucs?.nombre}
              </h3>
              <button onClick={() => setSucursalesModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h4 className="font-bold text-brand-red">Lista de Sucursales</h4>
                <button type="button" onClick={addTempSucursal} className="text-xs bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                  + Agregar Sucursal
                </button>
              </div>

              <div className="space-y-4 pr-2">
                {tempSucs.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
                    Esta empresa no tiene sucursales registradas.
                  </div>
                ) : (
                  tempSucs.map((suc, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                      <button type="button" onClick={() => removeTempSucursal(index)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre de Sucursal *</label>
                            <input type="text" required placeholder="Ej. Impresa Repuestos - Metapán" className="w-full border-gray-300 border p-2 rounded text-sm" value={suc.nombre} onChange={(e) => updateTempSucursal(index, "nombre", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Dirección</label>
                            <input type="text" className="w-full border-gray-300 border p-2 rounded text-sm" value={suc.direccion || ""} onChange={(e) => updateTempSucursal(index, "direccion", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                            <input type="tel" className="w-full border-gray-300 border p-2 rounded text-sm" value={suc.telefono || ""} onChange={(e) => updateTempSucursal(index, "telefono", e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Descripción</label>
                            <textarea rows={3} className="w-full border-gray-300 border p-2 rounded text-sm resize-y" value={suc.descripcion || ""} onChange={(e) => updateTempSucursal(index, "descripcion", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Antecedentes</label>
                            <textarea rows={3} className="w-full border-gray-300 border p-2 rounded text-sm resize-y" value={suc.antecedentes || ""} onChange={(e) => updateTempSucursal(index, "antecedentes", e.target.value)} />
                          </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-xs font-bold text-gray-600 mb-1">Ubicación GPS</label>
                          <div className="h-[200px]">
                            <MapSelector value={suc.mapaUrl || ""} onChange={(val) => updateTempSucursal(index, "mapaUrl", val)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50">
              <button
                type="button"
                onClick={() => setSucursalesModalOpen(false)}
                disabled={isSavingSucs}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSucursales}
                disabled={isSavingSucs}
                className="bg-brand-red hover:bg-red-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingSucs ? "Guardando..." : "Guardar Sucursales"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
