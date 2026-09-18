"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  guardarBorradorInformeMensual,
  enviarInformeMensual,
  uploadEvidenciaInformeMensual,
  deleteEvidenciaInformeMensual,
} from "@/app/actions/informesMensuales";
import { openDocument } from "@/lib/pdfViewer";

function formatFecha(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

function toDateInputValue(d: string | Date | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  enviado: {
    className: "bg-blue-50 border-blue-300 text-blue-900",
    title: "📨 Este informe fue enviado y está en revisión por tu docente asesor.",
  },
  observado: {
    className: "bg-amber-50 border-amber-300 text-amber-900",
    title: "✏️ Tu docente asesor solicitó correcciones en este informe.",
  },
  aprobado: {
    className: "bg-emerald-50 border-emerald-300 text-emerald-900",
    title: "✅ Este informe fue revisado y aprobado por tu docente asesor.",
  },
};

export default function InformeMensualClient({ data }: { data: any }) {
  const router = useRouter();
  const { informe, egresado, asesor, empresa, supervisor, actividades, justificadas, semanas, bitacoras, evidencias } = data;

  const isLocked = informe.estado === "enviado" || informe.estado === "aprobado";

  const [periodoDesde, setPeriodoDesde] = useState(toDateInputValue(informe.periodoDesde));
  const [periodoHasta, setPeriodoHasta] = useState(toDateInputValue(informe.periodoHasta));
  const [textos, setTextos] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const b of bitacoras) map[b.semana] = b.descripcion || "";
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingSemana, setUploadingSemana] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const justificadasPorSemana = new Map<number, string>(justificadas.map((j: any) => [j.semana, j.justificacion]));
  const actividadesPorSemana = new Map<number, any[]>();
  for (const a of actividades) {
    if (!actividadesPorSemana.has(a.semana)) actividadesPorSemana.set(a.semana, []);
    actividadesPorSemana.get(a.semana)!.push(a);
  }
  const evidenciasPorSemana = new Map<number, any[]>();
  for (const e of evidencias) {
    if (!evidenciasPorSemana.has(e.semana)) evidenciasPorSemana.set(e.semana, []);
    evidenciasPorSemana.get(e.semana)!.push(e);
  }

  const handleGuardar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving(true);
    const res = await guardarBorradorInformeMensual(informe.id, {
      periodoDesde: periodoDesde || null,
      periodoHasta: periodoHasta || null,
      bitacoras: semanas.map((s: number) => ({ semana: s, descripcion: textos[s] || "" })),
    });
    setSaving(false);
    if (res.success) {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    } else {
      setError(res.error || "No se pudo guardar el borrador.");
    }
  };

  const handleEnviar = async () => {
    if (!confirm("¿Confirmas que deseas enviar este informe a tu docente asesor? No podrás editarlo hasta que sea revisado.")) return;
    setError(null);
    setOkMsg(null);
    // Guardar cambios pendientes antes de enviar
    await guardarBorradorInformeMensual(informe.id, {
      periodoDesde: periodoDesde || null,
      periodoHasta: periodoHasta || null,
      bitacoras: semanas.map((s: number) => ({ semana: s, descripcion: textos[s] || "" })),
    });
    setSending(true);
    const res = await enviarInformeMensual(informe.id);
    setSending(false);
    if (res.success) {
      router.push("/egresado/reportes");
    } else {
      setError(res.error || "No se pudo enviar el informe.");
    }
  };

  const handleUpload = async (semana: number, file: File) => {
    setError(null);
    setUploadingSemana(semana);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await uploadEvidenciaInformeMensual(informe.id, semana, fd);
    setUploadingSemana(null);
    if (!res.success) {
      setError(res.error || "No se pudo subir la evidencia.");
    } else {
      router.refresh();
    }
  };

  const handleDeleteEvidencia = async (evidenciaId: number) => {
    if (!confirm("¿Eliminar esta evidencia?")) return;
    const res = await deleteEvidenciaInformeMensual(evidenciaId, informe.id);
    if (res.success) router.refresh();
  };

  const banner = ESTADO_BANNER[informe.estado as string];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Informe Mensual #{informe.numero}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Pasantía como Trabajo de Graduación</p>
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          ← Volver a Reportes
        </Link>
      </div>

      {banner && (
        <div className={`p-4 rounded-xl border-2 text-xs font-bold ${banner.className}`}>{banner.title}</div>
      )}

      {informe.comentarioAsesor && (
        <div className="p-4 bg-white border-2 border-amber-300 rounded-xl space-y-1.5">
          <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
            Comentarios u observaciones del asesor
          </h3>
          <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{informe.comentarioAsesor}</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}
      {okMsg && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">{okMsg}</div>}

      {/* Encabezado del informe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Datos Generales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Estudiante</span><span className="font-bold text-slate-800">{egresado?.nombreCompleto}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Carnet</span><span className="font-bold text-slate-800">{egresado?.carnet}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Asesor</span><span className="font-bold text-slate-800">{asesor?.nombreCompleto || "Sin asignar"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Empresa</span><span className="font-bold text-slate-800">{empresa?.nombre || "—"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Supervisor Empresarial</span><span className="font-bold text-slate-800">{supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "—"}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Cargo</span><span className="font-bold text-slate-800">{supervisor?.cargo || "—"}</span></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Periodo reportado — Desde</label>
            <input
              type="date"
              value={periodoDesde}
              disabled={isLocked}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-slate-400">Periodo reportado — Hasta</label>
            <input
              type="date"
              value={periodoHasta}
              disabled={isLocked}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
        {informe.fechaPresentacion && (
          <p className="text-[11px] text-slate-500 font-semibold">
            Fecha de presentación al asesor: <span className="text-slate-700">{formatFecha(informe.fechaPresentacion)}</span>
            {informe.cumplimiento && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${informe.cumplimiento === "a_tiempo" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {informe.cumplimiento === "a_tiempo" ? "A Tiempo" : "Fuera de Tiempo"}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Cronograma de actividades del periodo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Cronograma de Actividades del Periodo (Mes {informe.numero})
        </h2>
        {semanas.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold">
            No hay actividades registradas en el cronograma de tu plan de trabajo para este mes.
          </p>
        ) : (
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
                  const acts = actividadesPorSemana.get(s) || [];
                  const justificacion = justificadasPorSemana.get(s);
                  return (
                    <tr key={s}>
                      <td className="py-2.5 px-3 font-extrabold text-slate-700 align-top">Semana {s}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {justificacion ? (
                          <span className="italic text-amber-700">Semana justificada: {justificacion}</span>
                        ) : acts.length === 0 ? (
                          <span className="text-slate-400">Sin actividades registradas</span>
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
        )}
      </div>

      {/* Desarrollo de actividades por semana */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Desarrollo de Actividades y Elementos de Soporte
        </h2>

        {semanas.filter((s: number) => !justificadasPorSemana.has(s)).map((s: number) => (
          <div key={s} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800">Actividades realizadas — Semana {s}</h3>
            <textarea
              rows={4}
              value={textos[s] || ""}
              disabled={isLocked}
              onChange={(e) => setTextos((prev) => ({ ...prev, [s]: e.target.value }))}
              placeholder="Describe con detalle lo realizado durante esta semana: actividades, personas con quienes trabajaste, herramientas utilizadas y observaciones relevantes..."
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Evidencia fotográfica</span>
                {!isLocked && (
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${uploadingSemana === s ? "bg-slate-100 text-slate-400" : "bg-brand-red hover:bg-brand-red-hover text-white"}`}>
                    {uploadingSemana === s ? "Subiendo..." : "📎 Adjuntar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingSemana === s}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(s, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              {(evidenciasPorSemana.get(s) || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 font-semibold">Sin evidencia adjunta todavía.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(evidenciasPorSemana.get(s) || []).map((ev: any) => (
                    <div key={ev.id} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <img
                        src={ev.archivoUrl}
                        alt={ev.nombreArchivo || "evidencia"}
                        className="w-full h-24 object-cover cursor-pointer"
                        onClick={() => openDocument(ev.archivoUrl)}
                      />
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvidencia(ev.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {semanas.filter((s: number) => justificadasPorSemana.has(s)).length > 0 && (
          <p className="text-[11px] text-slate-400 font-semibold italic">
            Las semanas justificadas (vacaciones/asuetos) no requieren desarrollo ni evidencia.
          </p>
        )}
      </div>

      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving || sending}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs disabled:opacity-50"
          >
            {saving ? "Guardando..." : "💾 Guardar Borrador"}
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={saving || sending}
            className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {sending ? "Enviando..." : "📨 Enviar Informe al Asesor"}
          </button>
        </div>
      )}
    </div>
  );
}
