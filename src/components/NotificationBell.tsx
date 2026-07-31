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
    if (isAdminOrDecan) {
      router.push("/admin/empresas/solicitudes");
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleMarkRead = async (id: number) => {
    await marcarNotificacionLeida(id);
    loadNotifications();
  };

  const badgeDisplayCount = isAdminOrDecan ? pendingCount : unreadCount;

  return (
    <div className="relative">
      <button
        onClick={handleClickBell}
        type="button"
        title={isAdminOrDecan ? "Ver Solicitudes Pendientes" : "Notificaciones"}
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

      {/* Egresado Notification Dropdown */}
      {!isAdminOrDecan && isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 bg-slate-50 border-b border-border flex justify-between items-center">
            <h4 className="font-bold text-sm text-card-dark flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notificaciones
            </h4>
            {unreadCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {unreadCount} sin leer
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No tienes notificaciones por el momento.
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`p-4 text-xs cursor-pointer transition-colors ${
                    !n.leida ? "bg-amber-50/60 font-semibold" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      {n.tipo === "solicitud_aprobada"
                        ? "✅ Solicitud Aprobada"
                        : n.tipo === "solicitud_rechazada"
                        ? "❌ Solicitud Rechazada"
                        : "📢 Notificación"}
                    </span>
                    <span className="text-[10px] text-muted">
                      {n.creadoEn ? new Date(n.creadoEn).toLocaleDateString("es-SV") : ""}
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-700">{n.mensaje}</p>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-border text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted hover:text-foreground font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
