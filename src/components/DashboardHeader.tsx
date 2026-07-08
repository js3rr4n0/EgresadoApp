"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

export interface NavItem {
  label: string;
  href: string;
}

interface HeaderProps {
  roleName: string;
  userName: string;
  navItems: NavItem[];
}

export default function DashboardHeader({
  roleName,
  userName,
  navItems,
}: HeaderProps) {
  const pathname = usePathname();

  return (
    <div className="bg-background">
      {/* Top Red Header */}
      <header className="bg-brand-red text-white">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 shadow-sm shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/unicaes-logo.png" alt="UNICAES Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-wide leading-tight">Gestión TG</span>
              <span className="text-[10px] font-bold tracking-widest text-white/80 uppercase">UNICAES</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button className="relative hidden sm:block">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-brand-red"></span>
            </button>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-tight">{userName}</p>
                <p className="text-xs text-white/80">{roleName}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 flex items-center justify-center overflow-hidden shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <form action={logout}>
              <button type="submit" className="text-white hover:text-white/80 transition-colors ml-2 sm:ml-0 p-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-white shadow-sm overflow-x-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <nav className="flex gap-4 sm:gap-8 min-w-max">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
                    isActive 
                      ? "border-brand-red text-brand-red" 
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
