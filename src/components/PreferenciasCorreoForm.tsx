"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarMisPreferenciasCorreo } from "@/app/actions/notificacionesCorreo";
import { esConfigurable, seEnviariaCorreo } from "@/lib/notificacionesCorreo";
import Interruptor from "@/components/Interruptor";
import IconoCandado from "@/components/IconoCandado";

interface PreferenciaCorreo {
  id: number;
  nombre: string;
  descripcion: string | null;
  correoHabilitado: boolean;
  obligatoria: boolean;
  recibirCorreo: boolean;
}

/** Preferencias de correo del usuario: solo modifica las notificaciones que el administrador dejó configurables. */
export default function PreferenciasCorreoForm({ notificaciones }: { notificaciones: PreferenciaCorreo[] }) {
  const router = useRouter();
  const [items, setItems] = useState(notificaciones);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const hayCambios = items.some((n) => notificaciones.find((o) => o.id === n.id)?.recibirCorreo !== n.recibirCorreo);

  const guardar = async () => {
    setGuardando(true);
    const res = await guardarMisPreferenciasCorreo(
      items.filter(esConfigurable).map((n) => ({ configId: n.id, recibirCorreo: n.recibirCorreo }))
    );
    setGuardando(false);
    if (res.success) {
      setMensaje({ tipo: "ok", texto: "Preferencias guardadas." });
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: res.error || "No se pudieron guardar las preferencias." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-2xl shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-900">Preferencias de correo</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Estas opciones solo afectan el correo electrónico. Todas las notificaciones seguirán apareciendo dentro del sistema.
          </p>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((n) => {
            const configurable = esConfigurable(n);
            const enviaria = seEnviariaCorreo(n, n.recibirCorreo);
            return (
              <li key={n.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-extrabold text-slate-900">{n.nombre}</p>
                    {n.obligatoria && n.correoHabilitado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-amber-50 text-amber-900 border-amber-300">
                        <IconoCandado className="w-3 h-3" />
                        Obligatoria
                      </span>
                    )}
                  </div>
                  {n.descripcion && <p className="text-[11px] text-slate-500 font-medium">{n.descripcion}</p>}
                  {!n.correoHabilitado ? (
                    <p className="text-[11px] text-slate-500 font-semibold">
                      El administrador desactivó el envío por correo de esta notificación; solo se muestra dentro del sistema.
                    </p>
                  ) : n.obligatoria ? (
                    <p className="text-[11px] text-amber-900 font-semibold">Esta notificación es obligatoria y no puede ser desactivada.</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-bold ${enviaria ? "text-emerald-700" : "text-slate-400"}`}>
                    {enviaria ? "Recibir por correo" : "No recibir por correo"}
                  </span>
                  <Interruptor
                    activo={n.correoHabilitado && n.recibirCorreo}
                    deshabilitado={!configurable}
                    etiqueta={`Recibir ${n.nombre} por correo`}
                    onChange={(v) => {
                      setMensaje(null);
                      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, recibirCorreo: v } : x)));
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
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
          {guardando ? "Guardando..." : "Guardar preferencias"}
        </button>
      </div>
    </div>
  );
}
