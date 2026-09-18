"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aprobarInformeMensual, solicitarCorreccionInformeMensual } from "@/app/actions/informesMensuales";
import { openDocument } from "@/lib/pdfViewer";

function formatFecha(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  observado: { className: "bg-amber-50 border-amber-300 text-amber-900", title: "✏️ Se solicitaron correcciones a este informe." },
  aprobado: { className: "bg-emerald-50 border-emerald-300 text-emerald-900", title: "✅ Este informe ya fue aprobado." },
};

export default function RevisionInformeMensualClient({ data }: { data: any }) {
  const router = useRouter();
  const { informe, propuesta, egresado, empresa, supervisor, actividades, justificadas, semanas, bitacoras, evidencias } = data;

  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const justificadasPorSemana = new Map<number, string>(justificadas.map((j: any) => [j.semana, j.justificacion]));
  const textosPorSemana = new Map<number, string>(bitacoras.map((b: any) => [b.semana, b.descripcion]));
  const evidenciasPorSemana = new Map<number, any[]>();
  for (const e of evidencias) {
    if (!evidenciasPorSemana.has(e.semana)) evidenciasPorSemana.set(e.semana, []);
    evidenciasPorSemana.get(e.semana)!.push(e);
  }

  const puedeRevisar = informe.estado === "enviado";

  const handleAprobar = async () => {
    if (!confirm("¿Confirmas que apruebas este informe mensual?")) return;
    setError(null);
    setLoading(true);
    const res = await aprobarInformeMensual(informe.id, comentario.trim() || undefined);
    setLoading(false);
    if (res.success) {
      router.push(`/asesor/informes/mensual/${propuesta.id}`);
    } else {
      setError(res.error || "No se pudo aprobar el informe.");
    }
  };

  const handleSolicitarCorreccion = async () => {
    setError(null);
    if (comentario.trim().length < 5) {
      setError("Debe escribir una observación detallada antes de solicitar correcciones.");
      return;
    }
    setLoading(true);
    const res = await solicitarCorreccionInformeMensual(informe.id, comentario.trim());
    setLoading(false);
    if (res.success) {
      router.push(`/asesor/informes/mensual/${propuesta.id}`);
    } else {
      setError(res.error || "No se pudo registrar la observación.");
    }
  };

  const banner = ESTADO_BANNER[informe.estado as string];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Informe Mensual #{informe.numero}</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            {egresado?.nombreCompleto} ({egresado?.carnet}) — Pasantía como Trabajo de Graduación
          </p>
        </div>
        <Link
          href={`/asesor/informes/mensual/${propuesta.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          ← Volver a Informes
        </Link>
      </div>

      {banner && <div className={`p-4 rounded-xl border-2 text-xs font-bold ${banner.className}`}>{banner.title}</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Datos Generales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Estudiante</span><span className="font-bold text-slate-800">{egresado?.nombreCompleto}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Carnet</span><span className="font-bold text-slate-800">{egresado?.carnet}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Empresa</span><span className="font-bold text-slate-800">{empresa?.nombre || "—"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Supervisor Empresarial</span><span className="font-bold text-slate-800">{supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "—"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Periodo reportado</span><span className="font-bold text-slate-800">{formatFecha(informe.periodoDesde)} — {formatFecha(informe.periodoHasta)}</span></div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Fecha de presentación</span>
            <span className="font-bold text-slate-800">{formatFecha(informe.fechaPresentacion)}</span>
            {informe.cumplimiento && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${informe.cumplimiento === "a_tiempo" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {informe.cumplimiento === "a_tiempo" ? "A Tiempo" : "Fuera de Tiempo"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Cronograma de Actividades del Periodo (Mes {informe.numero})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2 px-3 rounded-l-lg">Semana</th>
                <th className="py-2 px-3 rounded-r-lg">Actividades planificadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {semanas.map((s: number) => {
                const acts = actividades.filter((a: any) => a.semana === s);
                const justificacion = justificadasPorSemana.get(s);
                return (
                  <tr key={s}>
                    <td className="py-2.5 px-3 font-extrabold text-slate-700 align-top">Semana {s}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {justificacion ? (
                        <span className="italic text-amber-700">Semana justificada: {justificacion}</span>
                      ) : (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {acts.map((a: any) => (
                            <li key={a.id}>{a.titulo || a.descripcion}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Desarrollo de Actividades y Elementos de Soporte
        </h2>
        {semanas.filter((s: number) => !justificadasPorSemana.has(s)).map((s: number) => (
          <div key={s} className="p-4 bg-slate-50 border border-border rounded-xl space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800">Semana {s}</h3>
            <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">
              {textosPorSemana.get(s) || <span className="text-slate-400 italic">Sin desarrollo redactado.</span>}
            </p>

            {(evidenciasPorSemana.get(s) || []).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(evidenciasPorSemana.get(s) || []).map((ev: any) => (
                  <img
                    key={ev.id}
                    src={ev.archivoUrl}
                    alt={ev.nombreArchivo || "evidencia"}
                    className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer"
                    onClick={() => openDocument(ev.archivoUrl)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {puedeRevisar && (
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
            Comentarios u observaciones (para el decanato / el estudiante)
          </h2>
          <textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cualquier información relevante sobre el proceso desarrollado por el estudiante, su desempeño y su grado de avance. Obligatorio si solicitas correcciones."
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none"
          />

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={handleSolicitarCorreccion}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              ✏️ Solicitar Correcciones
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleAprobar}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              ✅ Aprobar Informe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
