"use client";
// D4 (specs/COORDINADOR_ASIGNACION.md): panel lateral de «Revisar y asignar». Muestra la solicitud de asesoría vigente,
// la lista de asesores de la cohorte (prioritarios por la empresa, de la carrera y su carga) y el rechazo por requisitos.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { asignarAsesorCoordinador } from "@/app/actions/coordinador";
import Prioritario from "@/components/asesores/Prioritario";
import RechazarPropuesta from "@/components/revisarPropuesta/RechazarPropuesta";
import { fechaCortaSV } from "@/lib/fechasTexto";

export interface OpcionAsesorPanel {
  id: number;
  nombreCompleto: string;
  correo: string;
  prioritario?: string | null;
  deLaCarrera?: boolean;
  carga?: number;
  /** D5 */
  cupo?: number;
  lleno?: boolean;
}

export interface SolicitudPanel {
  estado: string;
  asesor: string;
  justificacion: string | null;
  creadaEn: string | null;
  respondidoEn: string | null;
}

export default function PanelAsignacion({
  propuestaId,
  numero,
  integrantes,
  asesores,
  regla,
  requisitosListo,
  solicitud,
}: {
  propuestaId: number;
  numero: number;
  integrantes: { id: number; nombre: string }[];
  asesores: OpcionAsesorPanel[];
  /** Texto de la regla de la cohorte (C2), si está configurada. */
  regla: string | null;
  requisitosListo: boolean;
  solicitud: SolicitudPanel | null;
}) {
  const router = useRouter();
  const [elegido, setElegido] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [buscar, setBuscar] = useState("");

  const esperando = solicitud?.estado === "pendiente";
  const rechazada = solicitud?.estado === "rechazada";
  const puedeElegir = requisitosListo && !esperando;
  const q = buscar.trim().toLowerCase();
  const lista = asesores.filter((a) => !q || a.nombreCompleto.toLowerCase().includes(q) || a.correo.toLowerCase().includes(q));

  const enviar = async () => {
    if (!elegido) return;
    setEnviando(true);
    setMensaje(null);
    const r = await asignarAsesorCoordinador(propuestaId, elegido);
    setEnviando(false);
    setMensaje(r?.success ? { ok: true, texto: r.message ?? "Solicitud enviada al asesor." } : { ok: false, texto: r?.error ?? "No se pudo enviar." });
    if (r?.success) {
      setElegido(null);
      router.refresh();
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="bg-brand-red px-5 py-4 text-white">
        <h2 className="text-lg font-bold">Asignar asesor</h2>
        <p className="text-xs text-white/90">Elige quién asesora la propuesta; se le envía una solicitud que puede aceptar o rechazar.</p>
      </div>

      <div className="space-y-4 p-5">
        {regla && (
          <div className="rounded-lg border border-border bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Regla de la cohorte</p>
            <p className="text-xs text-gray-800">{regla}</p>
          </div>
        )}

        {solicitud && (
          <div className={`rounded-lg border p-3 text-sm ${rechazada ? "border-red-200 bg-red-50/50" : esperando ? "border-amber-200 bg-amber-50/60" : "border-border bg-gray-50"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Solicitud de asesoría</p>
            <p className="text-gray-900">
              {esperando ? "Esperando respuesta de " : rechazada ? "Rechazada por " : "Aceptada por "}
              <span className="font-semibold">{solicitud.asesor}</span>
            </p>
            <p className="text-xs text-muted">
              Enviada el {solicitud.creadaEn ? fechaCortaSV(solicitud.creadaEn) : "—"}
              {solicitud.respondidoEn ? ` · respondida el ${fechaCortaSV(solicitud.respondidoEn)}` : ""}
            </p>
            {rechazada && solicitud.justificacion && <p className="mt-1 text-xs text-gray-700">Motivo: {solicitud.justificacion}</p>}
          </div>
        )}

        {!requisitosListo ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Faltan requisitos que debía verificar la administración (ver «Verificado antes de asignar»): no se puede asignar asesor.
            Rechaza la propuesta por requisitos o pide a la administración que lo revise.
          </p>
        ) : esperando ? (
          <p className="text-sm text-gray-700">Cuando el asesor responda, la propuesta pasa a «Mis propuestas asignadas» o vuelve aquí para elegir a otro.</p>
        ) : null}

        {puedeElegir && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">{rechazada ? "Elegir otro asesor" : "Asesores de la cohorte"}</p>
            {asesores.length > 5 && (
              <input
                type="search"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar asesor"
                className="h-9 w-full rounded-lg border border-border px-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            )}
            {asesores.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No hay asesores configurados para la carrera de esta propuesta en su cohorte.</p>
            ) : (
              <>
                {asesores.some((a) => a.prioritario) && <p className="text-xs text-gray-600">Los prioritarios ya trabajan o trabajaron con la empresa de esta propuesta.</p>}
                <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                  {lista.map((a) => (
                    <li key={a.id}>
                      <label className={`flex items-start gap-3 rounded-lg border p-3 ${a.lleno ? "cursor-not-allowed border-border bg-gray-50 opacity-70" : elegido === a.id ? "cursor-pointer border-brand-red bg-red-50/40" : "cursor-pointer border-border hover:border-gray-400"}`}>
                        <input type="radio" disabled={!!a.lleno} name={`asesor-${propuestaId}`} checked={elegido === a.id} onChange={() => setElegido(a.id)} className="mt-1 accent-brand-red" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">{a.nombreCompleto}</span>
                            {a.prioritario && <Prioritario motivo={a.prioritario} />}
                            {a.deLaCarrera && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-gray-600">De la carrera</span>}
                          </span>
                          <span className="block truncate text-[11px] text-muted">{a.correo}</span>
                          {a.prioritario && <span className="block text-[11px] text-amber-900">{a.prioritario}</span>}
                          {typeof a.carga === "number" && (
                            <span className={`block text-[11px] ${a.lleno ? "font-bold text-red-800" : "text-gray-600"}`}>
                              {typeof a.cupo === "number" ? `Carga: ${a.carga} de ${a.cupo}${a.lleno ? " · Cupo lleno" : ` · ${a.cupo - a.carga} disponible${a.cupo - a.carga === 1 ? "" : "s"}`}` : `${a.carga} a su cargo`}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {mensaje && (
          <p className={`rounded-lg border p-3 text-sm ${mensaje.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{mensaje.texto}</p>
        )}

        {puedeElegir && asesores.length > 0 && (
          <button
            type="button"
            onClick={enviar}
            disabled={!elegido || enviando}
            className="w-full rounded-xl bg-brand-red py-3 text-sm font-bold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Enviar solicitud al asesor"}
          </button>
        )}

        {!esperando && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Rechazo por requisitos</p>
            <p className="text-xs text-gray-600">
              Si el documento no es claro, los objetivos no se entienden o falta algo de la carta, devuélvela al egresado con el
              motivo para que la corrija y la envíe de nuevo.
            </p>
            <RechazarPropuesta propuestaId={propuestaId} numero={numero} integrantes={integrantes} />
          </div>
        )}
      </div>
    </div>
  );
}
