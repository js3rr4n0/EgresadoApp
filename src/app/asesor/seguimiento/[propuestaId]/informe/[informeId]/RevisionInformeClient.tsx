"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aprobarInformeMensual, solicitarCorreccionInformeMensual } from "@/app/actions/informesMensuales";
import { formatearFechaLarga } from "@/lib/periodosPasantia";

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviado, pendiente de revisión", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const ESTADO_ACTIVIDAD: Record<string, string> = {
  pendiente: "Sin registrar",
  guardado: "Borrador",
  enviado: "Enviada",
  observado: "Con observaciones",
  aprobado: "Aprobada",
};

function formatFechaHora(texto: string | null) {
  return texto || "—";
}

export default function RevisionInformeClient({
  propuestaId,
  informe,
  periodo,
  actividades,
}: {
  propuestaId: number;
  informe: {
    id: number;
    numero: number;
    estado: string;
    fechaLimite: string;
    enviadoEn: string | null;
    cumplimiento: string | null;
    comentarioAsesor: string | null;
  };
  periodo: { inicio: string | null; fin: string | null } | null;
  actividades: { id: number; codigo: string; titulo: string; estado: string }[];
}) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [confirmarAprobacion, setConfirmarAprobacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estado = ESTADO_INFORME[informe.estado] || ESTADO_INFORME.redactando;
  const puedeRevisar = informe.estado === "enviado";

  const alternar = (id: number) =>
    setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleAprobar = async () => {
    setError(null);
    setLoading(true);
    const res = await aprobarInformeMensual(informe.id, comentario.trim() || undefined);
    setLoading(false);
    setConfirmarAprobacion(false);
    if (res.success) router.push(`/asesor/seguimiento/${propuestaId}`);
    else setError(res.error || "No se pudo aprobar el informe.");
  };

  const handleCorrecciones = async () => {
    setError(null);
    if (comentario.trim().length < 5) {
      setError("Debe escribir las observaciones para el estudiante antes de solicitar correcciones.");
      return;
    }
    setLoading(true);
    const res = await solicitarCorreccionInformeMensual(informe.id, comentario.trim(), seleccionadas);
    setLoading(false);
    if (res.success) router.push(`/asesor/seguimiento/${propuestaId}`);
    else setError(res.error || "No se pudieron registrar las observaciones.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Revisión del Informe Mensual #{informe.numero}</h1>
          <p className="text-xs text-muted mt-1 font-semibold">Pasantía como Trabajo de Graduación</p>
        </div>
        <Link
          href={`/asesor/seguimiento/${propuestaId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Estado</span>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${estado.badge}`}>
              {estado.label}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Período del informe</span>
            <span className="font-bold text-slate-800">
              {periodo?.inicio ? `${formatearFechaLarga(periodo.inicio)} al ${formatearFechaLarga(periodo.fin)}` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Fecha límite de entrega</span>
            <span className="font-bold text-slate-800">{formatearFechaLarga(informe.fechaLimite)}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Envío</span>
            <span className="font-bold text-slate-800">{formatFechaHora(informe.enviadoEn)}</span>
            {informe.cumplimiento && (
              <span className="block text-[11px] text-slate-500 font-semibold">
                {informe.cumplimiento === "a_tiempo" ? "A tiempo" : "Fuera de tiempo"}
              </span>
            )}
          </div>
        </div>
        <div className="pt-4">
          <Link
            href={`/informes/${informe.id}/imprimir`}
            target="_blank"
            className="inline-block px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
          >
            Ver documento del informe
          </Link>
        </div>
      </div>

      {!puedeRevisar && informe.comentarioAsesor && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <h2 className="text-xs font-extrabold text-card-dark uppercase tracking-wide">Comentarios registrados</h2>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{informe.comentarioAsesor}</p>
        </div>
      )}

      {puedeRevisar ? (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-card-dark">Dictamen del informe</h2>
            <p className="text-[11px] text-muted font-semibold mt-0.5">
              Para solicitar correcciones, marque las actividades que el estudiante debe corregir; quedarán habilitadas para su
              edición con las observaciones indicadas.
            </p>
          </div>

          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {actividades.map((a) => (
              <li key={a.id} className="p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`act-${a.id}`}
                  checked={seleccionadas.includes(a.id)}
                  onChange={() => alternar(a.id)}
                  className="w-4 h-4 accent-brand-red"
                />
                <label htmlFor={`act-${a.id}`} className="flex-1 min-w-0 text-xs cursor-pointer">
                  <span className="font-mono font-bold text-slate-500 mr-2">{a.codigo}</span>
                  <span className="font-semibold text-slate-800">{a.titulo}</span>
                </label>
                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">{ESTADO_ACTIVIDAD[a.estado] || a.estado}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-slate-400">
              Comentarios u observaciones del asesor
            </label>
            <textarea
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Información relevante sobre el proceso desarrollado por el estudiante, su desempeño y grado de avance. Obligatorio si solicita correcciones."
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={handleCorrecciones}
              className="px-5 py-3 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-extrabold text-xs disabled:opacity-50"
            >
              Solicitar correcciones{seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ""}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setConfirmarAprobacion(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
            >
              Aprobar informe
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted font-semibold">
          {informe.estado === "redactando"
            ? "El estudiante aún no ha enviado este informe."
            : informe.estado === "observado"
              ? "Se solicitaron correcciones; el informe volverá a estar disponible para revisión cuando el estudiante lo reenvíe."
              : "Este informe ya fue aprobado."}
        </p>
      )}

      {confirmarAprobacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Aprobar Informe Mensual #{informe.numero}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El informe quedará registrado como aprobado y se notificará al estudiante y a la coordinación.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmarAprobacion(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {loading ? "Aprobando..." : "Confirmar aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
