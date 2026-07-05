"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState | undefined, FormData>(
    login,
    undefined
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted-bg px-4">
      <div className="w-full max-w-[440px]">
        {/* Login Card */}
        <div className="bg-card-bg border border-border rounded-xl p-8 shadow-sm">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-red mb-4">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              TRABGRAD
            </h1>
            <p className="text-muted mt-1 text-sm">
              Sistema de Procesos de Graduación
            </p>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-6">
            Iniciar Sesión
          </h2>

          {state?.error && (
            <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-5">
            <div>
              <label
                htmlFor="correo"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="correo"
                name="correo"
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@universidad.edu"
                className="w-full px-4 py-2.5 rounded-md bg-white border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-md bg-white border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 px-4 rounded-md bg-brand-red text-white font-semibold hover:bg-brand-red-hover focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white border border-border rounded-xl p-5 shadow-sm max-w-[440px] w-full">
          <h3 className="font-bold text-card-dark text-sm mb-3 border-b border-border pb-2">
            Credenciales de Acceso (Demo):
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-brand-red mb-0.5">Admin: <span className="text-muted font-normal">admin@uni.test</span></p>
              <p className="text-muted">Pass: Test123!</p>
            </div>
            <div>
              <p className="font-bold text-brand-red mb-0.5">Coord: <span className="text-muted font-normal">decanato@uni.test</span></p>
              <p className="text-muted">Pass: Test123!</p>
            </div>
            <div>
              <p className="font-bold text-brand-red mb-0.5">Asesor: <span className="text-muted font-normal">asesor@uni.test</span></p>
              <p className="text-muted">Pass: Test123!</p>
            </div>
            <div>
              <p className="font-bold text-brand-red mb-0.5">Egresado: <span className="text-muted font-normal">egresado@uni.test</span></p>
              <p className="text-muted">Pass: Test123!</p>
            </div>
          </div>
        </div>

        <p className="text-center text-muted text-xs mt-8">
          © {new Date().getFullYear()} Universidad — Sistema de Procesos de
          Graduación
        </p>
      </div>
    </div>
  );
}
