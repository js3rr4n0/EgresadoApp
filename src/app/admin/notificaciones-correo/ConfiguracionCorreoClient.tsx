"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarConfiguracionCorreo } from "@/app/actions/notificacionesCorreo";
import type { RolNotificacion } from "@/lib/notificacionesCorreo";
import Interruptor from "@/components/Interruptor";
import IconoCandado from "@/components/IconoCandado";

interface NotificacionConfig {
  id: number;
  nombre: string;
  descripcion: string | null;
  correoHabilitado: boolean;
  obligatoria: boolean;
}

/** Configuración por rol: si cada notificación se envía por correo y si el usuario puede desactivarla. */
export default function ConfiguracionCorreoClient({
  rol,
  rolLabel,
  notificaciones,
}: {
  rol: RolNotificacion;
  rolLabel: string;
  notificaciones: NotificacionConfig[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(notificaciones);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const cambiar = (id: number, campo: "correoHabilitado" | "obligatoria", valor: boolean) => {
    setMensaje(null);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, [campo]: valor } : n)));
  };

  const hayCambios = items.some((n) => {
    const original = notificaciones.find((o) => o.id === n.id);
    return original && (original.correoHabilitado !== n.correoHabilitado || original.obligatoria !== n.obligatoria);
  });

  const guardar = async () => {
    setGuardando(true);
    const res = await guardarConfiguracionCorreo(
      rol,
      items.map((n) => ({ id: n.id, correoHabilitado: n.correoHabilitado, obligatoria: n.obligatoria }))
    );
    setGuardando(false);
    if (res.success) {
      setMensaje({ tipo: "ok", texto: `Configuración del rol ${rolLabel} guardada.` });
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo guardar la configuración." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-2xl shadow-sm divide-y divide-slate-100">
        <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.2fr] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>Notificación</span>
          <span>Enviar por correo</span>
          <span>Configuración por usuario</span>
        </div>
        {items.map((n) => (
          <div key={n.id} className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr] gap-4 px-5 py-4 items-start">
            <div>
              <p className="text-sm font-extrabold text-slate-900">{n.nombre}</p>
              {n.descripcion && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{n.descripcion}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Interruptor
                activo={n.correoHabilitado}
                onChange={(v) => cambiar(n.id, "correoHabilitado", v)}
                etiqueta={`Enviar ${n.nombre} por correo`}
              />
              <span className={`text-xs font-bold ${n.correoHabilitado ? "text-emerald-700" : "text-slate-500"}`}>
                {n.correoHabilitado ? "Activado" : "Desactivado"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50" role="radiogroup" aria-label={`Configuración de ${n.nombre}`}>
                {[
                  { valor: false, label: "Permitida" },
                  { valor: true, label: "Obligatoria" },
                ].map((op) => (
                  <button
                    key={op.label}
                    type="button"
                    role="radio"
                    aria-checked={n.obligatoria === op.valor}
                    disabled={!n.correoHabilitado}
                    onClick={() => cambiar(n.id, "obligatoria", op.valor)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      n.obligatoria === op.valor ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {!n.correoHabilitado ? (
                <p className="text-[11px] text-slate-500 font-semibold">
                  No se envía por correo. La notificación dentro del sistema se mantiene.
                </p>
              ) : n.obligatoria ? (
                <p className="flex items-start gap-1.5 text-[11px] text-amber-900 font-semibold">
                  <IconoCandado className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <strong>Obligatoria.</strong> Esta notificación no puede ser desactivada por el usuario.
                  </span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 font-semibold">El usuario puede activarla o desactivarla en sus preferencias.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold ${
            mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !hayCambios}
          className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-colors disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}
