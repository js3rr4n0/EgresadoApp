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
                  ) : s.tipo === "datos_alumno" ? (
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Datos Alumno</span>
                  ) : (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Actualización</span>
                  )}
                </td>
                <td className="px-6 py-4">{s.egresado || "Desconocido"}</td>
                <td className="px-6 py-4">
                  {s.tipo === "datos_alumno" ? (
                    <div>
                      <div className="font-bold text-foreground">
                        Corrección de Nombre / Carnet
                      </div>
                      <div className="text-xs text-muted">
                        Solicitado: {data?.nuevos?.nombreCompleto || data?.nombrePropuesto} ({data?.nuevos?.carnet || data?.carnetPropuesto})
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-foreground">
                        {data?.empresa?.nombre || "N/A"}
                      </div>
                      {s.tipo === "actualizacion" && s.empresaTarget && (
                        <div className="text-xs text-muted">
                          Objetivo: {s.empresaTarget}
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {s.estado === "pendiente" && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">Pendiente</span>}
                  {s.estado === "aprobada" && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Aprobada</span>}
                  {s.estado === "rechazada" && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">Rechazada</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewDetails(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all shadow-xs"
                      title="Ver Detalles"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Detalles
                    </button>
                    {s.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={loadingId === s.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-50 active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {loadingId === s.id ? "..." : "Aprobar"}
                        </button>
                        <button
                          onClick={() => setRejectingId(s.id)}
                          disabled={loadingId === s.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all shadow-xs disabled:opacity-50 active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
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
            <div>
              <h3 className="text-xl font-bold text-card-dark">Detalles de Solicitud</h3>
              <p className="text-xs text-muted">
                {viewDetails.tipo === "datos_alumno" ? "Solicitud de Corrección de Datos del Egresado" : "Solicitud de Datos de Empresa / Supervisor"}
              </p>
            </div>
            <button onClick={() => setViewDetails(null)} className="text-muted hover:text-foreground">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
            {viewDetails.tipo === "datos_alumno" ? (
              (() => {
                const anteriores = viewDetails.datos?.anteriores || {};
                const nuevos = viewDetails.datos?.nuevos || {};
                const nombreChanged = anteriores.nombreCompleto !== nuevos.nombreCompleto;
                const carnetChanged = anteriores.carnet !== nuevos.carnet;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* BEFORE */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-200 pb-1">
                          Datos Actuales (Antes)
                        </h5>
                        <div>
                          <span className="font-bold text-xs text-muted block">Nombre Completo:</span>
                          <span className="font-semibold text-slate-800">{anteriores.nombreCompleto || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-bold text-xs text-muted block">Carnet:</span>
                          <span className="font-semibold text-slate-800">{anteriores.carnet || "N/A"}</span>
                        </div>
                      </div>

                      {/* AFTER */}
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-700 mb-2 border-b border-emerald-200 pb-1">
                          Cambios Propuestos (Después)
                        </h5>
                        <div>
                          <span className="font-bold text-xs text-emerald-800 block">Nombre Completo Solicitado:</span>
                          {nombreChanged ? (
                            <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-sm">
                              {nuevos.nombreCompleto}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No realizó cambios</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-emerald-800 block">Carnet Solicitado:</span>
                          {carnetChanged ? (
                            <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-sm">
                              {nuevos.carnet}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No realizó cambios</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-1">
                        Justificación del Egresado
                      </h5>
                      <p className="text-xs text-amber-900 whitespace-pre-wrap">
                        {viewDetails.datos?.justificacion || "Sin justificación especificada"}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-brand-red border-b border-border pb-1 mb-4">Datos de la Empresa</h4>
                  
                  {viewDetails.tipo === "actualizacion" ? (
                    (() => {
                      const targetEmpresa = allEmpresas?.find(e => e.id === viewDetails.datos.empresa?.targetEmpresaId);
                      const targetSucursal = allSucursales?.find(s => s.id === viewDetails.datos.empresa?.targetSucursalId);
                      const hasEmpresaChanges = !!(viewDetails.datos.empresa?.nombre || viewDetails.datos.empresa?.area || viewDetails.datos.empresa?.direccion);
                      
                      return (
                        <div className="space-y-6">
                          <div>
                            {hasEmpresaChanges ? (
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
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500 block mb-1">Empresa Seleccionada (Sin cambios de empresa)</span>
                                <div><span className="font-bold">Nombre:</span> {targetSucursal ? `${targetSucursal.nombre} (Sucursal)` : targetEmpresa?.nombre || "N/A"}</div>
                                <div><span className="font-bold">Área:</span> {targetEmpresa?.area || "N/A"}</div>
                                <div><span className="font-bold">Dirección:</span> {targetSucursal ? targetSucursal.direccion : targetEmpresa?.direccion || "N/A"}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="font-bold">Nombre:</span> {viewDetails.datos.empresa?.nombre || "N/A"}</div>
                      <div><span className="font-bold">Área:</span> {viewDetails.datos.empresa?.area || "N/A"}</div>
                      <div className="col-span-2"><span className="font-bold">Dirección:</span> {viewDetails.datos.empresa?.direccion || "N/A"}</div>
                      <div className="col-span-2">
                        <span className="font-bold block mb-1">Descripción:</span>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {viewDetails.datos.empresa?.descripcion || "Sin descripción"}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold block mb-1">Antecedentes:</span>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {viewDetails.datos.empresa?.antecedentes || "Sin antecedentes"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-bold text-brand-red border-b border-border pb-1 mb-2">Datos del Supervisor</h4>
                  
                  {viewDetails.tipo === "actualizacion" ? (
                    (() => {
                      const targetSupervisor = viewDetails.datos.supervisor?.targetSupervisorId
                        ? allSupervisores?.find(s => s.id === viewDetails.datos.supervisor.targetSupervisorId)
                        : null;
                      
                      return (
                        <div className="grid grid-cols-2 gap-6">
                          {/* BEFORE */}
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Datos Actuales (Antes)</h5>
                            {targetSupervisor ? (
                              <>
                                <div><span className="font-bold">Título:</span> {targetSupervisor.titulo || "N/A"}</div>
                                <div><span className="font-bold">Nombres:</span> {targetSupervisor.nombres || "N/A"}</div>
                                <div><span className="font-bold">Apellidos:</span> {targetSupervisor.apellidos || "N/A"}</div>
                                <div><span className="font-bold">Cargo:</span> {targetSupervisor.cargo || "N/A"}</div>
                                <div><span className="font-bold">Especialidad:</span> {targetSupervisor.especialidad || "N/A"}</div>
                                <div><span className="font-bold">Teléfono:</span> {targetSupervisor.telefono || "N/A"}</div>
                                <div><span className="font-bold">Correo:</span> {targetSupervisor.correo || "N/A"}</div>
                              </>
                            ) : (
                              <div className="text-xs text-slate-500 italic py-4">
                                No hay supervisor previo seleccionado. Se registrará este nuevo supervisor para la empresa.
                              </div>
                            )}
                          </div>

                          {/* AFTER */}
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-3">
                            <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-600 mb-2">
                              {targetSupervisor ? "Cambios Propuestos (Después)" : "Nuevo Supervisor A Registrar"}
                            </h5>
                            <div><span className="font-bold">Título:</span> {viewDetails.datos.supervisor?.titulo || "N/A"}</div>
                            <div><span className="font-bold">Nombres:</span> {viewDetails.datos.supervisor?.nombres || "N/A"}</div>
                            <div><span className="font-bold">Apellidos:</span> {viewDetails.datos.supervisor?.apellidos || "N/A"}</div>
                            <div><span className="font-bold">Cargo:</span> {viewDetails.datos.supervisor?.cargo || "N/A"}</div>
                            <div><span className="font-bold">Especialidad:</span> {viewDetails.datos.supervisor?.especialidad || "N/A"}</div>
                            <div><span className="font-bold">Teléfono:</span> {viewDetails.datos.supervisor?.telefono || "N/A"}</div>
                            <div><span className="font-bold">Correo:</span> {viewDetails.datos.supervisor?.correo || "N/A"}</div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div><span className="font-bold">Título:</span> {viewDetails.datos.supervisor?.titulo || "N/A"}</div>
                      <div><span className="font-bold">Nombres:</span> {viewDetails.datos.supervisor?.nombres || "N/A"}</div>
                      <div><span className="font-bold">Apellidos:</span> {viewDetails.datos.supervisor?.apellidos || "N/A"}</div>
                      <div><span className="font-bold">Cargo:</span> {viewDetails.datos.supervisor?.cargo || "N/A"}</div>
                      <div><span className="font-bold">Especialidad:</span> {viewDetails.datos.supervisor?.especialidad || "N/A"}</div>
                      <div><span className="font-bold">Teléfono:</span> {viewDetails.datos.supervisor?.telefono || "N/A"}</div>
                      <div><span className="font-bold">Correo:</span> {viewDetails.datos.supervisor?.correo || "N/A"}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="p-5 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
            <button onClick={() => setViewDetails(null)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs">
              Cerrar
            </button>
            {viewDetails.estado === "pendiente" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const id = viewDetails.id;
                    setViewDetails(null);
                    setRejectingId(id);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all shadow-xs"
                >
                  Rechazar Solicitud
                </button>
                <button
                  onClick={async () => {
                    const id = viewDetails.id;
                    setViewDetails(null);
                    await handleApprove(id);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  Aprobar Solicitud
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
