"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  guardarRegistroActividad,
  enviarRegistroActividad,
  uploadImagenRegistroActividad,
  deleteImagenRegistroActividad,
} from "@/app/actions/registrosActividad";
import { openDocument } from "@/lib/pdfViewer";

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function toDateInputValue(d: string | Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  enviado: { className: "bg-blue-50 border-blue-200 text-blue-900", title: "Esta actividad fue enviada y está en revisión por su docente asesor." },
  observado: { className: "bg-amber-50 border-amber-300 text-amber-900", title: "Su docente asesor solicitó correcciones en esta actividad." },
  aprobado: { className: "bg-emerald-50 border-emerald-200 text-emerald-900", title: "Esta actividad fue revisada y aprobada por su docente asesor." },
};

export default function RegistroActividadClient({ data }: { data: any }) {
  const router = useRouter();
  const { actividad, registro, estadoGrupo } = data;

  const bloqueadaPorSemana = estadoGrupo === "bloqueada";
  const isLocked = registro.estado === "enviado" || registro.estado === "aprobado" || bloqueadaPorSemana;

  const [fecha, setFecha] = useState(toDateInputValue(registro.fecha));
  const [descriptor, setDescriptor] = useState(registro.descriptor || "");
  const [marcoTeorico, setMarcoTeorico] = useState(registro.marcoTeorico || "");
  const [citaApa, setCitaApa] = useState(registro.citaApa || "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leyenda, setLeyenda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const nPalabras = contarPalabras(descriptor);
  const palabrasOk = nPalabras >= 401 && nPalabras <= 500;

  const handleGuardar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving(true);
    const res = await guardarRegistroActividad(actividad.id, { fecha: fecha || null, descriptor, marcoTeorico, citaApa });
    setSaving(false);
    if (res.success) {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    } else {
      setError(res.error || "No se pudo guardar el borrador.");
    }
  };

  const handleEnviar = async () => {
    if (!confirm("¿Confirma que desea enviar esta actividad a su docente asesor? No podrá editarla mientras se encuentre en revisión.")) return;
    setError(null);
    setOkMsg(null);
    await guardarRegistroActividad(actividad.id, { fecha: fecha || null, descriptor, marcoTeorico, citaApa });
    setSending(true);
    const res = await enviarRegistroActividad(actividad.id);
    setSending(false);
    if (res.success) {
      router.push("/egresado/reportes");
    } else {
      setError(res.error || "No se pudo enviar la actividad.");
    }
  };

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("leyenda", leyenda.trim());
    const res = await uploadImagenRegistroActividad(actividad.id, fd);
    setUploading(false);
    if (!res.success) {
      setError(res.error || "No se pudo subir la imagen.");
    } else {
      setLeyenda("");
      router.refresh();
    }
  };

  const handleDeleteImagen = async () => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const res = await deleteImagenRegistroActividad(actividad.id);
    if (res.success) router.refresh();
  };

  const banner = bloqueadaPorSemana ? null : ESTADO_BANNER[registro.estado as string];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Actividad {actividad.codigo}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">{actividad.titulo || actividad.descripcion}</p>
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {bloqueadaPorSemana && (
        <div className="p-4 rounded-xl border bg-slate-100 border-slate-300 text-slate-600 text-xs font-bold">
          Esta actividad pertenece a una semana que aún no está habilitada. Debe completar y enviar todas las actividades de su
          semana actual primero.
        </div>
      )}
      {banner && <div className={`p-4 rounded-xl border text-xs font-bold ${banner.className}`}>{banner.title}</div>}

      {registro.comentarioAsesor && (
        <div className="p-4 bg-white border-2 border-amber-300 rounded-xl space-y-1.5">
          <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Observaciones del asesor</h3>
          <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{registro.comentarioAsesor}</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}
      {okMsg && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">{okMsg}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Datos de la Actividad (Gantt)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Código</span><span className="font-mono font-bold text-slate-800">{actividad.codigo}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Título</span><span className="font-bold text-slate-800">{actividad.titulo || "—"}</span></div>
          <div className="sm:col-span-2"><span className="block text-slate-400 font-bold uppercase text-[10px]">Descripción planificada</span><span className="font-medium text-slate-700">{actividad.descripcion}</span></div>
        </div>
        <div className="space-y-1 pt-2 border-t border-slate-100 max-w-xs">
          <label className="block text-[10px] font-bold uppercase text-slate-400">Fecha de realización</label>
          <input
            type="date"
            value={fecha}
            disabled={isLocked}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Marco Teórico
        </h2>
        <textarea
          rows={4}
          value={marcoTeorico}
          disabled={isLocked}
          onChange={(e) => setMarcoTeorico(e.target.value)}
          placeholder="Fundamento teórico relacionado con esta actividad, previo a la descripción..."
          className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500"
        />
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase text-slate-400">Cita / Referencia (formato APA 7)</label>
          <textarea
            rows={2}
            value={citaApa}
            disabled={isLocked}
            onChange={(e) => setCitaApa(e.target.value)}
            placeholder="Apellido, A. A. (Año). Título de la obra. Editorial."
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Descriptor de la Actividad</h2>
          <span className={`text-[11px] font-extrabold ${palabrasOk ? "text-emerald-600" : "text-amber-600"}`}>
            {nPalabras} / 401–500 palabras
          </span>
        </div>
        <textarea
          rows={10}
          value={descriptor}
          disabled={isLocked}
          onChange={(e) => setDescriptor(e.target.value)}
          placeholder="Describa con detalle lo realizado en esta actividad (401 a 500 palabras)."
          className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Imagen de Soporte (Opcional)</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Formato PNG recomendado; se presenta a 5 x 5 cm en el informe.</p>
        </div>
        {!isLocked && !registro.imagenUrl && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400">Pie de imagen</label>
              <input
                type="text"
                value={leyenda}
                maxLength={255}
                onChange={(e) => setLeyenda(e.target.value)}
                placeholder="Descripción breve de la imagen"
                className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none"
              />
            </div>
            <label
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                uploading ? "bg-slate-100 text-slate-400" : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {uploading ? "Subiendo..." : "Adjuntar imagen"}
              <input
                type="file"
                accept="image/png,image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {registro.imagenUrl ? (
          <div className="flex items-start gap-4">
            <img
              src={registro.imagenUrl}
              alt={registro.leyendaImagen || "evidencia"}
              className="w-32 h-32 object-cover rounded-lg border border-slate-200 cursor-pointer"
              onClick={() => openDocument(registro.imagenUrl)}
            />
            <div className="flex-1 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Imagen N° {registro.numeroImagen}
              </p>
              <p className="text-xs text-slate-600 font-medium italic">
                {registro.leyendaImagen || "Sin pie de imagen"}
              </p>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleDeleteImagen}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700"
                >
                  Eliminar imagen
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-semibold">Sin imagen adjunta.</p>
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
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={saving || sending}
            className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Enviar actividad al asesor"}
          </button>
        </div>
      )}
    </div>
  );
}
