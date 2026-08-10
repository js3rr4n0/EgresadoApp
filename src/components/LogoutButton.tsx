"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
  title?: string;
}

export default function LogoutButton({ className, children, title }: LogoutButtonProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Ignore Next.js redirect exception
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      title={title || "Cerrar Sesión"}
      className={className || "p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"}
    >
      {children || (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden md:inline">{loggingOut ? "Saliendo..." : "Salir"}</span>
        </>
      )}
    </button>
  );
}
