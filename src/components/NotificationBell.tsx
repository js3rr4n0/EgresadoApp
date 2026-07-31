"use client";

import { useEffect, useState } from "react";
import { getNotificacionesUsuario, marcarNotificacionLeida } from "@/app/actions/notificaciones";
import { useRouter } from "next/navigation";

interface NotificationBellProps {
  roleName?: string;
}

export default function NotificationBell({ roleName }: NotificationBellProps) {
  const router = useRouter();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const isAdminOrDecan = roleName?.toLowerCase().includes("admin") || roleName?.toLowerCase().includes("decan");

  const loadNotifications = async () => {
    const res = await getNotificacionesUsuario();
    setNotifs(res.notificaciones || []);
    setUnreadCount(res.unreadCount || 0);
    setPendingCount(res.pendingSolicitudesCount || 0);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const handleClickBell = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkReadAndNavigate = async (id: number) => {
    await marcarNotificacionLeida(id);
    loadNotifications();
    if (isAdminOrDecan) {
      setIsOpen(false);
      router.push("/admin/empresas/solicitudes");
    }
  };

  const handleGoToSolicitudes = () => {
    setIsOpen(false);
    router.push("/admin/empresas/solicitudes");
  };

  const badgeDisplayCount = isAdminOrDecan ? (pendingCount > 0 ? pendingCount : unreadCount) : unreadCount;

  return (
    <div className="relative">
      <button
        onClick={handleClickBell}
        type="button"
        title="Notificaciones y Solicitudes"
        className="relative p-2 rounded-full hover:bg-white/10 text-white transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {badgeDisplayCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-brand-red font-extrabold text-[10px] min-w-5 h-5 px-1 rounded-full border-2 border-brand-red flex items-center justify-center shadow-md animate-pulse">
            {badgeDisplayCount > 99 ? "99+" : badgeDisplayCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {isAdminOrDecan ? "Solicitudes y Notificaciones" : "Tus Notificaciones"}
            </h4>
            {isAdminOrDecan ? (
              pendingCount > 0 && (
                <span className="text-[11px] bg-amber-400 text-slate-900 font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                  {pendingCount} Pendiente{pendingCount > 1 ? "s" : ""}
                </span>
              )
            ) : (
              unreadCount > 0 && (
                <span className="text-[11px] bg-amber-400 text-slate-900 font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                  {unreadCount} Sin leer
                </span>
              )
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <p className="font-medium">No hay notificaciones por el momento.</p>
              </div>
            ) : (
              notifs.map((n) => {
                const isApproved = n.tipo === "solicitud_aprobada";
                const isRejected = n.tipo === "solicitud_rechazada";
                const isCorrection = n.tipo === "solicitud_correccion_datos";

                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkReadAndNavigate(n.id)}
                    className={`p-4 text-xs cursor-pointer transition-all ${
                      !n.leida ? "bg-amber-50/70 border-l-4 border-l-amber-500" : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                        {isApproved && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                            ✅ Solicitud Aprobada
                          </span>
                        )}
                        {isRejected && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded">
                            ❌ Solicitud Rechazada
                          </span>
                        )}
                        {isCorrection && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                            📑 Solicitud de Alumno
                          </span>
                        )}
                        {!isApproved && !isRejected && !isCorrection && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            📢 Notificación
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {n.creadoEn ? new Date(n.creadoEn).toLocaleDateString("es-SV") : ""}
                      </span>
                    </div>

                    <p className="leading-relaxed text-slate-800 font-medium text-xs mt-1">
                      {n.mensaje}
                    </p>

                    {isAdminOrDecan && (
                      <div className="mt-2.5 flex justify-end">
                        <span className="text-[11px] font-bold text-brand-red hover:underline flex items-center gap-1">
                          Revisar Solicitud
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
            {isAdminOrDecan && (
              <button
                onClick={handleGoToSolicitudes}
                className="w-full py-2 px-4 bg-brand-red hover:bg-brand-red/90 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Ver Solicitudes Pendientes {pendingCount > 0 ? `(${pendingCount})` : ""}
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-900 font-bold py-1 text-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
