"use client";

/** Interruptor accesible (switch) para activar o desactivar una opción. */
export default function Interruptor({
  activo,
  onChange,
  deshabilitado = false,
  etiqueta,
}: {
  activo: boolean;
  onChange: (valor: boolean) => void;
  deshabilitado?: boolean;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={() => onChange(!activo)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        activo ? "bg-emerald-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}
