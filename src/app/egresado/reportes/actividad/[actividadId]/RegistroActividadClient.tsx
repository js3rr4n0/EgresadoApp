"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  guardarRegistroActividad,
  uploadImagenRegistroActividad,
  deleteImagenRegistroActividad,
} from "@/app/actions/registrosActividad";
import { openDocument } from "@/lib/pdfViewer";
import {
  contarPalabras,
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
} from "@/lib/reglasRegistroActividad";
import { EJEMPLOS_REGISTRO } from "@/lib/ejemplosInforme";
import AyudaEjemplo from "@/components/AyudaEjemplo";
import RecortadorImagen from "./RecortadorImagen";

function formatoFecha(d: string | Date | null) {
  if (!d) return null;
  return new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  enviado: { className: "bg-blue-50 border-blue-200 text-blue-900", title: "Esta actividad fue enviada y está en revisión por su asesor designado." },
  observado: { className: "bg-amber-50 border-amber-300 text-amber-900", title: "Su asesor designado solicitó correcciones en esta actividad." },
  aprobado: { className: "bg-emerald-50 border-emerald-200 text-emerald-900", title: "Esta actividad fue revisada y aprobada por su asesor designado." },
};

const tarjeta = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3";
const tituloTarjeta = "text-sm font-extrabold text-slate-900 uppercase tracking-wide";
const areaTexto =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500";

