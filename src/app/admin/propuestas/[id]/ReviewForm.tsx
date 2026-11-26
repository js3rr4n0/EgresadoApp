"use client";

// Gestión de la propuesta del superadministrador. Entrega C2 (specs/CONFIGURACION_COHORTE.md): la asignación sigue la
// configuración de la cohorte. Muestra solo los coordinadores permitidos para la carrera del egresado y, si la facultad
// trabaja sin coordinador, la asignación directa de asesor.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { asignarAsesorDirecto, asignarPropuestaACoordinador, eliminarPropuestaBorrador } from "@/app/actions/adminPropuestas";
import type { OpcionAsesor } from "@/lib/asignacionServidor";

interface Coordinador {
  id: number;
  nombreCompleto: string;
  correo: string;
  rol: string;
  facultadNombre: string;
  proyectosAsignadosCount: number;
  proyectosEmpresaCount: number;
  proyectosDetalle: { id: number; numero: number; titulo: string; tipo: string; estado: string; empresaNombre: string | null }[];
}

interface Regla {
  cohorte: string;
  periodoId: number;
  facultad: string | null;
  carrera: string | null;
  configurada: boolean;
  texto: string;
  sinCoordinador: boolean;
  adminFacultadId: number | null;
}

interface Solicitud {
  estado: string;
  asesor: string;
  justificacion: string | null;
  creadaEn: string | null;
  respondidoEn: string | null;
}

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "En borrador (no enviada)", clase: "bg-slate-100 text-slate-700 border-slate-300" },
  redactando: { texto: "En borrador (no enviada)", clase: "bg-slate-100 text-slate-700 border-slate-300" },
  enviada: { texto: "Pendiente de asignación", clase: "bg-blue-50 text-blue-800 border-blue-200" },
  coordinador_asignado: { texto: "Coordinador asignado", clase: "bg-red-50 text-brand-red border-brand-red/30" },
  aprobada: { texto: "Aprobada por el asesor", clase: "bg-green-100 text-green-800 border-green-200" },
  primer_contacto_completado: { texto: "Primer contacto completado", clase: "bg-green-100 text-green-800 border-green-200" },
  en_ejecucion: { texto: "En ejecución", clase: "bg-green-100 text-green-900 border-green-300" },
  rechazada: { texto: "Rechazada", clase: "bg-red-100 text-red-800 border-red-200" },
};

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "");

