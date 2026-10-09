"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revisarSemanaActividades, guardarBorradorRevision, type getSemanaRevision } from "@/app/actions/registrosActividad";
import {
  contarPalabras,
  validarContenidoRegistro,
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
} from "@/lib/reglasRegistroActividad";
import { leerDatosCita, segmentosCitaApa } from "@/lib/citaApa";
import { notaImagen } from "@/lib/fuenteImagen";
import {
  contarComentarios,
  textosComentarios,
  MIN_CARACTERES_COMENTARIO,
  type ComentariosSecciones,
  type SeccionRevision,
  type SeccionTexto,
  type MarcaTexto,
  type ObservacionEstandar,
  OBSERVACIONES_ESTANDAR,
} from "@/lib/comentariosRevision";
import { hayCambios } from "@/lib/diffTexto";
import TextoRevisable from "./TextoRevisable";
import { openDocument } from "@/lib/pdfViewer";

type DatosSemana = Extract<Awaited<ReturnType<typeof getSemanaRevision>>, { success: true }>;
type ActividadSemana = DatosSemana["actividades"][number];

const ESTADO_ACTIVIDAD: Record<string, { label: string; badge: string }> = {
  pendiente: { label: "Sin registrar", badge: "bg-slate-50 text-slate-500 border-slate-200" },
  guardado: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Por revisar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const BANNER_SEMANA: Record<DatosSemana["estadoSemana"], { className: string; texto: string }> = {
  por_revisar: {
    className: "bg-blue-50 border-blue-200 text-blue-900",
    texto:
      "El estudiante envió esta semana. Revise cada actividad y comente los apartados que deban mejorar. La semana se aprueba o se devuelve completa.",
  },
  en_correccion: {
    className: "bg-amber-50 border-amber-300 text-amber-900",
    texto: "La semana fue devuelta con observaciones y el estudiante la está corrigiendo. Podrá revisarla de nuevo cuando la reenvíe.",
  },
  en_redaccion: {
    className: "bg-slate-100 border-slate-300 text-slate-700",
    texto:
      "El estudiante aún no envía esta semana. Está viendo el borrador de su avance; la revisión se habilita cuando la envíe completa.",
  },
  aprobada: { className: "bg-emerald-50 border-emerald-200 text-emerald-900", texto: "Esta semana fue revisada y aprobada." },
};

function fechaISO(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fechaCorta(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", year: "numeric", month: "short", day: "numeric" });
}

function Segmentos({ segmentos }: { segmentos: { texto: string; cursiva?: boolean }[] }) {
  return (
    <>
      {segmentos.map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}
    </>
  );
}

function NotaOrigen({ origen, fuente }: { origen: unknown; fuente: unknown }) {
  const nota = notaImagen(origen, fuente);
  if (nota.length === 0) return <p className="text-[11px] text-amber-700 font-semibold">Sin origen indicado.</p>;
  return (
    <p className="text-[11px] text-slate-500 font-medium">
      <Segmentos segmentos={nota} />
    </p>
  );
}

function ConteoPalabras({ texto, minimo, maximo }: { texto: string | null; minimo: number; maximo: number }) {
  const n = texto ? contarPalabras(texto) : 0;
  const ok = n >= minimo && n <= maximo;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-300"
      }`}
    >
      {n} palabras ({minimo}–{maximo})
    </span>
  );
}

export default function RevisionSemanaClient({ data, actividadInicial }: { data: DatosSemana; actividadInicial?: number }) {
  const router = useRouter();
  const { propuestaId, periodo, semana, actividades, estadoSemana } = data;
  const base = `/asesor/seguimiento/${propuestaId}`;
  const puedeRevisar = estadoSemana === "por_revisar";

  const inicial = actividades.find((a) => a.id === actividadInicial)?.id ?? actividades[0]?.id;
  const [seleccionada, setSeleccionada] = useState<number | undefined>(inicial);
  // El borrador guardado de la revisión (si existe) se retoma al abrir la semana.
  const [vistas, setVistas] = useState<Set<number>>(
    () => new Set([...(data.borrador?.vistas ?? []), ...(inicial !== undefined ? [inicial] : [])])
  );
  const [comentarios, setComentarios] = useState<Record<number, ComentariosSecciones>>(() => data.borrador?.comentarios ?? {});
  // Contador de cambios: el guardado automático del borrador compara el último guardado con el actual.
  const [cambios, setCambios] = useState(0);
  const [cambiosGuardados, setCambiosGuardados] = useState(0);
  const [estadoBorrador, setEstadoBorrador] = useState<"guardando" | "error" | null>(null);
  const [borradorGuardadoEn, setBorradorGuardadoEn] = useState<Date | null>(
    data.borrador?.actualizadoEn ? new Date(data.borrador.actualizadoEn) : null
  );
  const [marcaPendiente, setMarcaPendiente] = useState<{ actividadId: number; seccion: SeccionTexto; fragmento: string; texto: string } | null>(
    null
  );
  const [mostrarCambios, setMostrarCambios] = useState(true);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<"aprobar" | "corregir" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actividad = actividades.find((a) => a.id === seleccionada) ?? actividades[0];
  const indice = actividades.findIndex((a) => a.id === actividad?.id);
  const conComentarios = actividades.filter((a) => contarComentarios(comentarios[a.id] ?? {}) > 0);
  const totalComentarios = conComentarios.reduce((t, a) => t + contarComentarios(comentarios[a.id] ?? {}), 0);
  const revisables = actividades.filter((a) => a.estado === "enviado");
  const sinVer = revisables.filter((a) => !vistas.has(a.id));

  const sinGuardar = cambios !== cambiosGuardados;

  const guardarBorrador = async (hasta: number) => {
    setEstadoBorrador("guardando");
    // El temporizador se programa tras cada render, así que comentarios y vistas son los vigentes.
    const res = await guardarBorradorRevision(propuestaId, periodo, semana, { comentarios, vistas: [...vistas] });
    if (res.success) {
      setCambiosGuardados((prev) => Math.max(prev, hasta));
      setBorradorGuardadoEn(res.guardadoEn ? new Date(res.guardadoEn) : new Date());
      setEstadoBorrador(null);
    } else {
      setEstadoBorrador("error");
    }
  };

  // Guardado automático del borrador de la revisión 1.5 s después del último cambio (el egresado no lo ve).
  useEffect(() => {
    if (!puedeRevisar || enviando || cambios === cambiosGuardados) return;
    const temporizador = setTimeout(() => guardarBorrador(cambios), 1500);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cambios, cambiosGuardados, puedeRevisar, enviando]);

  // Evita perder comentarios que aún no se guardaron como borrador.
  useEffect(() => {
    if (!sinGuardar || enviando) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sinGuardar, enviando]);

  const etiquetaDe = (estado: string) =>
    estado === "enviado" && estadoSemana === "en_correccion"
      ? { label: "Sin observaciones", badge: "bg-slate-50 text-slate-600 border-slate-200" }
      : estado === "enviado" && estadoSemana === "en_redaccion"
        ? { label: "Enviada", badge: "bg-slate-50 text-slate-600 border-slate-200" }
        : ESTADO_ACTIVIDAD[estado] || ESTADO_ACTIVIDAD.pendiente;
  const banner = BANNER_SEMANA[estadoSemana];

  const seleccionar = (id: number) => {
    setSeleccionada(id);
    setMarcaPendiente(null);
    if (!vistas.has(id)) {
      setVistas((prev) => new Set(prev).add(id));
      setCambios((c) => c + 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setComentario = (actividadId: number, seccion: SeccionRevision, texto: string) => {
    setComentarios((prev) => ({ ...prev, [actividadId]: { ...prev[actividadId], [seccion]: texto } }));
    setCambios((c) => c + 1);
  };

  const agregarMarca = () => {
    if (!marcaPendiente || marcaPendiente.texto.trim().length < MIN_CARACTERES_COMENTARIO) return;
    const { actividadId, seccion, fragmento, texto } = marcaPendiente;
    const marca: MarcaTexto = { id: `m${Date.now()}`, seccion, fragmento, texto: texto.trim() };
    setComentarios((prev) => ({
      ...prev,
      [actividadId]: { ...prev[actividadId], marcas: [...(prev[actividadId]?.marcas ?? []), marca] },
    }));
    setMarcaPendiente(null);
    setCambios((c) => c + 1);
  };

  const alternarEstandar = (actividadId: number, id: ObservacionEstandar) => {
    setComentarios((prev) => {
      const actuales = prev[actividadId]?.estandar ?? [];
      const estandar = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
      return { ...prev, [actividadId]: { ...prev[actividadId], estandar } };
    });
    setCambios((c) => c + 1);
  };

  const quitarMarca = (actividadId: number, id: string) => {
    setComentarios((prev) => ({
      ...prev,
      [actividadId]: { ...prev[actividadId], marcas: (prev[actividadId]?.marcas ?? []).filter((m) => m.id !== id) },
    }));
    setCambios((c) => c + 1);
  };

  /** Si la actividad cambió desde la revisión anterior (semana reenviada). */
  const cambioDesdeRevision = (a: ActividadSemana) =>
    !!a.versionAnterior &&
    (hayCambios(a.versionAnterior.marcoTeorico, a.marcoTeorico) ||
      hayCambios(a.versionAnterior.citaApa, a.citaApa) ||
      hayCambios(a.versionAnterior.descriptor, a.descriptor) ||
      hayCambios(a.versionAnterior.conclusionTecnica, a.conclusionTecnica) ||
      hayCambios(a.versionAnterior.leyendaImagen, a.leyendaImagen) ||
      !!a.cambiosImagenes?.principal ||
      !!a.cambiosImagenes?.adicionales);

  const alternarAbierto = (clave: string) =>
    setAbiertos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });

  const revisar = async (decision: "aprobar" | "corregir") => {
    setError(null);
    const cortos = conComentarios.some((a) => textosComentarios(comentarios[a.id] ?? {}).some((t) => t.length < MIN_CARACTERES_COMENTARIO));
    if (cortos) {
      setError(`Cada comentario debe tener al menos ${MIN_CARACTERES_COMENTARIO} caracteres.`);
      return;
    }
    if (decision === "corregir" && conComentarios.length === 0) {
      setError("Escriba al menos un comentario en alguna actividad para devolver la semana.");
      return;
    }
    const avisoSinVer = sinVer.length > 0 ? ` Aún no ha abierto ${sinVer.length} actividad${sinVer.length > 1 ? "es" : ""}.` : "";
    const mensaje =
      decision === "aprobar"
        ? `${conComentarios.length > 0 ? "Se aprobará la semana completa y sus comentarios quedarán como retroalimentación para el estudiante." : "¿Confirma que aprueba la semana completa?"}${avisoSinVer}`
        : `Se devolverá la semana al estudiante con ${totalComentarios} comentario${totalComentarios > 1 ? "s" : ""} en ${conComentarios.length} actividad${conComentarios.length > 1 ? "es" : ""}.${avisoSinVer} ¿Continuar?`;
    if (!confirm(mensaje)) return;

    setEnviando(decision);
    const res = await revisarSemanaActividades(
      propuestaId,
      periodo,
      semana,
      decision,
      conComentarios.map((a) => ({ actividadId: a.id, comentarios: comentarios[a.id] }))
    );
    if (res.success) {
      router.push(base);
    } else {
      setEnviando(null);
      setError(res.error || "No se pudo registrar la revisión.");
    }
  };

  /** Apartado de la actividad con su contenido y el comentario del asesor (editable durante la revisión). */
  /** Comentarios sobre frases de un apartado: los de esta revisión (editables) o los ya registrados (solo lectura). */
  const marcasDe = (a: ActividadSemana, seccion: SeccionRevision) => {
    const editable = puedeRevisar && a.estado === "enviado";
    const fuente = editable ? (comentarios[a.id]?.marcas ?? []) : (a.comentariosSecciones.marcas ?? []);
    return fuente.filter((m) => m.seccion === seccion).map((m, i) => ({ ...m, numero: i + 1 }));
  };

  /** Texto de un apartado con resaltado de frases comentadas y comparación con la versión revisada. */
  const textoRevisable = (a: ActividadSemana, seccion: SeccionTexto, texto: string | null, anterior: string | null | undefined) => (
    <TextoRevisable
      texto={texto}
      anterior={a.versionAnterior ? (anterior ?? null) : undefined}
      mostrarCambios={mostrarCambios}
      marcas={marcasDe(a, seccion)}
      editable={puedeRevisar && a.estado === "enviado"}
      onComentarSeleccion={(fragmento) => setMarcaPendiente({ actividadId: a.id, seccion, fragmento, texto: "" })}
    />
  );

  const apartado = (
    a: ActividadSemana,
    seccion: SeccionRevision,
    titulo: string,
    extra: React.ReactNode,
    contenido: React.ReactNode,
    cambio: boolean | null = null
  ) => {
    const clave = `${a.id}.${seccion}`;
    const texto = comentarios[a.id]?.[seccion] ?? "";
    const anterior = a.comentariosSecciones[seccion];
    const editable = puedeRevisar && a.estado === "enviado";
    const abierto = abiertos.has(clave) || texto.trim().length > 0;
    const marcas = marcasDe(a, seccion);
    const marcasAnteriores = editable ? (a.comentariosSecciones.marcas ?? []).filter((m) => m.seccion === seccion) : [];
    const pendiente = marcaPendiente?.actividadId === a.id && marcaPendiente.seccion === seccion ? marcaPendiente : null;
    const comentado = texto.trim() || (editable && marcas.length > 0);
    return (
      <section
        key={clave}
        className={`rounded-xl border p-4 space-y-3 ${comentado ? "border-amber-300 bg-amber-50/30" : "border-slate-200 bg-white"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">{titulo}</h3>
          <div className="flex items-center gap-2">
            {cambio !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  cambio ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                {cambio ? "Modificado desde la revisión anterior" : "Sin cambios"}
              </span>
            )}
            {extra}
          </div>
        </div>
        {contenido}

        {pendiente && (
          <div className="p-3 rounded-lg border border-unicaes/40 bg-red-50/40 space-y-2">
            <p className="text-[11px] text-slate-700 font-medium">
              <span className="font-extrabold text-unicaes">Comentario sobre la frase: </span>«{pendiente.fragmento}»
            </p>
            <textarea
              autoFocus
              rows={2}
              value={pendiente.texto}
              onChange={(e) => setMarcaPendiente({ ...pendiente, texto: e.target.value })}
              placeholder="Qué debe corregir el estudiante en esta frase."
              lang="es"
              spellCheck
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setMarcaPendiente(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                type="button"
                onClick={agregarMarca}
                disabled={pendiente.texto.trim().length < MIN_CARACTERES_COMENTARIO}
                className="px-3 py-1.5 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-extrabold disabled:opacity-50"
              >
                Agregar comentario
              </button>
            </div>
          </div>
        )}

        {marcas.length > 0 && (
          <ol className="space-y-1.5">
            {marcas.map((m) => (
              <li key={m.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="w-4 h-4 rounded-full bg-amber-300 text-amber-950 text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {m.numero}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-500 font-medium italic truncate">«{m.fragmento}»</p>
                  <p className="text-xs text-slate-800 font-semibold whitespace-pre-wrap">{m.texto}</p>
                </div>
                {editable && (
                  <button type="button" onClick={() => quitarMarca(a.id, m.id)} className="text-[11px] font-bold text-red-600 hover:text-red-700 shrink-0">
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {marcasAnteriores.length > 0 && (
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">Frases comentadas en la revisión anterior</p>
            {marcasAnteriores.map((m) => (
              <p key={m.id} className="text-[11px] text-slate-600 font-medium">
                <span className="italic">«{m.fragmento}»</span>: {m.texto}
              </p>
            ))}
          </div>
        )}

        {anterior && (
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-0.5">
            <p className="text-[10px] font-extrabold uppercase text-slate-500">
              {editable ? "Su comentario en la revisión anterior" : "Comentario del asesor"}
            </p>
            <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{anterior}</p>
          </div>
        )}

        {editable &&
          (abierto ? (
            <div className="space-y-1">
              <label htmlFor={`comentario-${clave}`} className="block text-[11px] font-extrabold text-unicaes">
                Comentario sobre {titulo.toLowerCase()}
              </label>
              <textarea
                id={`comentario-${clave}`}
                rows={3}
                value={texto}
                onChange={(e) => setComentario(a.id, seccion, e.target.value)}
                placeholder="Indique qué debe corregir o mejorar el estudiante en este apartado."
                lang="es"
                spellCheck
                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none"
              />
              {!texto.trim() && (
                <button type="button" onClick={() => alternarAbierto(clave)} className="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                  Cancelar
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => alternarAbierto(clave)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-unicaes hover:underline"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current leading-none">+</span>
              Agregar comentario
            </button>
          ))}
      </section>
    );
  };

  const detalleActividad = (a: ActividadSemana) => {
    const info = etiquetaDe(a.estado);
    const datosCita = leerDatosCita(a.citaApaDatos);
    const imagenesSoporte = a.imagenUrl
      ? [
          { clave: "principal", url: a.imagenUrl, leyenda: a.leyendaImagen || "Sin pie de imagen", origen: a.imagenOrigen, fuente: a.imagenFuente },
          ...a.imagenes.filter((i) => i.tipo === "soporte").map((i) => ({ clave: String(i.id), ...i })),
        ]
      : [];
    const anexos = a.imagenes.filter((i) => i.tipo === "anexo");
    const problemas = a.estado === "pendiente" ? [] : validarContenidoRegistro(a);
    const sinContenido = !a.marcoTeorico && !a.descriptor && !a.conclusionTecnica && !a.imagenUrl;

    return (
      <div className="space-y-4">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
              <span className="font-mono text-unicaes">{a.codigo}</span> {a.titulo}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 ${info.badge}`}>
              {info.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold">
            Actividad {indice + 1} de {actividades.length}
            {a.enviadoEn && ` · Enviada el ${fechaCorta(a.enviadoEn)}`}
            {a.fecha && ` · Fecha de realización: ${fechaISO(a.fecha)}`}
            {!a.enviadoEn && a.actualizadoEn && a.estado === "guardado" && ` · Última edición: ${fechaCorta(a.actualizadoEn)}`}
          </p>
          {a.versionAnterior && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-[11px] text-blue-900 font-semibold">
                {cambioDesdeRevision(a)
                  ? "El estudiante modificó esta actividad desde su revisión anterior."
                  : "Esta actividad no cambió desde su revisión anterior."}
              </p>
              {cambioDesdeRevision(a) && (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarCambios}
                    onChange={(e) => setMostrarCambios(e.target.checked)}
                    className="accent-unicaes"
                  />
                  Resaltar cambios
                </label>
              )}
            </div>
          )}
          {puedeRevisar && a.estado === "enviado" && (
            <p className="text-[11px] text-slate-500 font-medium">
              Seleccione una frase del texto para comentarla, o use &quot;Agregar comentario&quot; para comentar el apartado completo.
              {a.versionAnterior && cambioDesdeRevision(a) && mostrarCambios && " Desactive “Resaltar cambios” para seleccionar frases."}
            </p>
          )}
          {!sinContenido && (
            <div
              className={`px-3 py-2 rounded-lg border text-[11px] font-semibold ${
                problemas.length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"
              }`}
            >
              {problemas.length === 0 ? (
                "Verificación automática: cumple la extensión, la referencia APA 7, la imagen principal con su origen y el punto final de cada apartado."
              ) : (
                <>
                  <p className="font-extrabold">Verificación automática: hay apartados que no cumplen el formato.</p>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {problemas.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {!sinContenido && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-semibold">
              <div
                className={`px-3 py-2 rounded-lg border ${
                  a.palabrasDudosas.length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"
                }`}
              >
                <p className="font-extrabold">Ortografía</p>
                {a.palabrasDudosas.length === 0 ? (
                  <p>Sin palabras desconocidas.</p>
                ) : (
                  <p>
                    Revise: <span className="italic">{a.palabrasDudosas.join(", ")}</span>. Pueden ser errores o palabras en otro idioma
                    (deben ir en cursiva).
                  </p>
                )}
              </div>
              <div
                className={`px-3 py-2 rounded-lg border ${
                  a.sinSujeto ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <p className="font-extrabold">Sujeto de ejecución</p>
                <p>{a.sinSujeto ? "La descripción no menciona al pasante como quien realizó la actividad." : "La descripción nombra al pasante."}</p>
              </div>
              <div
                className={`px-3 py-2 rounded-lg border ${
                  a.declaracionAutoriaEn ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <p className="font-extrabold">Producción propia</p>
                <p>{a.declaracionAutoriaEn ? `Declarada al enviar (${fechaCorta(a.declaracionAutoriaEn)}).` : "Sin declaración registrada."}</p>
              </div>
            </div>
          )}
          {/* Observaciones estándar de la rúbrica: criterios que el sistema no valida por sí solo */}
          {!sinContenido && ((puedeRevisar && a.estado === "enviado") || (a.comentariosSecciones.estandar?.length ?? 0) > 0) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Observaciones estándar</p>
              <div className="flex flex-wrap gap-2">
                {OBSERVACIONES_ESTANDAR.map((o) => {
                  const editable = puedeRevisar && a.estado === "enviado";
                  const marcada = (editable ? comentarios[a.id]?.estandar : a.comentariosSecciones.estandar)?.includes(o.id) ?? false;
                  if (!editable && !marcada) return null;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!editable}
                      title={o.detalle}
                      aria-pressed={marcada}
                      onClick={() => alternarEstandar(a.id, o.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                        marcada ? "bg-amber-100 border-amber-400 text-amber-950" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                          marcada ? "bg-amber-500 border-amber-600 text-white" : "border-slate-300"
                        }`}
                      >
                        {marcada && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" aria-hidden="true">
                            <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {sinContenido ? (
          <p className="p-5 bg-white border border-border rounded-2xl text-xs text-slate-400 font-semibold">
            El estudiante aún no registra contenido en esta actividad.
          </p>
        ) : (
          <>
            {apartado(
              a,
              "marco",
              "Marco teórico y referencia",
              null,
              <div className="space-y-2">
                {textoRevisable(a, "marco", a.marcoTeorico, a.versionAnterior?.marcoTeorico)}
                {a.citaApa && (
                  <p className="text-[11px] text-slate-600 font-medium">
                    <span className="font-extrabold">Referencia: </span>
                    {datosCita ? <Segmentos segmentos={segmentosCitaApa(datosCita)} /> : a.citaApa}
                    {a.versionAnterior && hayCambios(a.versionAnterior.citaApa, a.citaApa) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold">Referencia modificada</span>
                    )}
                  </p>
                )}
              </div>,
              a.versionAnterior
                ? hayCambios(a.versionAnterior.marcoTeorico, a.marcoTeorico) || hayCambios(a.versionAnterior.citaApa, a.citaApa)
                : null
            )}
            {apartado(
              a,
              "descripcion",
              "Descripción de la actividad",
              <ConteoPalabras texto={a.descriptor} minimo={DESCRIPTOR_MIN_PALABRAS} maximo={DESCRIPTOR_MAX_PALABRAS} />,
              textoRevisable(a, "descripcion", a.descriptor, a.versionAnterior?.descriptor),
              a.versionAnterior ? hayCambios(a.versionAnterior.descriptor, a.descriptor) : null
            )}
            {apartado(
              a,
              "imagenes",
              "Imágenes de soporte",
              <span className="text-[10px] font-bold text-slate-500">
                {imagenesSoporte.length} {imagenesSoporte.length === 1 ? "imagen" : "imágenes"}
                {anexos.length > 0 && ` · ${anexos.length} anexo${anexos.length === 1 ? "" : "s"}`}
              </span>,
              <div className="space-y-3">
                {imagenesSoporte.length === 0 ? (
                  <p className="text-xs text-amber-700 font-semibold">Sin imagen de soporte principal.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {imagenesSoporte.map((img) => (
                      <figure key={img.clave} className="flex items-start gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.leyenda}
                          className="w-28 h-28 object-cover rounded-lg border border-slate-200 cursor-zoom-in shrink-0"
                          onClick={() => openDocument(img.url)}
                        />
                        <figcaption className="space-y-1">
                          <p className="text-xs text-slate-700 font-medium italic">{img.leyenda}</p>
                          <NotaOrigen origen={img.origen} fuente={img.fuente} />
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                {anexos.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-extrabold uppercase text-slate-400">Anexos (para el informe final)</p>
                    <div className="flex flex-wrap gap-3">
                      {anexos.map((i) => (
                        <figure key={i.id} className="w-40 space-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={i.url}
                            alt={i.leyenda}
                            className="w-40 h-28 object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                            onClick={() => openDocument(i.url)}
                          />
                          <figcaption className="text-[11px] text-slate-600 font-medium italic">{i.leyenda}</figcaption>
                          <NotaOrigen origen={i.origen} fuente={i.fuente} />
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                {a.cambiosImagenes && (a.cambiosImagenes.principal || a.cambiosImagenes.adicionales) && (
                  <p className="text-[11px] text-blue-800 font-semibold">
                    {[
                      a.cambiosImagenes.principal && "La imagen principal fue reemplazada.",
                      a.cambiosImagenes.adicionales && "Las imágenes adicionales cambiaron.",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>,
              a.versionAnterior
                ? !!(a.cambiosImagenes?.principal || a.cambiosImagenes?.adicionales) ||
                    hayCambios(a.versionAnterior.leyendaImagen, a.leyendaImagen)
                : null
            )}
            {apartado(
              a,
              "conclusion",
              "Conclusión técnica",
              <ConteoPalabras texto={a.conclusionTecnica} minimo={CONCLUSION_MIN_PALABRAS} maximo={CONCLUSION_MAX_PALABRAS} />,
              textoRevisable(a, "conclusion", a.conclusionTecnica, a.versionAnterior?.conclusionTecnica),
              a.versionAnterior ? hayCambios(a.versionAnterior.conclusionTecnica, a.conclusionTecnica) : null
            )}
            {(puedeRevisar && a.estado === "enviado") || a.comentariosSecciones.general
              ? apartado(
                  a,
                  "general",
                  "Comentario general",
                  null,
                  <p className="text-[11px] text-slate-500 font-semibold">Observación que no corresponde a un apartado en particular.</p>
                )
              : null}
          </>
        )}

        <div className="flex justify-between gap-2">
          {indice > 0 ? (
            <button
              type="button"
              onClick={() => seleccionar(actividades[indice - 1].id)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs"
            >
              Actividad anterior ({actividades[indice - 1].codigo})
            </button>
          ) : (
            <span />
          )}
          {indice < actividades.length - 1 && (
            <button
              type="button"
              onClick={() => seleccionar(actividades[indice + 1].id)}
              className="px-4 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-sm"
            >
              Siguiente actividad ({actividades[indice + 1].codigo})
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-unicaes">Revisión semanal</p>
          <h1 className="text-xl font-extrabold text-card-dark">
            Semana {semana} del Período {periodo}
          </h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            {data.egresado.nombreCompleto} ({data.egresado.carnet})
            {data.rango && ` — del ${fechaISO(data.rango.inicio)} al ${fechaISO(data.rango.fin)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.anterior && (
            <Link
              href={`${base}/semana/${data.anterior.periodo}/${data.anterior.semana}`}
              className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs"
            >
              Semana anterior
            </Link>
          )}
          {data.siguiente && (
            <Link
              href={`${base}/semana/${data.siguiente.periodo}/${data.siguiente.semana}`}
              className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs"
            >
              Semana siguiente
            </Link>
          )}
          <Link href={base} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-2xs">
            Volver al seguimiento
          </Link>
        </div>
      </div>

      <div className={`p-4 rounded-xl border text-xs font-semibold ${banner.className}`}>{banner.texto}</div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Actividades de la semana */}
        <aside className="lg:sticky lg:top-4 bg-white border border-border rounded-2xl shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">Actividades de la semana</h2>
            {puedeRevisar && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Revisadas</span>
                  <span>
                    {revisables.length - sinVer.length} de {revisables.length}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-unicaes rounded-full"
                    style={{ width: `${revisables.length ? Math.round(((revisables.length - sinVer.length) / revisables.length) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <ul className="p-2 space-y-1">
            {actividades.map((a) => {
              const info = etiquetaDe(a.estado);
              const n = contarComentarios(comentarios[a.id] ?? {});
              const activa = a.id === actividad?.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(a.id)}
                    aria-current={activa}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      activa ? "border-unicaes bg-red-50/40" : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-unicaes">{a.codigo}</span>
                      <span className="flex items-center gap-1">
                        {n > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-900">
                            {n} coment.
                          </span>
                        )}
                        {cambioDesdeRevision(a) && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 text-blue-800">Modificada</span>
                        )}
                        {puedeRevisar && a.estado === "enviado" && vistas.has(a.id) && n === 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-100 text-slate-600">Vista</span>
                        )}
                      </span>
                    </span>
                    <span className="block text-xs font-bold text-slate-800 truncate">{a.titulo}</span>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${info.badge}`}>
                      {info.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0">{actividad && detalleActividad(actividad)}</div>
      </div>

      {puedeRevisar && (
        <div className="sticky bottom-4 bg-white border border-border rounded-2xl p-4 shadow-lg space-y-3">
          {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold">{error}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 font-semibold">
              {totalComentarios > 0
                ? `${totalComentarios} comentario${totalComentarios > 1 ? "s" : ""} en ${conComentarios.length} de ${actividades.length} actividades.`
                : "Sin comentarios escritos."}
              {sinVer.length > 0 && ` Pendientes de abrir: ${sinVer.map((a) => a.codigo).join(", ")}.`}
              <span className={`block mt-0.5 ${estadoBorrador === "error" ? "text-red-700" : "text-slate-400"}`}>
                {estadoBorrador === "guardando"
                  ? "Guardando borrador..."
                  : estadoBorrador === "error"
                    ? "No se pudo guardar el borrador. Sus comentarios siguen en pantalla."
                    : sinGuardar
                      ? "Cambios sin guardar."
                      : borradorGuardadoEn
                        ? `Borrador guardado (${borradorGuardadoEn.toLocaleTimeString("es-SV", { timeZone: "America/El_Salvador", hour: "2-digit", minute: "2-digit" })}). El estudiante no lo ve hasta que registre la revisión.`
                        : "Sus comentarios se guardan como borrador automáticamente."}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={enviando !== null || estadoBorrador === "guardando" || !sinGuardar}
                onClick={() => guardarBorrador(cambios)}
                className="px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                type="button"
                disabled={enviando !== null}
                onClick={() => revisar("corregir")}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {enviando === "corregir" ? "Enviando..." : "Devolver con observaciones"}
              </button>
              <button
                type="button"
                disabled={enviando !== null}
                onClick={() => revisar("aprobar")}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {enviando === "aprobar" ? "Aprobando..." : "Aprobar semana"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
