"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarInformeVisita, subirFotoVisita, eliminarFotoVisita } from "@/app/actions/informeVisita";
import { openDocument } from "@/lib/pdfViewer";
import { formatearFechaLarga } from "@/lib/periodosPasantia";
import {
  SECCIONES_VISITA,
  REGLAS_FOTOS_VISITA,
  MAX_FOTOS_VISITA,
  OTRO,
  preguntaVisible,
  seccionVisible,
  visitaRealizada,
  validarInformeVisita,
  type PreguntaVisita,
  type Respuestas,
  type FotoVisita,
} from "@/lib/formularioVisita";

const LADO_MAXIMO_FOTO = 1600;

/** Reduce la fotografía a un máximo de 1600 px por lado en JPEG para no almacenar archivos innecesariamente pesados. */
async function reducirFoto(archivo: File): Promise<File> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const factor = Math.min(1, LADO_MAXIMO_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * factor);
    canvas.height = Math.round(img.naturalHeight * factor);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "visita.jpg", { type: "image/jpeg" }) : archivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const inputClass =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-brand-red outline-none disabled:bg-slate-50 disabled:text-slate-600";

export default function InformeVisitaClient({
  propuestaId,
  datos,
  ventanaVisita,
  estado,
  respuestasIniciales,
  fotos,
  completadoEn,
  puedeEditar,
}: {
  propuestaId: number;
  datos: { tipoTrabajo: string; egresado: string; carnet: string; asesor: string; empresa: string; supervisor: string; cargoSupervisor: string };
  ventanaVisita: { inicio: string; fin: string } | null;
  estado: string;
  respuestasIniciales: Respuestas;
  fotos: FotoVisita[];
  completadoEn: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Respuestas>(respuestasIniciales);
  const [guardando, setGuardando] = useState<"borrador" | "completar" | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [fotoPendiente, setFotoPendiente] = useState<File | null>(null);
  const [pieFoto, setPieFoto] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const completado = estado === "completado";
  const pendientesCliente = validarInformeVisita(respuestas, fotos);

  const cambiar = (id: string, valor: string | string[]) => setRespuestas((prev) => ({ ...prev, [id]: valor }));

  const alternarMultiple = (id: string, opcion: string) => {
    const actual = Array.isArray(respuestas[id]) ? (respuestas[id] as string[]) : [];
    cambiar(id, actual.includes(opcion) ? actual.filter((x) => x !== opcion) : [...actual, opcion]);
  };

  const guardar = async (completar: boolean) => {
    setMensaje(null);
    setProblemas([]);
    setGuardando(completar ? "completar" : "borrador");
    const res = await guardarInformeVisita(propuestaId, respuestas, completar);
    setGuardando(null);
    if (res.success) {
      setMensaje({ tipo: "ok", texto: completar ? "Informe de visita completado." : "Borrador guardado." });
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo guardar el informe de visita." });
      if ("problemas" in res && res.problemas) setProblemas(res.problemas);
    }
  };

  const adjuntarFoto = async () => {
    if (!fotoPendiente) return;
    setMensaje(null);
    setSubiendo(true);
    const fd = new FormData();
    fd.append("archivo", await reducirFoto(fotoPendiente));
    fd.append("leyenda", pieFoto.trim());
    const res = await subirFotoVisita(propuestaId, fd);
    setSubiendo(false);
    if (res.success) {
      setFotoPendiente(null);
      setPieFoto("");
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: res.error || "No se pudo adjuntar la fotografía." });
    }
  };

  const quitarFoto = async (indice: number) => {
    if (!confirm("¿Eliminar esta fotografía?")) return;
    const res = await eliminarFotoVisita(propuestaId, indice);
    if (res.success) router.refresh();
    else setMensaje({ tipo: "error", texto: res.error || "No se pudo eliminar la fotografía." });
  };

  const renderPregunta = (p: PreguntaVisita) => {
    const valor = respuestas[p.id];
    const deshabilitado = !puedeEditar;
    const etiqueta = (
      <span className="block text-xs font-bold text-slate-800 mb-1.5">
        {p.texto}
        {p.requerida && <span className="text-brand-red"> *</span>}
      </span>
    );
    const campoOtro = (activo: boolean) =>
      p.otro && activo ? (
        <input
          type="text"
          value={(respuestas[`${p.id}_otro`] as string) || ""}
          disabled={deshabilitado}
          onChange={(e) => cambiar(`${p.id}_otro`, e.target.value)}
          placeholder="Especifique"
          className={`${inputClass} mt-1.5 max-w-md`}
        />
      ) : null;

    if (p.tipo === "opcion" || p.tipo === "multiple") {
      const opciones = [...(p.opciones || []), ...(p.otro ? [OTRO] : [])];
      const seleccion = p.tipo === "multiple" ? (Array.isArray(valor) ? valor : []) : [valor as string];
      return (
        <fieldset key={p.id} className="space-y-1">
          <legend className="contents">{etiqueta}</legend>
          <div className="space-y-1">
            {opciones.map((o) => (
              <label key={o} className="flex items-start gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                <input
                  type={p.tipo === "multiple" ? "checkbox" : "radio"}
                  name={p.id}
                  checked={seleccion.includes(o)}
                  disabled={deshabilitado}
                  onChange={() => (p.tipo === "multiple" ? alternarMultiple(p.id, o) : cambiar(p.id, o))}
                  className="mt-0.5 accent-brand-red"
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {campoOtro(seleccion.includes(OTRO))}
          {p.ayuda && <p className="text-[11px] text-slate-500 font-semibold">{p.ayuda}</p>}
        </fieldset>
      );
    }

    return (
      <label key={p.id} className="block space-y-1">
        {etiqueta}
        {p.tipo === "texto_largo" ? (
          <textarea
            rows={3}
            value={(valor as string) || ""}
            disabled={deshabilitado}
            onChange={(e) => cambiar(p.id, e.target.value)}
            className={`${inputClass} font-medium resize-none`}
          />
        ) : (
          <input
            type={p.tipo === "fecha" ? "date" : "text"}
            value={(valor as string) || ""}
            disabled={deshabilitado}
            onChange={(e) => cambiar(p.id, e.target.value)}
            className={`${inputClass} ${p.tipo === "fecha" ? "max-w-xs" : ""}`}
          />
        )}
        {p.ayuda && <p className="text-[11px] text-slate-500 font-semibold">{p.ayuda}</p>}
      </label>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Informe de visita del asesor</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            Elementos básicos de la visita a la empresa o institución donde el egresado realiza su trabajo de graduación.
          </p>
        </div>
        <Link
          href={`/asesor/seguimiento/${propuestaId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      <div
        className={`p-4 rounded-xl border text-xs font-semibold ${
          completado ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"
        }`}
      >
        {completado
          ? `Informe de visita completado${completadoEn ? ` (${completadoEn})` : ""}.`
          : "Informe de visita pendiente. Es requisito para aprobar el Informe #3 del estudiante."}
        {!puedeEditar && " Solo lectura."}
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">
          Datos del trabajo de graduación
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            ["Tipo de trabajo", datos.tipoTrabajo],
            ["Egresado", datos.egresado],
            ["Carnet", datos.carnet],
            ["Empresa o institución", datos.empresa],
            ["Supervisor empresarial o institucional", datos.supervisor],
            ["Cargo del supervisor", datos.cargoSupervisor],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <span className="block text-slate-400 font-bold uppercase text-[10px]">{etiqueta}</span>
              <span className="font-bold text-slate-800">{valor}</span>
            </div>
          ))}
        </div>
        {ventanaVisita && (
          <p className="text-[11px] text-slate-600 font-semibold">
            Período de visitas de la cohorte: del {formatearFechaLarga(ventanaVisita.inicio)} al {formatearFechaLarga(ventanaVisita.fin)}.
          </p>
        )}
      </div>

      {SECCIONES_VISITA.filter((s) => seccionVisible(s, respuestas)).map((s) => (
        <div key={s.titulo} className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">{s.titulo}</h2>
          {s.preguntas.filter((p) => preguntaVisible(p, respuestas)).map(renderPregunta)}
        </div>
      ))}

      {visitaRealizada(respuestas) && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide">Fotografías de la visita</h2>
            <p className="text-[11px] text-muted font-semibold mt-0.5">
              Máximo {MAX_FOTOS_VISITA} fotografías. Se incluyen en el documento del Informe #3.
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 font-semibold">
            {REGLAS_FOTOS_VISITA.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>

          {fotos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fotos.map((f, i) => (
                <figure key={i} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.leyenda}
                    className="w-full h-44 object-cover rounded-lg cursor-pointer"
                    onClick={() => openDocument(f.url)}
                  />
                  <figcaption className="text-[11px] text-slate-600 italic font-medium">
                    Fotografía {i + 1}. {f.leyenda}
                  </figcaption>
                  {puedeEditar && (
                    <button type="button" onClick={() => quitarFoto(i)} className="text-[11px] font-bold text-red-600 hover:text-red-700">
                      Eliminar fotografía
                    </button>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 font-semibold">Aún no se han adjuntado fotografías.</p>
          )}

          {puedeEditar && fotos.length < MAX_FOTOS_VISITA && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer">
                {fotoPendiente ? "Cambiar fotografía" : "Seleccionar fotografía"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFotoPendiente(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {fotoPendiente && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1 space-y-1">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      Pie de imagen (obligatorio) — {fotoPendiente.name}
                    </span>
                    <input
                      type="text"
                      value={pieFoto}
                      maxLength={255}
                      onChange={(e) => setPieFoto(e.target.value)}
                      placeholder="Ejemplo: Asesor, egresado y supervisor empresarial en las instalaciones de la empresa"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={adjuntarFoto}
                    disabled={subiendo || pieFoto.trim().length < 3}
                    className="px-4 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    {subiendo ? "Adjuntando..." : "Adjuntar fotografía"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mensaje && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold ${
            mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {mensaje.texto}
          {problemas.length > 0 && (
            <ul className="list-disc pl-5 mt-1 font-semibold">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {puedeEditar && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {!completado && (
              <button
                type="button"
                onClick={() => guardar(false)}
                disabled={guardando !== null}
                className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs disabled:opacity-50"
              >
                {guardando === "borrador" ? "Guardando..." : "Guardar borrador"}
              </button>
            )}
            <button
              type="button"
              onClick={() => guardar(true)}
              disabled={guardando !== null}
              className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md disabled:opacity-50"
            >
              {guardando === "completar" ? "Guardando..." : completado ? "Guardar cambios" : "Completar informe de visita"}
            </button>
          </div>
          <p className="text-right text-[11px] text-slate-500 font-semibold">
            {pendientesCliente.length === 0
              ? "Todos los apartados obligatorios están completos."
              : `Faltan ${pendientesCliente.length} apartado${pendientesCliente.length === 1 ? "" : "s"} obligatorio${pendientesCliente.length === 1 ? "" : "s"} para completar el informe.`}
          </p>
        </div>
      )}
    </div>
  );
}