export default function ReviewForm({
  propuestaId,
  estadoActual,
  coordinadores = [],
  initialCoordinadorId,
  regla,
  asesoresDirecto = [],
  ultimaSolicitud,
  tieneAsesor,
  puedeAsignar = true,
  superadmin = true,
}: {
  propuestaId: number;
  estadoActual: string;
  coordinadores?: Coordinador[];
  initialCoordinadorId?: number | null;
  initialObservaciones?: string | null;
  regla: Regla | null;
  asesoresDirecto?: OpcionAsesor[];
  ultimaSolicitud: Solicitud | null;
  tieneAsesor: boolean;
  /** Administrador de facultad sin permiso de asignar en esta cohorte (administración central). */
  puedeAsignar?: boolean;
  superadmin?: boolean;
}) {
  const router = useRouter();
  const unico = regla?.configurada && coordinadores.length === 1 ? coordinadores[0].id : null;
  const [coordinadorId, setCoordinadorId] = useState<number | null>(initialCoordinadorId ?? unico);
  const [asesorId, setAsesorId] = useState<number | null>(null);
  const [buscar, setBuscar] = useState("");
  const [detalle, setDetalle] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const estado = ESTADOS[estadoActual] ?? ESTADOS.enviada;
  const enEspera = ["enviada", "coordinador_asignado"].includes(estadoActual);
  const directo = !!regla?.sinCoordinador;

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return coordinadores.filter((c) => !q || c.nombreCompleto.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q) || c.facultadNombre.toLowerCase().includes(q));
  }, [coordinadores, buscar]);
  const asesoresFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return asesoresDirecto.filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.correo.toLowerCase().includes(q));
  }, [asesoresDirecto, buscar]);

  const asignarCoordinador = async () => {
    if (!coordinadorId) return;
    setLoading(true);
    setMensaje(null);
    const res = await asignarPropuestaACoordinador(propuestaId, coordinadorId);
    setLoading(false);
    setMensaje(res.success ? { ok: true, texto: "Propuesta asignada al coordinador." } : { ok: false, texto: res.error ?? "No se pudo asignar." });
    if (res.success) router.refresh();
  };

  const solicitarAsesor = async () => {
    if (!asesorId) return;
    setLoading(true);
    setMensaje(null);
    const res = await asignarAsesorDirecto(propuestaId, asesorId);
    setLoading(false);
    setMensaje(res.success ? { ok: true, texto: res.message ?? "Solicitud enviada." } : { ok: false, texto: res.error ?? "No se pudo enviar." });
    if (res.success) { setAsesorId(null); router.refresh(); }
  };

  const eliminar = async () => {
    if (!window.confirm("¿Eliminar definitivamente esta propuesta? Se borrarán todos sus datos.")) return;
    setDeleting(true);
    const res = await eliminarPropuestaBorrador(propuestaId);
    setDeleting(false);
    if (res.success) {
      router.push("/admin/propuestas");
      router.refresh();
    } else alert(res.error || "No se pudo eliminar la propuesta.");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden sticky top-8">
      <div className="px-5 py-4 bg-brand-red text-white">
        <h2 className="font-bold text-lg">Gestión de la propuesta</h2>
        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-bold border bg-white ${estado.clase}`}>{estado.texto}</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Regla que se aplica según la configuración de la cohorte */}
        {regla && (
          <div className={`rounded-xl border p-3 text-sm space-y-1 ${regla.configurada ? "border-border bg-gray-50" : "border-amber-300 bg-amber-50"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Regla de asignación</p>
            <p className="text-xs text-gray-600">
              {regla.cohorte} · {regla.facultad ?? "Sin facultad"} · {regla.carrera ?? "Sin carrera"}
            </p>
            <p className={`font-semibold ${regla.configurada ? "text-gray-800" : "text-amber-900"}`}>{regla.texto}</p>
            {!regla.configurada && (
              <Link href={`/admin/periodos/${regla.periodoId}/configuracion`} className="inline-block text-xs font-bold text-brand-red hover:underline">
                Configurar la cohorte
              </Link>
            )}
          </div>
        )}

        {/* Estado de la solicitud de asesoría */}
        {ultimaSolicitud && (
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Solicitud de asesoría</p>
            <p className="text-gray-800">
              <span className="font-semibold">{ultimaSolicitud.asesor}</span>{" "}
              <span className={`ml-1 px-1.5 py-px rounded text-[11px] font-bold ${ultimaSolicitud.estado === "aceptada" ? "bg-green-100 text-green-800" : ultimaSolicitud.estado === "rechazada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                {ultimaSolicitud.estado === "aceptada" ? "Aceptó" : ultimaSolicitud.estado === "rechazada" ? "Rechazó" : "Pendiente de respuesta"}
              </span>
            </p>
            <p className="text-xs text-muted mt-0.5">Enviada el {fecha(ultimaSolicitud.creadaEn)}{ultimaSolicitud.respondidoEn ? ` · respondida el ${fecha(ultimaSolicitud.respondidoEn)}` : ""}</p>
            {ultimaSolicitud.justificacion && <p className="text-xs text-gray-700 mt-1">Motivo: {ultimaSolicitud.justificacion}</p>}
          </div>
        )}

        {enEspera && !tieneAsesor && !puedeAsignar && (
          <p className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3">
            En esta cohorte la facultad tiene administración central: la asignación la hace el superadministrador.
          </p>
        )}

        {enEspera && !tieneAsesor && puedeAsignar && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-gray-800">{directo ? "Asignación directa de asesor" : "Asignar coordinador"}</p>
              <span className="text-xs text-muted">{directo ? asesoresDirecto.length : coordinadores.length} disponibles</span>
            </div>
            {(directo ? asesoresDirecto.length : coordinadores.length) > 5 && (
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
              />
            )}

            {directo ? (
              asesoresDirecto.length === 0 ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  No hay asesores habilitados para esta carrera en la cohorte. Agrégalos en la configuración de la cohorte.
                </p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {asesoresFiltrados.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setAsesorId(a.id)}
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${asesorId === a.id ? "border-brand-red ring-1 ring-brand-red bg-red-50/40" : "border-border hover:border-gray-400"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{a.nombre}</p>
                            <p className="text-[11px] text-muted truncate">{a.carreras.length ? a.carreras.join(", ") : "Todas las carreras"}</p>
                          </div>
                          {a.deLaCarrera && <span className="shrink-0 px-1.5 py-px rounded bg-green-100 text-green-800 text-[10px] font-bold">De la carrera</span>}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1">{a.activos} en curso · {a.pendientes} {a.pendientes === 1 ? "solicitud pendiente" : "solicitudes pendientes"}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : coordinadores.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                No hay coordinadores habilitados para esta carrera en la cohorte. Revisa la configuración de la cohorte.
              </p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filtrados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCoordinadorId(c.id)}
                      disabled={!!unico && c.id !== unico}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${coordinadorId === c.id ? "border-brand-red ring-1 ring-brand-red bg-red-50/40" : "border-border hover:border-gray-400"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{c.nombreCompleto}</p>
                          <p className="text-[11px] text-muted truncate">
                            {c.facultadNombre}
                            {c.id === regla?.adminFacultadId ? " · Administrador de facultad" : c.rol === "admin" ? " · Superadministrador" : ""}
                          </p>
                        </div>
                        {c.proyectosEmpresaCount > 0 && <span className="shrink-0 px-1.5 py-px rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Conoce la empresa</span>}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">
                        {c.proyectosAsignadosCount} {c.proyectosAsignadosCount === 1 ? "propuesta" : "propuestas"} a cargo
                        {c.proyectosEmpresaCount > 0 ? ` · ${c.proyectosEmpresaCount} con esta empresa` : ""}
                      </p>
                    </button>
                    {coordinadorId === c.id && c.proyectosDetalle.length > 0 && (
                      <div className="mt-1 ml-3">
                        <button type="button" onClick={() => setDetalle(detalle === c.id ? null : c.id)} className="text-[11px] font-bold text-brand-red hover:underline">
                          {detalle === c.id ? "Ocultar propuestas a cargo" : "Ver propuestas a cargo"}
                        </button>
                        {detalle === c.id && (
                          <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                            {c.proyectosDetalle.map((p) => (
                              <li key={p.id} className="text-[11px] text-gray-700 bg-gray-50 border border-border rounded-md px-2 py-1">
                                {p.titulo} <span className="text-muted">· {p.empresaNombre ?? "sin empresa"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {unico && <p className="text-xs text-muted">Es el único coordinador configurado para esta carrera en la cohorte.</p>}

            {mensaje && (
              <p className={`text-sm rounded-lg p-3 border ${mensaje.ok ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{mensaje.texto}</p>
            )}

            <button
              type="button"
              onClick={directo ? solicitarAsesor : asignarCoordinador}
              disabled={loading || (directo ? !asesorId : !coordinadorId)}
              className="w-full py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {loading
                ? "Procesando..."
                : directo
                  ? "Enviar solicitud al asesor"
                  : estadoActual === "coordinador_asignado"
                    ? "Reasignar coordinador"
                    : "Asignar coordinador"}
            </button>
          </div>
        )}

        {!enEspera && !["borrador", "redactando"].includes(estadoActual) && (
          <p className="text-sm text-muted">La propuesta ya pasó la etapa de asignación.</p>
        )}

        {superadmin && (
        <div className="pt-4 border-t border-border space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Acción administrativa</p>
          <button
            type="button"
            onClick={eliminar}
            disabled={deleting}
            className="w-full py-2.5 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-sm font-bold transition-colors disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar propuesta definitivamente"}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
