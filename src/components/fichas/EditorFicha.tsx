"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearFicha, descartarBorrador, guardarBorrador, habilitarVersion, nuevaVersion, retirarVersion } from "@/app/actions/fichas";
import { compararDefiniciones } from "@/lib/fichas/diferencias";
import { validarDefinicion, type ProblemaFicha } from "@/lib/fichas/validar";
import { esEtapaEjecucion, type DefinicionFicha, type EstadoVersion, type Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD, EstadoVersionBadge, Proximamente } from "./comunes";
import EditorPropuesta from "./EditorPropuesta";
import EditorEjecucion from "./EditorEjecucion";
import { CalendarioEjecucion, PasosEgresado } from "./VistaPrevia";
import { EditorCierre, EditorPresentacion, EditorRoles } from "./PestanasDiseno";

type Pestana = "propuesta" | "ejecucion" | "cierre" | "revision" | "publica" | "roles" | "cambios" | "versiones";

interface Props {
  ficha: { id: number; codigo: string | null; nombre: string; modalidad: Modalidad; esBase: boolean; alcance: string };
  versiones: { id: number; numero: number; estado: EstadoVersion; habilitadaEn: string | null; notas: string | null }[];
  version: { id: number; numero: number; estado: EstadoVersion; definicion: DefinicionFicha };
  referencia: { etiqueta: string; definicion: DefinicionFicha } | null;
}

