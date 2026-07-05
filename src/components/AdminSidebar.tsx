"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  ) },
  { label: "Usuarios", href: "/admin/usuarios", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ) },
  { label: "Facultades y Carreras", href: "/admin/facultades", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  ) },
  { label: "Fechas y Periodos", href: "/admin/periodos", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  ) },
  { label: "Catálogo de Empresas", href: "/admin/empresas", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  ) },
  { label: "Carga Masiva", href: "/admin/csv", icon: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
  ) },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-[280px] shrink-0 bg-[#CC292B] lg:min-h-screen text-white flex flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 z-50">
      <div className="p-4 lg:p-8 flex items-center justify-between lg:justify-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#CC292B] text-lg lg:text-xl font-serif italic font-bold">U</span>
          </div>
          <div>
            <h1 className="font-bold text-base lg:text-lg leading-tight tracking-wide">Gestión TG</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">UNICAES</p>
          </div>
        </div>
        <div className="lg:hidden">
          {/* Optional hamburger or just let it scroll */}
        </div>
      </div>

      <nav className="flex-1 px-4 pb-2 lg:py-4 lg:space-y-2 flex lg:flex-col overflow-x-auto gap-2 lg:gap-0 no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 lg:gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl transition-all font-medium text-xs lg:text-sm whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-white/10 text-white font-bold" 
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto mb-2 lg:mb-4 hidden lg:block">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/80 hover:bg-white/5 hover:text-white rounded-xl transition-all font-medium text-sm"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
