"use client";

// Informe final por capítulos (entrega I5, investigación). Es la tesis: nada se sobrescribe y nada se pierde.
//   - Cada "Guardar" y cada guardado automático crean una versión nueva; el historial permite ver y restaurar.
//   - Si otro integrante guardó antes, el guardado se rechaza y el texto propio queda en pantalla junto a la versión nueva.
//   - Aviso de quién más está editando el capítulo y aviso al salir con cambios sin guardar.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  agregarArchivoCapitulo, enviarCapitulo, enviarDocumentoCompleto, entregarInformeFinal, getVersionesCapitulo, guardarCapitulo, marcarEditando,
  quitarArchivoCapitulo, ratificarInformeFinal, restaurarVersion, revisarCapitulo, revisarInformeFinal,
  type CapituloDatos, type DatosInformeFinal, type VersionResumen,
} from "@/app/actions/informeFinalFicha";
import { columnasTabla, leerItems, limitesRecurso, reglasRecurso, TIPOS_ARCHIVO, type ArchivoEspacio, type EnlaceEspacio } from "@/lib/fichas/elementosRecurso";
import { ETIQUETA_ESTADO_CAPITULO } from "@/lib/fichas/informeFinalFicha";
import { openDocument } from "@/lib/pdfViewer";

const SEGUNDOS_AUTOGUARDADO = 20;
// Formato propio (no toLocaleString): el servidor y el navegador deben producir el mismo texto al hidratar.
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const COLOR: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  enviado: "bg-blue-100 text-blue-800",
  observado: "bg-amber-100 text-amber-800",
  aprobado: "bg-emerald-100 text-emerald-700",
};
const campo = "w-full p-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75";

