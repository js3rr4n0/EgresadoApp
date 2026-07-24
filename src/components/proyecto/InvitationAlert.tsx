"use client";

import { useState } from "react";
import { responderInvitacion } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface InvitationAlertProps {
  invitations: {
    id: number;
    propuestaId: number;
    creadoEn: Date;
    invitadorNombre: string;
    invitadorCarnet: string | null;
  }[];
}

export default function InvitationAlert({ invitations }: InvitationAlertProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (invitations.length === 0) return null;

  const handleRespond = async (id: number, aceptar: boolean) => {
    setLoadingId(id);
    const res = await responderInvitacion(id, aceptar);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Ocurrió un error al responder la invitación.");
    }
    setLoadingId(null);
  };

  return (
    <div className="mb-8 space-y-4">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-6 shadow-md border border-red-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex gap-4">
            <div className="mt-1 shrink-0 p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Invitación a Equipo de Proyecto</h3>
              <p className="text-sm text-red-50 mt-1">
                <strong>{inv.invitadorNombre}</strong> ({inv.invitadorCarnet || 'Sin carnet'}) te ha invitado a unirte a su propuesta de tipo Proyecto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleRespond(inv.id, false)}
              disabled={loadingId === inv.id}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors backdrop-blur-sm disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              onClick={() => handleRespond(inv.id, true)}
              disabled={loadingId === inv.id}
              className="bg-white hover:bg-slate-100 text-brand-red font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {loadingId === inv.id ? "Procesando..." : "Aceptar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
