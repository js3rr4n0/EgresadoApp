"use client";

import { useState } from "react";

import { aprobarSolicitudEmpresa, rechazarSolicitudEmpresa } from "@/app/actions/solicitudes";

export default function SolicitudesTable({ solicitudes, allEmpresas = [], allSucursales = [], allSupervisores = [] }: { solicitudes: any[], allEmpresas?: any[], allSucursales?: any[], allSupervisores?: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewDetails, setViewDetails] = useState<any | null>(null);

  const handleApprove = async (id: number) => {
    if (!confirm("¿Estás seguro de aprobar esta solicitud? La empresa se guardará en la base de datos y la propuesta del egresado será desbloqueada.")) return;
    
    setLoadingId(id);
    const res = await aprobarSolicitudEmpresa(id);
    setLoadingId(null);
    if (res.success) {
      alert("Solicitud aprobada correctamente.");
      window.location.reload();
    } else {
      alert("Error: " + res.error);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason) return alert("Debes ingresar un motivo.");
    
    setLoadingId(id);
    const res = await rechazarSolicitudEmpresa(id, rejectReason);
    setLoadingId(null);
    if (res.success) {
      alert("Solicitud rechazada.");
      setRejectingId(null);
      setRejectReason("");
      window.location.reload();
    } else {
      alert("Error: " + res.error);
    }
  };

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-6 py-4">Fecha</th>
            <th className="px-6 py-4">Tipo</th>
            <th className="px-6 py-4">Egresado</th>
            <th className="px-6 py-4">Empresa (Datos Nuevos)</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {solicitudes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center text-muted">
                No hay solicitudes pendientes.
              </td>
            </tr>
          )}
          {solicitudes.map((s) => {
            const data = s.datos as any;
            return (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  {s.creadaEn ? new Date(s.creadaEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : "-"}
                </td>
                <td className="px-6 py-4">
                  {s.tipo === "nueva" ? (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Nueva Empresa</span>
                  ) : (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Actualización</span>
                  )}
                </td>
                <td className="px-6 py-4">{s.egresado || "Desconocido"}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-foreground">
                    {data.empresa.nombre}
                  </div>
                  {s.tipo === "actualizacion" && s.empresaTarget && (
                    <div className="text-xs text-muted">
                      Objetivo: {s.empresaTarget}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {s.estado === "pendiente" && <span className="text-amber-600 font-bold">Pendiente</span>}
                  {s.estado === "aprobada" && <span className="text-emerald-600 font-bold">Aprobada</span>}
                  {s.estado === "rechazada" && <span className="text-red-600 font-bold">Rechazada</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setViewDetails(s)}
                    className="mr-2 text-blue-600 hover:text-blue-800 font-bold text-xs"
                  >
                    Ver Detalles
                  </button>
                  {s.estado === "pendiente" && (
                    <>
                      <button
                        onClick={() => handleApprove(s.id)}
                        disabled={loadingId === s.id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 mr-2"
                      >
                        {loadingId === s.id ? "..." : "Aprobar"}
                      </button>
                      <button
                        onClick={() => setRejectingId(s.id)}
                        disabled={loadingId === s.id}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Reject Modal */}
    {rejectingId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
          <h3 className="text-xl font-bold text-card-dark mb-4">Rechazar Solicitud</h3>
          <p className="text-sm text-muted mb-4">Ingresa el motivo del rechazo para que el egresado pueda corregirlo.</p>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg mb-4 resize-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectingId(null)} className="px-4 py-2 border border-border rounded-lg font-bold text-sm">Cancelar</button>
            <button onClick={() => handleReject(rejectingId)} disabled={loadingId === rejectingId} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm">
              {loadingId === rejectingId ? "Procesando..." : "Confirmar Rechazo"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* View Details Modal */}
    {viewDetails && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
          <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
            <h3 className="text-xl font-bold text-card-dark">Detalles de Solicitud</h3>
            <button onClick={() => setViewDetails(null)} className="text-muted hover:text-foreground">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
            <div>
              <h4 className="font-bold text-brand-red border-b border-border pb-1 mb-4">Datos de la Empresa</h4>
              
              {viewDetails.tipo === "actualizacion" ? (
                (() => {
                  const targetEmpresa = allEmpresas?.find(e => e.id === viewDetails.datos.empresa.targetEmpresaId);
                  const targetSucursal = allSucursales?.find(s => s.id === viewDetails.datos.empresa.targetSucursalId);
                  
                  return (
                    <div className="grid grid-cols-2 gap-6">
                      {/* BEFORE */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Datos Actuales (Antes)</h5>
                        <div><span className="font-bold">Nombre:</span> {targetSucursal ? `${targetSucursal.nombre} (Sucursal)` : targetEmpresa?.nombre}</div>
                        <div><span className="font-bold">Área:</span> {targetEmpresa?.area}</div>
                        <div><span className="font-bold block mb-1">Dirección:</span> <div className="text-xs">{targetSucursal ? targetSucursal.direccion : targetEmpresa?.direccion}</div></div>
                        <div>
                          <span className="font-bold block mb-1">Descripción:</span>
                          <div className="bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-32 overflow-y-auto text-xs">
                            {targetSucursal?.descripcion || targetEmpresa?.descripcion || "Sin descripción"}
                          </div>
                        </div>
                        <div>
                          <span className="font-bold block mb-1">Antecedentes:</span>
                          <div className="bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-32 overflow-y-auto text-xs">
                            {targetSucursal?.antecedentes || targetEmpresa?.antecedentes || "Sin antecedentes"}
                          </div>
                        </div>
                      </div>

                      {/* AFTER */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-600 mb-2">Cambios Propuestos (Después)</h5>
                        <div><span className="font-bold">Nombre:</span> {viewDetails.datos.empresa.nombre}</div>
                        <div><span className="font-bold">Área:</span> {viewDetails.datos.empresa.area}</div>
                        <div><span className="font-bold block mb-1">Dirección:</span> <div className="text-xs">{viewDetails.datos.empresa.direccion}</div></div>
                        <div>
                          <span className="font-bold block mb-1">Descripción:</span>
                          <div className="bg-white p-2 rounded border border-emerald-50 whitespace-pre-wrap max-h-32 overflow-y-auto text-xs">
                            {viewDetails.datos.empresa.descripcion || "Sin descripción"}
                          </div>
                        </div>
                        <div>
                          <span className="font-bold block mb-1">Antecedentes:</span>
                          <div className="bg-white p-2 rounded border border-emerald-50 whitespace-pre-wrap max-h-32 overflow-y-auto text-xs">
                            {viewDetails.datos.empresa.antecedentes || "Sin antecedentes"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-bold">Nombre:</span> {viewDetails.datos.empresa.nombre}</div>
                  <div><span className="font-bold">Área:</span> {viewDetails.datos.empresa.area}</div>
                  <div className="col-span-2"><span className="font-bold">Dirección:</span> {viewDetails.datos.empresa.direccion}</div>
                  <div className="col-span-2">
                    <span className="font-bold block mb-1">Descripción:</span>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {viewDetails.datos.empresa.descripcion}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold block mb-1">Antecedentes:</span>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {viewDetails.datos.empresa.antecedentes}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-bold text-brand-red border-b border-border pb-1 mb-2">Datos del Supervisor</h4>
              
              {viewDetails.tipo === "actualizacion" && viewDetails.datos.supervisor.targetSupervisorId ? (
                (() => {
                  const targetSupervisor = allSupervisores?.find(s => s.id === viewDetails.datos.supervisor.targetSupervisorId);
                  
                  return (
                    <div className="grid grid-cols-2 gap-6">
                      {/* BEFORE */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Datos Actuales (Antes)</h5>
                        <div><span className="font-bold">Nombres:</span> {targetSupervisor?.nombres || "N/A"}</div>
                        <div><span className="font-bold">Apellidos:</span> {targetSupervisor?.apellidos || "N/A"}</div>
                        <div><span className="font-bold">Cargo:</span> {targetSupervisor?.cargo || "N/A"}</div>
                        <div><span className="font-bold">Teléfono:</span> {targetSupervisor?.telefono || "N/A"}</div>
                        <div><span className="font-bold">Correo:</span> {targetSupervisor?.correo || "N/A"}</div>
                      </div>

                      {/* AFTER */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-600 mb-2">Cambios Propuestos (Después)</h5>
                        <div><span className="font-bold">Nombres:</span> {viewDetails.datos.supervisor.nombres}</div>
                        <div><span className="font-bold">Apellidos:</span> {viewDetails.datos.supervisor.apellidos}</div>
                        <div><span className="font-bold">Cargo:</span> {viewDetails.datos.supervisor.cargo}</div>
                        <div><span className="font-bold">Teléfono:</span> {viewDetails.datos.supervisor.telefono}</div>
                        <div><span className="font-bold">Correo:</span> {viewDetails.datos.supervisor.correo}</div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><span className="font-bold">Nombres:</span> {viewDetails.datos.supervisor.nombres}</div>
                  <div><span className="font-bold">Apellidos:</span> {viewDetails.datos.supervisor.apellidos}</div>
                  <div><span className="font-bold">Cargo:</span> {viewDetails.datos.supervisor.cargo}</div>
                  <div><span className="font-bold">Teléfono:</span> {viewDetails.datos.supervisor.telefono}</div>
                  <div><span className="font-bold">Correo:</span> {viewDetails.datos.supervisor.correo}</div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-border flex justify-end shrink-0">
            <button onClick={() => setViewDetails(null)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-sm transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