const boton = "px-3.5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function EditorFicha({ ficha, versiones, version, referencia }: Props) {
  const router = useRouter();
  const editable = version.estado === "borrador" && !ficha.esBase;
  const [definicion, setDefinicion] = useState<DefinicionFicha>(version.definicion);
  const [sucio, setSucio] = useState(false);
  const [modo, setModo] = useState<"constructor" | "egresado">("constructor");
  const [pestana, setPestana] = useState<Pestana>("propuesta");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; problemas?: ProblemaFicha[] } | null>(null);
  const [habilitando, setHabilitando] = useState(false);
  const [notas, setNotas] = useState("");
  const [pendiente, iniciar] = useTransition();

  const problemas = useMemo(() => validarDefinicion(definicion), [definicion]);
  const cambios = useMemo(() => (referencia ? compararDefiniciones(referencia.definicion, definicion) : []), [referencia, definicion]);
  const hayBorrador = versiones.some((v) => v.estado === "borrador");

  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  function cambiar(d: DefinicionFicha) {
    setDefinicion(d);
    setSucio(true);
    setMensaje(null);
  }

  function ejecutar(accion: () => Promise<{ success: boolean; error?: string; problemas?: ProblemaFicha[] }>, exito: string, despues?: () => void) {
    setMensaje(null);
    iniciar(async () => {
      const res = await accion();
      if (!res.success) {
        setMensaje({ tipo: "error", texto: res.error ?? "No se pudo completar la acción.", problemas: res.problemas });
        return;
      }
      setMensaje({ tipo: "ok", texto: exito });
      despues?.();
      router.refresh();
    });
  }

  const guardar = () =>
    ejecutar(async () => {
      const res = await guardarBorrador(version.id, definicion);
      if (res.success) setSucio(false);
      return res;
    }, "Borrador guardado.");

  const confirmarHabilitar = () =>
    ejecutar(async () => {
      if (sucio) {
        const g = await guardarBorrador(version.id, definicion);
        if (!g.success) return g;
        setSucio(false);
      }
      return habilitarVersion(version.id, notas);
    }, `Versión ${version.numero} habilitada.`, () => setHabilitando(false));

  const enPropuesta = problemas.filter((p) => p.ubicacion.includes("/")).length;
  const enEjecucion = problemas.filter((p) => p.ubicacion !== "ficha" && !p.ubicacion.includes("/")).length;
  const pestanas: { id: Pestana; texto: string; marca?: number; diseno?: boolean }[] = [
    { id: "propuesta", texto: "Propuesta", marca: enPropuesta },
    { id: "ejecucion", texto: "Ejecución", marca: enEjecucion },
    { id: "cierre", texto: "Cierre", diseno: true },
    { id: "revision", texto: "Presentación de revisión", diseno: true },
    { id: "publica", texto: "Presentación pública", diseno: true },
    { id: "roles", texto: "Roles", diseno: true },
    { id: "cambios", texto: "Cambios", marca: cambios.length || undefined },
    { id: "versiones", texto: "Versiones" },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="space-y-3">
        <Link href="/admin/bloques-propuestas" className="text-sm text-gray-500 hover:text-brand-red">← Fichas</Link>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{ficha.codigo ?? "—"}</span>
              <h1 className="text-2xl font-bold text-gray-800">{ETIQUETA_MODALIDAD[ficha.modalidad]}</h1>
              <EstadoVersionBadge estado={version.estado} texto={`Versión ${version.numero} · ${version.estado === "retirada" ? "deshabilitada" : version.estado}`} />
              {sucio && <span className="text-xs font-bold text-amber-700">Cambios sin guardar</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {ficha.alcance} · {definicion.participantes.max > 1 ? `de ${definicion.participantes.min} a ${definicion.participantes.max} participantes` : "individual"}
              {ficha.esBase && " · Ficha base: describe el funcionamiento actual y es solo de lectura"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {editable && (
              <>
                <button type="button" className={`${boton} text-gray-600 hover:bg-gray-100`} disabled={pendiente}
                  onClick={() => {
                    if (!window.confirm(versiones.length === 1 ? "La ficha solo tiene este borrador: se eliminará la ficha completa. ¿Continuar?" : "¿Descartar este borrador?")) return;
                    ejecutar(() => descartarBorrador(version.id), "Borrador descartado.", () => { setSucio(false); router.push(versiones.length === 1 ? "/admin/bloques-propuestas" : `/admin/bloques-propuestas/${ficha.id}`); });
                  }}>
                  Descartar borrador
                </button>
                <button type="button" className={`${boton} border border-gray-300 text-gray-700 hover:bg-gray-50`} disabled={pendiente || !sucio} onClick={guardar}>
                  {pendiente && sucio ? "Guardando…" : "Guardar borrador"}
                </button>
                <button type="button" className={`${boton} bg-brand-red hover:bg-red-800 text-white`} disabled={pendiente} onClick={() => { setNotas(""); setHabilitando(true); }}>
                  Habilitar…
                </button>
              </>
            )}
            {!editable && !ficha.esBase && !hayBorrador && (
              <button type="button" className={`${boton} bg-brand-red hover:bg-red-800 text-white`} disabled={pendiente}
                onClick={() => ejecutar(async () => {
                  const res = await nuevaVersion(ficha.id);
                  if (res.success) router.push(`/admin/bloques-propuestas/${ficha.id}?v=${res.versionId}`);
                  return res;
                }, "Se creó un borrador nuevo.")}>
                Crear versión nueva
              </button>
            )}
            {!editable && !ficha.esBase && hayBorrador && version.estado !== "borrador" && (
              <Link href={`/admin/bloques-propuestas/${ficha.id}`} className={`${boton} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Ir al borrador</Link>
            )}
            {ficha.esBase && (
              <button type="button" className={`${boton} bg-brand-red hover:bg-red-800 text-white`} disabled={pendiente}
                onClick={() => ejecutar(async () => {
                  const res = await crearFicha({ modalidad: ficha.modalidad, facultadId: null, carreraId: null, partirDeVersionId: version.id });
                  if (res.success) router.push(`/admin/bloques-propuestas/${res.fichaId}`);
                  return res;
                }, "Ficha creada a partir de la base.")}>
                Crear ficha a partir de esta
              </button>
            )}
          </div>
        </div>
      </div>

      {mensaje && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {mensaje.texto}
          {mensaje.problemas && mensaje.problemas.length > 0 && (
            <ul className="list-disc pl-5 mt-1">{mensaje.problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex bg-gray-100 rounded-lg p-1 self-start" role="group" aria-label="Modo de vista">
          {(["constructor", "egresado"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-bold transition-colors ${modo === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {m === "constructor" ? "Constructor" : "Vista del egresado"}
            </button>
          ))}
        </div>
        {editable && modo === "constructor" && (
          problemas.length > 0 ? (
            <details className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-amber-900 md:max-w-xl">
              <summary className="cursor-pointer font-bold">{problemas.length} problema{problemas.length === 1 ? "" : "s"} por corregir antes de habilitar</summary>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">{problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
            </details>
          ) : (
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">✓ Sin problemas: se puede habilitar</span>
          )
        )}
      </div>

      {modo === "egresado" ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-xl px-4 py-2.5 text-sm">
            Así verá el egresado esta ficha: los pasos de su propuesta y las fechas de su ejecución.
          </div>
          <PasosEgresado definicion={definicion} />
          <CalendarioEjecucion ejecuciones={definicion.etapas.filter(esEtapaEjecucion)} />
        </div>
      ) : (
        <>
          <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            {pestanas.map((p) => (
              <button key={p.id} role="tab" type="button" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
                className={`px-3.5 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px flex items-center gap-1.5 ${pestana === p.id ? "border-brand-red text-brand-red" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {p.texto}
                {p.diseno && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="Diseño de referencia" />}
                {p.marca ? <span className={`text-xs rounded-full px-1.5 py-0.5 ${p.id === "cambios" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>{p.marca}</span> : null}
              </button>
            ))}
          </div>

          {pestana === "propuesta" && <EditorPropuesta definicion={definicion} editable={editable} problemas={problemas} onChange={cambiar} />}
          {pestana === "ejecucion" && <EditorEjecucion definicion={definicion} editable={editable} problemas={problemas} onChange={cambiar} />}
          {pestana === "cierre" && <EditorCierre modalidad={ficha.modalidad} />}
          {pestana === "revision" && <EditorPresentacion key="revision" tipo="revision" modalidad={ficha.modalidad} />}
          {pestana === "publica" && <EditorPresentacion key="publica" tipo="publica" modalidad={ficha.modalidad} />}
          {pestana === "roles" && <EditorRoles />}
          {pestana === "cambios" && <ListaCambios referencia={referencia?.etiqueta ?? null} cambios={cambios} />}
          {pestana === "versiones" && (
            <Versiones ficha={ficha} versiones={versiones} versionActual={version.id} pendiente={pendiente}
              onDeshabilitar={(id, n) => { if (window.confirm(`¿Deshabilitar la versión ${n}? No se borra nada: los procesos que la usaron conservan su historial, pero no podrá asignarse a cohortes nuevas.`)) ejecutar(() => retirarVersion(id), `Versión ${n} deshabilitada.`); }} />
          )}
        </>
      )}

      {habilitando && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titulo-habilitar">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 id="titulo-habilitar" className="text-lg font-bold text-gray-800">Habilitar la versión {version.numero} de {ficha.codigo}</h2>
              <p className="text-sm text-gray-500">Una versión habilitada ya no se edita: los cambios posteriores van en una versión nueva.</p>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {problemas.length > 0 ? (
                <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <strong>No se puede habilitar todavía.</strong>
                  <ul className="list-disc pl-5 mt-1">{problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                    {referencia ? `Cambios respecto a ${referencia.etiqueta}` : "Versión inicial"}
                  </h3>
                  {referencia && cambios.length === 0 && <p className="text-sm text-gray-500">Sin cambios: es igual al origen.</p>}
                  {!referencia && <p className="text-sm text-gray-500">Es la primera versión de esta ficha.</p>}
                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">{cambios.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              <div className="border border-dashed border-gray-300 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Cohortes que usarán esta versión</span>
                <Proximamente texto="Entrega 3" />
              </div>
              <div>
                <label htmlFor="hab-notas" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Notas de la versión (opcional)</label>
                <textarea id="hab-notas" rows={2} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej. Se reduce a 4 períodos por acuerdo del decanato." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" className={`${boton} text-gray-600 hover:bg-gray-100`} onClick={() => setHabilitando(false)}>Cancelar</button>
              <button type="button" className={`${boton} bg-brand-red hover:bg-red-800 text-white`} disabled={pendiente || problemas.length > 0} onClick={confirmarHabilitar}>
                {pendiente ? "Habilitando…" : "Habilitar versión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListaCambios({ referencia, cambios }: { referencia: string | null; cambios: string[] }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      {!referencia ? (
        <p className="text-sm text-gray-500">Esta versión no se copió de otra, así que no hay con qué compararla.</p>
      ) : (
        <>
          <h2 className="font-bold text-gray-800 mb-1">Cambios respecto a {referencia}</h2>
          {cambios.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay cambios.</p>
          ) : (
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 mt-2">{cambios.map((c, i) => <li key={i}>{c}</li>)}</ul>
          )}
        </>
      )}
    </section>
  );
}

function Versiones({
  ficha, versiones, versionActual, pendiente, onDeshabilitar,
}: {
  ficha: Props["ficha"];
  versiones: Props["versiones"];
  versionActual: number;
  pendiente: boolean;
  onDeshabilitar: (id: number, numero: number) => void;
}) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4">
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 self-start">
        <h2 className="font-bold text-gray-800">Generalidades</h2>
        <dl className="text-sm grid grid-cols-[7rem_minmax(0,1fr)] gap-y-2">
          <dt className="text-gray-500">Código</dt><dd className="font-mono font-bold text-gray-800">{ficha.codigo ?? "—"}</dd>
          <dt className="text-gray-500">Nombre</dt><dd className="text-gray-800">{ficha.nombre}</dd>
          <dt className="text-gray-500">Modalidad</dt><dd className="text-gray-800">{ETIQUETA_MODALIDAD[ficha.modalidad]}</dd>
          <dt className="text-gray-500">Alcance</dt><dd className="text-gray-800">{ficha.alcance}</dd>
        </dl>
        <p className="text-xs text-gray-500">El código y el nombre se generan con las generalidades y no cambian: para otro alcance o modalidad se crea otra ficha.</p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-gray-800 mb-3">Versiones</h2>
        <ol className="space-y-2">
          {[...versiones].reverse().map((v) => (
            <li key={v.id} className={`border rounded-lg px-3 py-2.5 ${v.id === versionActual ? "border-brand-red bg-red-50/40" : "border-gray-200"}`}>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/bloques-propuestas/${ficha.id}?v=${v.id}`} className="font-bold text-sm text-gray-800 hover:text-brand-red">Versión {v.numero}</Link>
                  <EstadoVersionBadge estado={v.estado} />
                  {v.id === versionActual && <span className="text-xs text-gray-500">(viendo)</span>}
                </div>
                {v.estado === "habilitada" && !ficha.esBase && (
                  <button type="button" disabled={pendiente} onClick={() => onDeshabilitar(v.id, v.numero)} className="text-xs font-bold text-gray-500 hover:text-red-700">Deshabilitar</button>
                )}
              </div>
              {v.habilitadaEn && <p className="text-xs text-gray-500 mt-1">Habilitada el {new Date(v.habilitadaEn).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })}</p>}
              {v.notas && <p className="text-xs text-gray-600 mt-1">{v.notas}</p>}
            </li>
          ))}
        </ol>
        <div className="mt-3 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <span>Cohortes ligadas a cada versión y procesos en curso</span>
          <Proximamente texto="Entregas 3 y 4" />
        </div>
      </section>
    </div>
  );
}