export default function RegistroActividadClient({ data }: { data: any }) {
  const router = useRouter();
  const { actividad, registro, estadoGrupo, semana } = data;

  const bloqueadaPorSemana = estadoGrupo === "bloqueada";
  const isLocked = registro.estado === "enviado" || registro.estado === "aprobado" || bloqueadaPorSemana;

  const [descriptor, setDescriptor] = useState(registro.descriptor || "");
  const [marcoTeorico, setMarcoTeorico] = useState(registro.marcoTeorico || "");
  const [citaApa, setCitaApa] = useState(registro.citaApa || "");
  const [conclusionTecnica, setConclusionTecnica] = useState(registro.conclusionTecnica || "");
  const [leyendaImagen, setLeyendaImagen] = useState(registro.leyendaImagen || "");
  const [saving, setSaving] = useState<"borrador" | "siguiente" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [archivoPorRecortar, setArchivoPorRecortar] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const nPalabras = contarPalabras(descriptor);
  const palabrasOk = nPalabras >= DESCRIPTOR_MIN_PALABRAS && nPalabras <= DESCRIPTOR_MAX_PALABRAS;
  const nConclusion = contarPalabras(conclusionTecnica);
  const conclusionOk = nConclusion >= CONCLUSION_MIN_PALABRAS && nConclusion <= CONCLUSION_MAX_PALABRAS;

  const fechaRegistro = formatoFecha(registro.fecha);
  const siguienteId: number | null = semana?.siguienteId ?? null;

  const guardar = async () =>
    guardarRegistroActividad(actividad.id, { descriptor, marcoTeorico, citaApa, conclusionTecnica, leyendaImagen });

  const handleGuardar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving("borrador");
    const res = await guardar();
    setSaving(null);
    if (res.success) {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    } else {
      setError(res.error || "No se pudo guardar el borrador.");
    }
  };

  const handleGuardarYContinuar = async () => {
    setError(null);
    setOkMsg(null);
    setSaving("siguiente");
    const res = await guardar();
    if (!res.success) {
      setSaving(null);
      setError(res.error || "No se pudo guardar la actividad.");
      return;
    }
    router.push(siguienteId ? `/egresado/reportes/actividad/${siguienteId}` : "/egresado/reportes");
  };

  const handleUpload = async (imagen: Blob, pie: string) => {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("archivo", new File([imagen], "soporte.png", { type: "image/png" }));
    fd.append("leyenda", pie);
    const res = await uploadImagenRegistroActividad(actividad.id, fd);
    setUploading(false);
    if (!res.success) {
      setError(res.error || "No se pudo subir la imagen.");
    } else {
      setArchivoPorRecortar(null);
      setLeyendaImagen(pie);
      router.refresh();
    }
  };

  const handleDeleteImagen = async () => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const res = await deleteImagenRegistroActividad(actividad.id);
    if (res.success) {
      setLeyendaImagen("");
      router.refresh();
    }
  };

  const banner = bloqueadaPorSemana ? null : ESTADO_BANNER[registro.estado as string];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Actividad {actividad.codigo}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">{actividad.titulo || actividad.descripcion}</p>
          {semana && (
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Actividad {semana.posicion} de {semana.total} de la Semana {semana.semana}, Mes {semana.periodo}
            </p>
          )}
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver a la semana
        </Link>
      </div>

      {bloqueadaPorSemana && (
        <div className="p-4 rounded-xl border bg-slate-100 border-slate-300 text-slate-600 text-xs font-bold">
          Esta actividad pertenece a una semana que aún no está habilitada. La semana siguiente se habilita cuando su asesor designado
          aprueba las actividades de la semana actual.
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

      <div className={tarjeta}>
        <h2 className={`${tituloTarjeta} border-b border-slate-100 pb-2`}>Datos de la Actividad (Gantt)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Código</span><span className="font-mono font-bold text-slate-800">{actividad.codigo}</span></div>
          <div><span className="block text-slate-400 font-bold uppercase text-[10px]">Título</span><span className="font-bold text-slate-800">{actividad.titulo || "—"}</span></div>
          <div className="sm:col-span-2"><span className="block text-slate-400 font-bold uppercase text-[10px]">Descripción planificada</span><span className="font-medium text-slate-700">{actividad.descripcion}</span></div>
          <div className="sm:col-span-2">
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Fecha de realización</span>
            <span className="font-bold text-slate-800">{fechaRegistro || "Se registra automáticamente al enviar la semana"}</span>
          </div>
        </div>
      </div>

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Marco teórico correspondiente a la actividad realizada</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Fundamente teóricamente la actividad que realizó.</p>
        </div>
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.marcoTeorico} />
        <textarea
          rows={4}
          value={marcoTeorico}
          disabled={isLocked}
          onChange={(e) => setMarcoTeorico(e.target.value)}
          placeholder="Fundamento teórico que respalda la actividad realizada..."
          lang="es"
          spellCheck
          className={areaTexto}
        />
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase text-slate-400">Cita / Referencia (formato APA 7)</label>
          <textarea
            rows={2}
            value={citaApa}
            disabled={isLocked}
            onChange={(e) => setCitaApa(e.target.value)}
            placeholder="Apellido, A. A. (Año). Título de la obra. Editorial."
            lang="es"
          spellCheck
          className={areaTexto}
          />
        </div>
      </div>

      <div className={tarjeta}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Descripción de la actividad realizada por el pasante</h2>
          <span className={`text-[11px] font-extrabold shrink-0 ${palabrasOk ? "text-emerald-600" : "text-amber-600"}`}>
            {nPalabras} / {DESCRIPTOR_MIN_PALABRAS}–{DESCRIPTOR_MAX_PALABRAS} palabras
          </span>
        </div>
        <p className="text-[11px] text-slate-600 font-semibold">
          Reporte lo que usted realizó. Redáctelo en tiempo pasado (por ejemplo: &quot;el pasante elaboró, revisó, presentó...&quot;).
        </p>
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.descripcion} />
        <textarea
          rows={10}
          value={descriptor}
          disabled={isLocked}
          onChange={(e) => setDescriptor(e.target.value)}
          placeholder={`Describa con detalle lo que usted realizó en esta actividad, en tiempo pasado (${DESCRIPTOR_MIN_PALABRAS} a ${DESCRIPTOR_MAX_PALABRAS} palabras).`}
          lang="es"
          spellCheck
          className={areaTexto}
        />
      </div>

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Imagen de soporte (opcional)</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Se recorta a 5 x 5 cm para el informe. Toda imagen requiere su pie de imagen.
          </p>
        </div>
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.imagen} />

        {!isLocked && !registro.imagenUrl && (
          <label
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
              uploading ? "bg-slate-100 text-slate-400" : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            Seleccionar imagen
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setArchivoPorRecortar(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {registro.imagenUrl ? (
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={registro.imagenUrl}
              alt={registro.leyendaImagen || "evidencia"}
              className="w-32 h-32 object-cover rounded-lg border border-slate-200 cursor-pointer"
              onClick={() => openDocument(registro.imagenUrl)}
            />
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Imagen N° {registro.numeroImagen}</p>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Pie de imagen</label>
                <input
                  type="text"
                  value={leyendaImagen}
                  maxLength={255}
                  disabled={isLocked}
                  onChange={(e) => setLeyendaImagen(e.target.value)}
                  placeholder="Descripción breve de la imagen"
                  className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                {leyendaImagen.trim().length < 3 && (
                  <p className="text-[11px] text-amber-700 font-semibold">El pie de imagen es obligatorio para poder enviar la semana.</p>
                )}
              </div>
              {!isLocked && (
                <button type="button" onClick={handleDeleteImagen} className="text-[11px] font-bold text-red-600 hover:text-red-700">
                  Eliminar imagen
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-semibold">Sin imagen adjunta.</p>
        )}
      </div>

      <div className={tarjeta}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Conclusión técnica de la actividad</h2>
          <span className={`text-[11px] font-extrabold shrink-0 ${conclusionOk ? "text-emerald-600" : "text-amber-600"}`}>
            {nConclusion} / máx. {CONCLUSION_MAX_PALABRAS} palabras
          </span>
        </div>
        <p className="text-[11px] text-slate-600 font-semibold">
          Indique el resultado técnico obtenido y su fundamento. No incluya opiniones ni valoraciones personales.
        </p>
        <AyudaEjemplo ejemplo={EJEMPLOS_REGISTRO.conclusion} />
        <textarea
          rows={5}
          value={conclusionTecnica}
          disabled={isLocked}
          onChange={(e) => setConclusionTecnica(e.target.value)}
          placeholder="Conclusión técnica derivada de la actividad realizada..."
          lang="es"
          spellCheck
          className={areaTexto}
        />
      </div>

      {!isLocked && (
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving !== null}
            className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50"
          >
            {saving === "borrador" ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            type="button"
            onClick={handleGuardarYContinuar}
            disabled={saving !== null}
            className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saving === "siguiente"
              ? "Guardando..."
              : siguienteId
                ? `Guardar y pasar a la siguiente actividad (${semana.siguienteCodigo})`
                : "Guardar y volver a la semana"}
          </button>
        </div>
      )}
      {!isLocked && (
        <p className="text-right text-[11px] text-slate-500 font-semibold">
          Las actividades se envían al asesor todas juntas, una vez completadas las de la semana, desde la pantalla de seguimiento.
        </p>
      )}

      {archivoPorRecortar && (
        <RecortadorImagen
          archivo={archivoPorRecortar}
          enviando={uploading}
          onCancelar={() => setArchivoPorRecortar(null)}
          onConfirmar={handleUpload}
        />
      )}
    </div>
  );
}
