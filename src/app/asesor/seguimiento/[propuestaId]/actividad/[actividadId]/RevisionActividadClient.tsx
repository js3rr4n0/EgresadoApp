"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aprobarRegistroActividad, solicitarCorreccionRegistroActividad } from "@/app/actions/registrosActividad";
import { openDocument } from "@/lib/pdfViewer";

function formatFecha(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  observado: { className: "bg-amber-50 border-amber-300 text-amber-900", title: "Ya se solicitaron correcciones para esta actividad." },
  aprobado: { className: "bg-emerald-50 border-emerald-300 text-emerald-900", title: "Esta actividad ya fue aprobada." },
};

export default function RevisionActividadClient({ data, propuestaId }: { data: any; propuestaId: string }) {
  const router = useRouter();
  const { actividad, registro, egresado } = data;

  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeRevisar = registro.estado === "enviado";
  const banner = ESTADO_BANNER[registro.estado as string];

  const handleAprobar = async () => {
    if (!confirm("¿Confirma que aprueba esta actividad?")) return;
    setError(null);
    setLoading(true);
    const res = await aprobarRegistroActividad(actividad.id, comentario.trim() || undefined);
    setLoading(false);
    if (res.success) {
      router.push(`/asesor/seguimiento/${propuestaId}`);
    } else {
      setError(res.error || "No se pudo aprobar la actividad.");
    }
  };

  const handleSolicitarCorreccion = async () => {
    setError(null);
    if (comentario.trim().length < 5) {
      setError("Debe escribir una observación técnica detallada antes de solicitar correcciones.");
      return;
    }
    setLoading(true);
    const res = await solicitarCorreccionRegistroActividad(actividad.id, comentario.trim());
    setLoading(false);
    if (res.success) {
      router.push(`/asesor/seguimiento/${propuestaId}`);
    } else {
      setError(res.error || "No se pudo registrar la observación.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Actividad {actividad.codigo}</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            {egresado?.nombreCompleto} ({egresado?.carnet}) — {actividad.titulo}
          </p>
        </div>
        <Link
          href={`/asesor/seguimiento/${propuestaId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {banner && <div className={`p-4 rounded-xl border text-xs font-bold ${banner.className}`}>{banner.title}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Datos de la Actividad
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Código</span><span className="font-mono font-bold text-slate-800">{actividad.codigo}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Título</span><span className="font-bold text-slate-800">{actividad.titulo || "—"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Fecha de realización</span><span className="font-bold text-slate-800">{formatFecha(registro.fecha)}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Enviado</span><span className="font-bold text-slate-800">{formatFecha(registro.enviadoEn)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Marco Teórico y Referencia
        </h2>
        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{registro.marcoTeorico}</p>
        <div className="pt-2 border-t border-slate-100">
          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cita APA 7</span>
          <p className="text-xs text-slate-700 font-medium italic whitespace-pre-wrap">{registro.citaApa}</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Descripción de la Actividad Realizada
        </h2>
        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{registro.descriptor}</p>
      </div>

      {registro.imagenUrl && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
            Imagen de Soporte
          </h2>
          <div className="flex items-start gap-4">
            <img
              src={registro.imagenUrl}
              alt={registro.leyendaImagen || "evidencia"}
              className="w-32 h-32 object-cover rounded-lg border border-slate-200 cursor-pointer"
              onClick={() => openDocument(registro.imagenUrl)}
            />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Imagen N° {registro.numeroImagen}</p>
              <p className="text-xs text-slate-600 font-medium italic">{registro.leyendaImagen || "Sin pie de imagen"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Conclusión Técnica
        </h2>
        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">
          {registro.conclusionTecnica || "El estudiante no registró conclusión técnica para esta actividad."}
        </p>
      </div>

      {puedeRevisar && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
            Comentario Técnico
          </h2>
          <textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Observaciones sobre el marco teórico, la referencia APA, el descriptor o la evidencia. Obligatorio si solicitas correcciones."
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={handleSolicitarCorreccion}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              Solicitar correcciones
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleAprobar}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              Aprobar actividad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
