"use client";

import { useState } from "react";

import { aprobarSolicitudEmpresa } from "@/app/actions/solicitudes";

export default function SolicitudesTable({ solicitudes }: { solicitudes: any[] }) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

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

  return (
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
                  {s.estado === "pendiente" && (
                    <button
                      onClick={() => handleApprove(s.id)}
                      disabled={loadingId === s.id}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {loadingId === s.id ? "Aprobando..." : "Aprobar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