export default function InformeFinalEquipo({ datos, capitulo, base, exportar }: { datos: DatosInformeFinal; capitulo: number; base: string; exportar?: { pdf: string; word: string } }) {
  const router = useRouter();
  const { etapa, plan, estado } = datos;
  const actual = Math.min(Math.max(capitulo, 1), datos.capitulos.length);
  const cap = datos.capitulos[actual - 1];
  const esAsesor = plan.rol === "asesor";
  const enEquipo = plan.rol === "lider" || plan.rol === "integrante";
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [comentario, setComentario] = useState("");

  function ejecutar(accion: () => Promise<{ success: boolean; error?: string }>, exito: string) {
    setMensaje(null);
    iniciar(async () => {
      const r = await accion();
      if (!r.success) return setMensaje({ tipo: "error", texto: r.error ?? "No se pudo completar." });
      setMensaje({ tipo: "ok", texto: exito });
      setComentario("");
      router.refresh();
    });
  }

  const miFirma = datos.ratificacion.firmas.find((f) => f.usuarioId === plan.miId);
  const ESTADO_INFORME = { redactando: "En redacción", entregado: "Versión final entregada", aprobado: "Aprobado por el asesor" } as const;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-card-dark">{etapa.nombre}</h1>
            <span className={`text-xs font-bold rounded-md px-2 py-0.5 ${estado === "aprobado" ? "bg-emerald-100 text-emerald-700" : estado === "entregado" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>{ESTADO_INFORME[estado]}</span>
          </div>
          <p className="text-sm text-muted mt-1">Propuesta #{plan.propuesta.numero} · {plan.propuesta.titulo}</p>
          <p className="text-xs text-muted mt-1">
            {enEquipo && "Todo el equipo redacta cualquier capítulo. Cada guardado queda como versión, con su autor: puedes ver el historial y volver a una versión anterior."}
            {esAsesor && (etapa.revision.porCapitulo ? "Revisa cada capítulo enviado; al final apruebas la versión completa que entrega el equipo." : "Revisa el documento completo enviado por el equipo.")}
          </p>
          {datos.fechaLimite && <p className="text-sm font-bold text-blue-800 mt-1">Revisión final del asesor a más tardar el {new Date(datos.fechaLimite).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })}.</p>}
          {datos.huellaFinal && <p className="text-[11px] text-muted mt-1 font-mono break-all">Huella de la versión entregada: {datos.huellaFinal.slice(0, 16)}…</p>}
        </div>
        {exportar && <div className="flex flex-wrap gap-2 shrink-0">
          <a href={exportar.pdf} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50">Vista para imprimir (PDF)</a>
          <a href={exportar.word} className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50">Descargar Word</a>
        </div>}
      </div>

      {datos.comentarioFinal && estado !== "entregado" && (
        <div className={`p-4 rounded-xl text-sm border-2 ${estado === "aprobado" ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-amber-50 border-amber-300 text-amber-950"}`}>
          <strong className="block text-xs uppercase tracking-wide mb-1">Dictamen del asesor sobre el informe final</strong>
          <p className="whitespace-pre-wrap">{datos.comentarioFinal}</p>
        </div>
      )}
      {mensaje && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>{mensaje.texto}</div>
      )}

      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)] gap-4 items-start">
        <nav aria-label="Capítulos del informe final" className="bg-white border border-border rounded-xl p-2 shadow-xs">
          <ol className="space-y-0.5">
            {datos.capitulos.map((c, i) => (
              <li key={c.espacio.id}>
                <Link href={`${base}&cap=${i + 1}`} aria-current={i + 1 === actual ? "step" : undefined}
                  className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${i + 1 === actual ? "bg-red-50 text-brand-red font-bold" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span className="w-5 shrink-0 text-[11px] text-gray-400 mt-0.5 text-right">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    {c.espacio.titulo}
                    <span className="flex flex-wrap gap-1 mt-0.5">
                      <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${COLOR[c.estado.estado]}`}>{ETIQUETA_ESTADO_CAPITULO[c.estado.estado]}</span>
                      {!c.espacio.obligatorio && <span className="text-[10px] text-muted">opcional</span>}
                      {c.editando && <span className="text-[10px] text-blue-700">✎ {c.editando.nombre.split(" ")[0]}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-3">
          <EditorCapitulo key={`${cap.espacio.id}-${cap.ultima?.numero ?? 0}-${cap.estado.estado}`} propuestaId={plan.propuesta.id} cap={cap}
            siguiente={actual < datos.capitulos.length ? `${base}&cap=${actual + 1}` : null}
            porCapitulo={etapa.revision.porCapitulo} enEquipo={enEquipo} />

          {esAsesor && cap.estado.estado === "enviado" && (
            <section className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-3">
              <h2 className="font-bold text-card-dark">Revisión del capítulo «{cap.espacio.titulo}» (versión {cap.estado.version})</h2>
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} aria-label="Observaciones del capítulo"
                placeholder="Observaciones para el equipo (obligatorias si pides ajustes)" className="w-full p-3 rounded-lg border border-gray-300 text-sm" />
              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" disabled={pendiente} onClick={() => ejecutar(() => revisarCapitulo(plan.propuesta.id, cap.espacio.id, "observar", comentario), "Observaciones enviadas al equipo.")}
                  className="px-4 py-2 rounded-lg text-sm font-bold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50">Pedir ajustes</button>
                <button type="button" disabled={pendiente} onClick={() => ejecutar(() => revisarCapitulo(plan.propuesta.id, cap.espacio.id, "aprobar", comentario), "Capítulo aprobado.")}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Aprobar capítulo</button>
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-3">
        <h2 className="font-bold text-card-dark">Entrega de la versión final</h2>
        <p className="text-xs text-muted">
          Cuando el asesor aprueba todos los capítulos, {datos.ratificacion.requerida ? "cada integrante ratifica la versión completa y" : ""} el líder la entrega.
          La versión entregada queda congelada con su huella: lo que se imprime y presenta es exactamente lo aprobado.
        </p>
        {!etapa.revision.porCapitulo && enEquipo && estado === "redactando" && (
          <button type="button" disabled={pendiente} onClick={() => { if (window.confirm("¿Enviar el documento completo al asesor?")) ejecutar(() => enviarDocumentoCompleto(plan.propuesta.id), "Documento enviado al asesor."); }}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">Enviar documento completo al asesor</button>
        )}
        {datos.pendientesAprobacion.length > 0 ? (
          <p className="text-sm text-amber-800">Capítulos por aprobar: {datos.pendientesAprobacion.join(" · ")}</p>
        ) : (
          <p className="text-sm text-emerald-700 font-semibold">Todos los capítulos están aprobados.</p>
        )}
        {datos.ratificacion.requerida && (
          <ul className="grid sm:grid-cols-3 gap-2">
            {datos.ratificacion.firmas.map((f) => (
              <li key={f.usuarioId} className={`border rounded-lg px-3 py-2 text-xs ${f.vigente ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600"}`}>
                <div className="font-bold text-sm">{f.nombre}</div>
                {f.vigente ? "Ratificó la versión actual" : "Sin ratificar la versión actual"}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {enEquipo && estado === "redactando" && datos.ratificacion.requerida && (
            <button type="button" disabled={pendiente || miFirma?.vigente || datos.pendientesAprobacion.length > 0} onClick={() => ejecutar(() => ratificarInformeFinal(plan.propuesta.id), "Ratificaste la versión completa del informe final.")}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-brand-red text-brand-red hover:bg-red-50 disabled:opacity-50">
              {miFirma?.vigente ? "Ya ratificaste esta versión" : "Ratificar versión completa"}
            </button>
          )}
          {plan.rol === "lider" && estado === "redactando" && (
            <button type="button" disabled={pendiente || datos.pendientesAprobacion.length > 0 || !datos.ratificacion.completa}
              onClick={() => { if (window.confirm("¿Entregar la versión final? Quedará congelada y pasará a la revisión final del asesor.")) ejecutar(() => entregarInformeFinal(plan.propuesta.id), "Versión final entregada."); }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">Entregar versión final</button>
          )}
        </div>
        {esAsesor && estado === "entregado" && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} aria-label="Dictamen del informe final"
              placeholder="Dictamen escrito del informe final (obligatorio)" className="w-full p-3 rounded-lg border border-gray-300 text-sm" />
            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" disabled={pendiente} onClick={() => { if (window.confirm("¿Devolver el informe al equipo? Todos los capítulos quedarán con observaciones.")) ejecutar(() => revisarInformeFinal(plan.propuesta.id, "devolver", comentario), "Informe devuelto con observaciones."); }}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50">Devolver con observaciones</button>
              <button type="button" disabled={pendiente} onClick={() => { if (window.confirm("¿Aprobar el informe final? Quedará como versión definitiva.")) ejecutar(() => revisarInformeFinal(plan.propuesta.id, "aprobar", comentario), "Informe final aprobado."); }}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">Aprobar informe final</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Editor de un capítulo: texto, lista, tabla, enlaces o archivos. */
function EditorCapitulo({ propuestaId, cap, siguiente, porCapitulo, enEquipo }: { propuestaId: number; cap: CapituloDatos; siguiente: string | null; porCapitulo: boolean; enEquipo: boolean }) {
  const router = useRouter();
  const e = cap.espacio;
  const inicial = cap.ultima?.contenido ?? cap.precarga ?? (e.elemento === "texto" ? "" : "[]");
  const [contenido, setContenido] = useState(inicial);
  const [base, setBase] = useState<number | null>(cap.ultima?.numero ?? null);
  const [sucio, setSucio] = useState(!cap.ultima && !!cap.precarga);
  const [estadoGuardado, setEstadoGuardado] = useState<string | null>(cap.ultima ? `Versión ${cap.ultima.numero} · ${cap.ultima.autor} · ${fechaHora(cap.ultima.creadoEn)}` : null);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<(VersionResumen & { contenido: string }) | null>(null);
  const [versiones, setVersiones] = useState<(VersionResumen & { contenido: string })[] | null>(null);
  const [verVersion, setVerVersion] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const refContenido = useRef(contenido);
  useEffect(() => { refContenido.current = contenido; }, [contenido]);
  const editable = cap.editable;

  // Aviso a los demás de que este integrante está en el capítulo.
  useEffect(() => {
    if (editable) void marcarEditando(propuestaId, e.id);
  }, [editable, propuestaId, e.id]);

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  const guardar = useCallback(async (automatica: boolean) => {
    if (!editable || conflicto) return false;
    setOcupado(true);
    setError(null);
    const enviado = refContenido.current;
    const r = await guardarCapitulo(propuestaId, e.id, enviado, base, automatica);
    setOcupado(false);
    if (!r.success) {
      setError(r.error);
      if ("conflicto" in r && r.conflicto) setConflicto(r.conflicto);
      return false;
    }
    setBase(r.numero);
    if (refContenido.current === enviado) setSucio(false);
    setEstadoGuardado(`${automatica ? "Guardado automático" : "Guardado"}: versión ${r.numero} · ${fechaHora(new Date().toISOString())}`);
    if (!automatica) router.refresh();
    return true;
  }, [editable, conflicto, propuestaId, e.id, base, router]);

  // Guardado automático mientras hay cambios.
  useEffect(() => {
    if (!editable || !sucio || conflicto) return;
    const t = setTimeout(() => { void guardar(true); }, SEGUNDOS_AUTOGUARDADO * 1000);
    return () => clearTimeout(t);
  }, [editable, sucio, conflicto, contenido, guardar]);

  const cambiar = (v: string) => { setContenido(v); setSucio(true); };

  async function abrirHistorial() {
    if (versiones) return setVersiones(null);
    const r = await getVersionesCapitulo(propuestaId, e.id);
    if (r.success) setVersiones(r.versiones);
  }
  async function restaurar(numero: number) {
    if (!window.confirm(`¿Volver a la versión ${numero}? Se guardará como una versión nueva; ninguna se borra.`)) return;
    const r = await restaurarVersion(propuestaId, e.id, numero, base);
    if (!r.success) return setError(r.error);
    router.refresh();
  }
  function usarVersionNueva() {
    if (!conflicto) return;
    if (!window.confirm("Se reemplazará lo que tienes en pantalla por la versión más reciente. Copia antes tu texto si lo necesitas. ¿Continuar?")) return;
    setContenido(conflicto.contenido);
    setBase(conflicto.numero);
    setSucio(false);
    setConflicto(null);
    setError(null);
  }
  function conservarMiTexto() {
    if (!conflicto) return;
    // Mi texto se guardará encima de la versión nueva (que sigue en el historial).
    setBase(conflicto.numero);
    setConflicto(null);
    setError(null);
    setSucio(true);
  }

  const items = e.elemento === "texto" ? [] : (leerItems(e.elemento as "lista", contenido) as unknown[]);
  const setItems = (lista: unknown[]) => cambiar(JSON.stringify(lista));
  const { max } = e.elemento === "texto" ? { max: 0 } : limitesRecurso(e);
  const disabled = !editable;

  return (
    <section className="bg-white border border-border rounded-xl p-5 lg:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-bold text-card-dark">{e.titulo} {e.obligatorio ? <span className="text-red-500">*</span> : <span className="text-xs font-medium text-muted">(opcional)</span>}</h2>
          {e.descripcion && <p className="text-sm text-muted mt-1">{e.descripcion}</p>}
          {e.elemento !== "texto" && <ul className="mt-1 text-xs text-gray-600 list-disc pl-5">{reglasRecurso({ ...e, elemento: e.elemento as "lista" }).map((r) => <li key={r}>{r}</li>)}</ul>}
        </div>
        <div className="text-right text-xs text-muted space-y-1">
          <span className={`inline-block font-bold rounded px-2 py-0.5 ${COLOR[cap.estado.estado]}`}>{ETIQUETA_ESTADO_CAPITULO[cap.estado.estado]}</span>
          {estadoGuardado && <div suppressHydrationWarning>{estadoGuardado}</div>}
          {sucio && editable && <div className="text-amber-700 font-bold">Cambios sin guardar (se guardan solos cada {SEGUNDOS_AUTOGUARDADO} s)</div>}
        </div>
      </div>

      {e.ayuda?.trim() && <div className="p-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-lg text-sm whitespace-pre-wrap">{e.ayuda}</div>}
      {cap.estado.comentario && cap.estado.estado !== "enviado" && (
        <div className={`p-3 rounded-lg text-sm border ${cap.estado.estado === "aprobado" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
          <strong className="block text-xs uppercase mb-0.5">Comentario del asesor</strong>
          <span className="whitespace-pre-wrap">{cap.estado.comentario}</span>
        </div>
      )}
      {cap.editando && editable && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-sm">
          <strong>{cap.editando.nombre}</strong> también está editando este capítulo (desde las {new Date(cap.editando.desde).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" })}). Pónganse de acuerdo: si los dos guardan, el sistema avisará y nadie perderá su texto.
        </div>
      )}
      {!cap.ultima && cap.precarga && editable && (
        <div className="p-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-lg text-sm">Este capítulo empieza con lo que ya escribieron en etapas anteriores. Ajústalo y guárdalo.</div>
      )}
      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">{error}</div>}
      {conflicto && (
        <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-sm space-y-2">
          <p><strong>Versión {conflicto.numero}</strong> guardada por {conflicto.autor} el {fechaHora(conflicto.creadoEn)}:</p>
          <pre className="whitespace-pre-wrap text-xs bg-white border border-amber-200 rounded p-2 max-h-48 overflow-auto font-sans">{conflicto.contenido}</pre>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={conservarMiTexto} className="px-3 py-1.5 rounded-md text-xs font-bold bg-brand-red text-white">Guardar mi texto como versión nueva</button>
            <button type="button" onClick={usarVersionNueva} className="px-3 py-1.5 rounded-md text-xs font-bold border border-gray-300">Cargar su versión</button>
          </div>
          <p className="text-[11px] text-amber-900">Ninguna opción borra versiones: las dos quedan en el historial.</p>
        </div>
      )}

      {e.elemento === "texto" && (
        <div>
          <textarea aria-label={e.titulo} rows={16} value={contenido} disabled={disabled} onChange={(ev) => cambiar(ev.target.value)}
            className="w-full p-4 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm leading-relaxed disabled:opacity-80 font-serif" />
          <div className="flex justify-between text-xs mt-1 text-muted"><span>Separe los párrafos con una línea en blanco.</span><span>{palabras(contenido)} palabras</span></div>
        </div>
      )}
      {e.elemento === "lista" && (
        <div className="space-y-2">
          {(items as string[]).map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted w-6 text-right">{i + 1}.</span>
              <input aria-label={`Elemento ${i + 1}`} value={t} disabled={disabled} onChange={(ev) => setItems((items as string[]).map((x, k) => (k === i ? ev.target.value : x)))} className={campo} />
              {!disabled && <button type="button" onClick={() => setItems((items as string[]).filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
            </div>
          ))}
          {!disabled && (items.length < max || max === 0) && <button type="button" onClick={() => setItems([...(items as string[]), " "])} className="text-sm font-bold text-brand-red hover:underline">+ Agregar elemento</button>}
        </div>
      )}
      {e.elemento === "tabla" && (
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600"><tr>{columnasTabla(e).map((c) => <th key={c} className="text-left px-2 py-1.5">{c}</th>)}{!disabled && <th className="w-16" />}</tr></thead>
            <tbody>
              {(items as string[][]).map((f, i) => (
                <tr key={i} className="border-t border-gray-100 align-top">
                  {columnasTabla(e).map((c, j) => (
                    <td key={c} className="px-1 py-1"><textarea aria-label={`${c}, fila ${i + 1}`} rows={2} value={f[j] ?? ""} disabled={disabled}
                      onChange={(ev) => setItems((items as string[][]).map((x, k) => (k === i ? columnasTabla(e).map((_, m) => (m === j ? ev.target.value : x[m] ?? "")) : x)))} className={campo} /></td>
                  ))}
                  {!disabled && <td className="px-1 py-1"><button type="button" onClick={() => setItems((items as string[][]).filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {!disabled && items.length < max && <button type="button" onClick={() => setItems([...(items as string[][]), columnasTabla(e).map(() => " ")])} className="text-sm font-bold text-brand-red hover:underline">+ Agregar fila</button>}
        </div>
      )}
      {e.elemento === "enlace" && (
        <div className="space-y-2">
          {(items as EnlaceEspacio[]).map((x, i) => (
            <div key={i} className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
              <input aria-label={`Dirección ${i + 1}`} type="url" placeholder="https://" value={x.url} disabled={disabled} onChange={(ev) => setItems((items as EnlaceEspacio[]).map((y, k) => (k === i ? { ...y, url: ev.target.value } : y)))} className={campo} />
              <input aria-label={`Descripción ${i + 1}`} value={x.descripcion} disabled={disabled} onChange={(ev) => setItems((items as EnlaceEspacio[]).map((y, k) => (k === i ? { ...y, descripcion: ev.target.value } : y)))} className={campo} />
              {!disabled && <button type="button" onClick={() => setItems((items as EnlaceEspacio[]).filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
            </div>
          ))}
          {!disabled && items.length < max && <button type="button" onClick={() => setItems([...(items as EnlaceEspacio[]), { url: "https://", descripcion: "" }])} className="text-sm font-bold text-brand-red hover:underline">+ Agregar enlace</button>}
        </div>
      )}
      {e.elemento === "archivo" && (
        <ArchivosCapitulo propuestaId={propuestaId} espacioId={e.id} base={base} disabled={disabled} archivos={leerItems("archivo", contenido) as ArchivoEspacio[]}
          max={max} tipos={(Array.isArray(e.parametros.tipos) ? e.parametros.tipos : ["pdf"]) as string[]} onError={setError} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <button type="button" onClick={abrirHistorial} className="text-sm font-bold text-gray-600 hover:text-brand-red">{versiones ? "Ocultar historial" : `Historial de versiones${cap.ultima ? ` (${cap.ultima.numero})` : ""}`}</button>
        <div className="flex flex-wrap gap-2">
          {editable && e.elemento !== "archivo" && (
            <button type="button" disabled={ocupado || !!conflicto} onClick={() => guardar(false)}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">{ocupado ? "Guardando…" : "Guardar versión"}</button>
          )}
          {editable && porCapitulo && enEquipo && (
            <button type="button" disabled={ocupado || sucio || !!conflicto}
              title={sucio ? "Guarda los cambios antes de enviar" : undefined}
              onClick={async () => {
                if (!window.confirm(`¿Enviar «${e.titulo}» al asesor? Mientras lo revisa no se podrá modificar.`)) return;
                const r = await enviarCapitulo(propuestaId, e.id);
                if (!r.success) return setError(r.error);
                router.refresh();
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">Enviar capítulo al asesor</button>
          )}
          {siguiente && <Link href={siguiente} onClick={(ev) => { if (sucio && !window.confirm("Hay cambios sin guardar en este capítulo. ¿Salir de todos modos?")) ev.preventDefault(); }} className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50">Siguiente capítulo →</Link>}
        </div>
      </div>

      {versiones && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {versiones.length === 0 && <p className="p-3 text-sm text-muted">Todavía no hay versiones guardadas.</p>}
          {versiones.map((v) => (
            <div key={v.numero} className="p-3 text-sm space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>Versión {v.numero}</strong> · {v.autor} · {fechaHora(v.creadoEn)}{v.automatica ? " · automática" : ""}{e.elemento === "texto" ? ` · ${palabras(v.contenido)} palabras` : ""}</span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => setVerVersion(verVersion === v.numero ? null : v.numero)} className="text-xs font-bold text-gray-600 hover:text-brand-red">{verVersion === v.numero ? "Ocultar" : "Ver"}</button>
                  {editable && v.numero !== base && <button type="button" onClick={() => restaurar(v.numero)} className="text-xs font-bold text-brand-red hover:underline">Volver a esta versión</button>}
                </span>
              </div>
              {verVersion === v.numero && <pre className="whitespace-pre-wrap text-xs bg-gray-50 border border-gray-200 rounded p-2 max-h-64 overflow-auto font-sans">{v.contenido}</pre>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ArchivosCapitulo({ propuestaId, espacioId, base, disabled, archivos, max, tipos, onError }: {
  propuestaId: number; espacioId: string; base: number | null; disabled: boolean; archivos: ArchivoEspacio[]; max: number; tipos: string[]; onError: (e: string | null) => void;
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const accept = TIPOS_ARCHIVO.filter((t) => tipos.includes(t.valor)).flatMap((t) => t.mime).join(",");
  return (
    <div className="space-y-3">
      {archivos.length === 0 ? <p className="text-sm text-muted">Todavía no hay archivos.</p> : (
        <ul className="space-y-1">
          {archivos.map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2">
              <button type="button" onClick={() => openDocument(a.url, a.nombre)} className="font-bold text-brand-red hover:underline break-all text-left">{a.nombre}</button>
              {!disabled && <button type="button" disabled={ocupado} onClick={async () => {
                if (!window.confirm("¿Quitar este archivo? Queda en el historial de versiones.")) return;
                setOcupado(true);
                const r = await quitarArchivoCapitulo(propuestaId, espacioId, i, base);
                setOcupado(false);
                if (!r.success) return onError(r.error);
                router.refresh();
              }} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
            </li>
          ))}
        </ul>
      )}
      {!disabled && archivos.length < max && (
        <div className="flex flex-wrap items-center gap-2 border border-dashed border-gray-300 rounded-lg p-3">
          <input type="file" accept={accept} aria-label="Archivo" onChange={(ev) => setArchivo(ev.target.files?.[0] ?? null)} className="text-sm" />
          <button type="button" disabled={!archivo || ocupado} onClick={async () => {
            if (!archivo) return;
            setOcupado(true);
            const fd = new FormData();
            fd.set("archivo", archivo);
            const r = await agregarArchivoCapitulo(propuestaId, espacioId, base, fd);
            setOcupado(false);
            if (!r.success) return onError(r.error);
            setArchivo(null);
            router.refresh();
          }} className="px-4 py-2 rounded-lg bg-brand-red text-white font-bold text-sm disabled:opacity-50">{ocupado ? "Adjuntando…" : "Adjuntar"}</button>
        </div>
      )}
    </div>
  );
}
