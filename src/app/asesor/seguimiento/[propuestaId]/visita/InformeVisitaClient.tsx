"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reducirImagen } from "@/lib/reducirImagen";
import {
  guardarInformeVisita,
  subirFotoVisita,
  eliminarFotoVisita,
  subirAutorizacionVisita,
  eliminarAutorizacionVisita,
} from "@/app/actions/informeVisita";
import CuentaRegresivaVisita from "@/components/CuentaRegresivaVisita";
import { openDocument } from "@/lib/pdfViewer";
import {
  SECCIONES_VISITA,
  REGLAS_FOTOS_VISITA,
  MAX_FOTOS_VISITA,
  OTRO,
  idExplicacion,
  requiereExplicacion,
  preguntaVisible,
  seccionVisible,
  visitaRealizada,
  esVisitaVirtual,
  validarInformeVisita,
  type cuentaRegresivaVisita,
  type AutorizacionVisita,
  type PreguntaVisita,
  type Respuestas,
  type FotoVisita,
} from "@/lib/formularioVisita";

const inputClass =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-50 disabled:text-slate-600";

export default function InformeVisitaClient({
  propuestaId,
  datos,
  cuentaRegresiva,
  autorizacion,
  estado,
  respuestasIniciales,
  fotos,
  completadoEn,
  puedeEditar,
}: {
  propuestaId: number;
  datos: { tipoTrabajo: string; egresado: string; carnet: string; asesor: string; empresa: string; supervisor: string; cargoSupervisor: string };
  cuentaRegresiva: ReturnType<typeof cuentaRegresivaVisita>;
  autorizacion: AutorizacionVisita | null;
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
  const pendientesCliente = validarInformeVisita(respuestas, fotos, autorizacion);
  const [subiendoAutorizacion, setSubiendoAutorizacion] = useState(false);

  const cambiar = (id: string, valor: string | string[]) => setRespuestas((prev) => ({ ...prev, [id]: valor }));

  const alternarMultiple = (id: string, opcion: string) => {
    const actual = Array.isArray(respuestas[id]) ? (respuestas[id] as string[]) : [];
    // Una opción exclusiva (por ejemplo, "Ninguna") reemplaza a las demás, y elegir otra la quita.
    const exclusiva = SECCIONES_VISITA.flatMap((s) => s.preguntas).find((p) => p.id === id)?.exclusiva;
    if (actual.includes(opcion)) return cambiar(id, actual.filter((x) => x !== opcion));
    if (exclusiva && opcion === exclusiva) return cambiar(id, [opcion]);
    cambiar(id, [...actual.filter((x) => x !== exclusiva), opcion]);
  };

  const adjuntarAutorizacion = async (archivo: File) => {
    setMensaje(null);
    setSubiendoAutorizacion(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    const res = await subirAutorizacionVisita(propuestaId, fd);
    setSubiendoAutorizacion(false);
    if (res.success) router.refresh();
    else setMensaje({ tipo: "error", texto: res.error || "No se pudo adjuntar el correo de autorización." });
  };

  const quitarAutorizacion = async () => {
    if (!confirm("¿Eliminar el correo de autorización?")) return;
    const res = await eliminarAutorizacionVisita(propuestaId);
    if (res.success) router.refresh();
    else setMensaje({ tipo: "error", texto: res.error || "No se pudo eliminar el archivo." });
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
    fd.append("archivo", await reducirImagen(fotoPendiente, "visita.jpg"));
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
        {p.requerida && <span className="text-unicaes"> *</span>}
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
                  className="mt-0.5 accent-unicaes"
                />
                <span>{o}</span>
              </label>
            ))}
          </div>
          {campoOtro(seleccion.includes(OTRO))}
          {requiereExplicacion(p, respuestas) && (
            <label className="block pt-1.5 space-y-1 max-w-2xl">
              <span className="block text-[11px] font-bold text-slate-700">
                Explique la respuesta<span className="text-unicaes"> *</span>
              </span>
              <textarea
                rows={2}
                value={(respuestas[idExplicacion(p)] as string) || ""}
                disabled={deshabilitado}
                onChange={(e) => cambiar(idExplicacion(p), e.target.value)}
                placeholder="Describa brevemente por qué eligió esta respuesta."
                lang="es"
                spellCheck
                className={`${inputClass} font-medium resize-none`}
              />
            </label>
          )}
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
        {cuentaRegresiva && <CuentaRegresivaVisita cuenta={cuentaRegresiva} />}
      </div>

      {SECCIONES_VISITA.filter((s) => seccionVisible(s, respuestas)).map((s) => (
        <div key={s.titulo} className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold text-card-dark uppercase tracking-wide border-b border-slate-100 pb-2">{s.titulo}</h2>
          {s.preguntas.filter((p) => preguntaVisible(p, respuestas)).map(renderPregunta)}
          {s.preguntas.some((p) => p.id === "modalidad") && esVisitaVirtual(respuestas) && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Correo de autorización del decanato para la visita virtual<span className="text-unicaes"> *</span>
              </p>
              <p className="text-[11px] text-slate-600 font-semibold">Adjunte el correo en PDF o una captura (PNG o JPG), máximo 5 MB.</p>
              {autorizacion ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openDocument(autorizacion.url)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Ver {autorizacion.nombre}
                  </button>
                  {puedeEditar && (
                    <button type="button" onClick={quitarAutorizacion} className="text-[11px] font-bold text-red-600 hover:text-red-700">
                      Eliminar
                    </button>
                  )}
                </div>
              ) : puedeEditar ? (
                <label
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-[11px] font-bold transition-colors ${
                    subiendoAutorizacion ? "bg-slate-100 text-slate-400" : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                  }`}
                >
                  {subiendoAutorizacion ? "Adjuntando..." : "Adjuntar correo de autorización"}
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="hidden"
                    disabled={subiendoAutorizacion}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) adjuntarAutorizacion(archivo);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <p className="text-[11px] text-red-700 font-semibold">Falta el correo de autorización.</p>
              )}
            </div>
          )}
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
                    className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-bold disabled:opacity-50"
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
              className="px-6 py-3 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-md disabled:opacity-50"
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
