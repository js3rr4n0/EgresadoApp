"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  actualizarDatosFicha,
  crearFicha,
  descartarBorrador,
  guardarBorrador,
  habilitarVersion,
  nuevaVersion,
  retirarVersion,
} from "@/app/actions/fichas";
import { compararDefiniciones } from "@/lib/fichas/diferencias";
import { validarDefinicion, type ProblemaFicha } from "@/lib/fichas/validar";
import type { DefinicionFicha, EstadoVersion, Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD, EstadoVersionBadge } from "./comunes";
import EditorPropuesta from "./EditorPropuesta";
import EditorEjecucion from "./EditorEjecucion";
import VistaPrevia from "./VistaPrevia";

type Pestana = "propuesta" | "ejecucion" | "vista" | "cambios" | "datos";

interface Props {
  ficha: { id: number; nombre: string; modalidad: Modalidad; esBase: boolean; facultadId: number | null; carreraId: number | null };
  versiones: { id: number; numero: number; estado: EstadoVersion; habilitadaEn: string | null; notas: string | null }[];
  version: { id: number; numero: number; estado: EstadoVersion; definicion: DefinicionFicha };
  referencia: { etiqueta: string; definicion: DefinicionFicha } | null;
  facultades: { id: number; nombre: string }[];
  carreras: { id: number; nombre: string; facultadId: number }[];
}

const boton = "px-3.5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function EditorFicha({ ficha, versiones, version, referencia, facultades, carreras }: Props) {
  const router = useRouter();
  const editable = version.estado === "borrador" && !ficha.esBase;
  const [definicion, setDefinicion] = useState<DefinicionFicha>(version.definicion);
  const [sucio, setSucio] = useState(false);
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

  const pestanas: { id: Pestana; texto: string; marca?: number }[] = [
    { id: "propuesta", texto: "Propuesta", marca: problemas.filter((p) => p.ubicacion.includes("/")).length },
    { id: "ejecucion", texto: "Ejecución", marca: problemas.filter((p) => p.ubicacion !== "ficha" && !p.ubicacion.includes("/")).length },
    { id: "vista", texto: "Vista previa" },
    { id: "cambios", texto: "Cambios", marca: cambios.length || undefined },
    { id: "datos", texto: "Datos y versiones" },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="space-y-3">
        <Link href="/admin/bloques-propuestas" className="text-sm text-gray-500 hover:text-brand-red">← Fichas</Link>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800">{ficha.nombre}</h1>
              <EstadoVersionBadge estado={version.estado} texto={`Versión ${version.numero} · ${version.estado}`} />
              {sucio && <span className="text-xs font-bold text-amber-700">Cambios sin guardar</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {ETIQUETA_MODALIDAD[ficha.modalidad]} · {definicion.participantes.max > 1 ? `de ${definicion.participantes.min} a ${definicion.participantes.max} participantes` : "individual"}
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
                onClick={() => {
                  const nombre = window.prompt("Nombre de la ficha nueva:", `${ETIQUETA_MODALIDAD[ficha.modalidad]} — personalizada`);
                  if (!nombre) return;
                  ejecutar(async () => {
                    const res = await crearFicha({ nombre, modalidad: ficha.modalidad, facultadId: null, carreraId: null, partirDeVersionId: version.id });
                    if (res.success) router.push(`/admin/bloques-propuestas/${res.fichaId}`);
                    return res;
                  }, "Ficha creada a partir de la base.");
                }}>
                Crear ficha a partir de esta
              </button>
            )}
          </div>
        </div>
      </div>

      {mensaje && (
        <div role="status" className={`rounded-xl px-4 py-3 text-sm border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {mensaje.texto}
          {mensaje.problemas && mensaje.problemas.length > 0 && (
            <ul className="list-disc pl-5 mt-1">{mensaje.problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
          )}
        </div>
      )}

      {editable && problemas.length > 0 && (
        <details className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
          <summary className="cursor-pointer font-bold">
            {problemas.length} problema{problemas.length === 1 ? "" : "s"} por corregir antes de habilitar
          </summary>
          <ul className="list-disc pl-5 mt-2 space-y-0.5">{problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
        </details>
      )}
      {editable && problemas.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800">La ficha no tiene problemas: se puede habilitar.</div>
      )}

      <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto overflow-y-hidden">
        {pestanas.map((p) => (
          <button key={p.id} role="tab" type="button" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
            className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${pestana === p.id ? "border-brand-red text-brand-red" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {p.texto}
            {p.marca ? <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${p.id === "cambios" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>{p.marca}</span> : null}
          </button>
        ))}
      </div>

      {pestana === "propuesta" && <EditorPropuesta definicion={definicion} editable={editable} problemas={problemas} onChange={cambiar} />}
      {pestana === "ejecucion" && <EditorEjecucion definicion={definicion} editable={editable} problemas={problemas} onChange={cambiar} />}
      {pestana === "vista" && <VistaPrevia definicion={definicion} />}
      {pestana === "cambios" && <ListaCambios referencia={referencia?.etiqueta ?? null} cambios={cambios} />}
      {pestana === "datos" && (
        <DatosYVersiones ficha={ficha} versiones={versiones} versionActual={version.id} facultades={facultades} carreras={carreras}
          pendiente={pendiente}
          onGuardar={(d) => ejecutar(() => actualizarDatosFicha(ficha.id, d), "Datos de la ficha actualizados.")}
          onRetirar={(id, n) => { if (window.confirm(`¿Retirar la versión ${n}? Dejará de poder asignarse a cohortes nuevas.`)) ejecutar(() => retirarVersion(id), `Versión ${n} retirada.`); }} />
      )}

      {habilitando && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titulo-habilitar">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 id="titulo-habilitar" className="text-lg font-bold text-gray-800">Habilitar la versión {version.numero}</h2>
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
                  {!referencia && <p className="text-sm text-gray-500">Es la primera versión de esta ficha, creada desde la ficha base.</p>}
                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">{cambios.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              <div>
                <label htmlFor="hab-notas" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Notas de la versión (opcional)</label>
                <textarea id="hab-notas" rows={3} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)}
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

function DatosYVersiones({
  ficha, versiones, versionActual, facultades, carreras, pendiente, onGuardar, onRetirar,
}: {
  ficha: Props["ficha"];
  versiones: Props["versiones"];
  versionActual: number;
  facultades: Props["facultades"];
  carreras: Props["carreras"];
  pendiente: boolean;
  onGuardar: (d: { nombre: string; facultadId: number | null; carreraId: number | null }) => void;
  onRetirar: (id: number, numero: number) => void;
}) {
  const [nombre, setNombre] = useState(ficha.nombre);
  const [facultadId, setFacultadId] = useState(ficha.facultadId ? String(ficha.facultadId) : "");
  const [carreraId, setCarreraId] = useState(ficha.carreraId ? String(ficha.carreraId) : "");
  const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-gray-800">Datos de la ficha</h2>
        <div>
          <label htmlFor="df-nombre" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Nombre</label>
          <input id="df-nombre" className={campo} disabled={ficha.esBase} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="df-fac" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Facultad</label>
            <select id="df-fac" className={campo} disabled={ficha.esBase} value={facultadId} onChange={(e) => { setFacultadId(e.target.value); setCarreraId(""); }}>
              <option value="">Todas las facultades</option>
              {facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="df-car" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Carrera</label>
            <select id="df-car" className={campo} disabled={ficha.esBase || !facultadId} value={carreraId} onChange={(e) => setCarreraId(e.target.value)}>
              <option value="">Todas las carreras</option>
              {carreras.filter((c) => String(c.facultadId) === facultadId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
        {!ficha.esBase && (
          <button type="button" disabled={pendiente} className={`${boton} border border-gray-300 text-gray-700 hover:bg-gray-50`}
            onClick={() => onGuardar({ nombre, facultadId: facultadId ? Number(facultadId) : null, carreraId: carreraId ? Number(carreraId) : null })}>
            Guardar datos
          </button>
        )}
        <p className="text-xs text-gray-500">La modalidad no se cambia: para otra modalidad se crea una ficha nueva.</p>
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
                  <button type="button" disabled={pendiente} onClick={() => onRetirar(v.id, v.numero)} className="text-xs font-bold text-gray-500 hover:text-red-700">Retirar</button>
                )}
              </div>
              {v.habilitadaEn && <p className="text-xs text-gray-500 mt-1">Habilitada el {new Date(v.habilitadaEn).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })}</p>}
              {v.notas && <p className="text-xs text-gray-600 mt-1">{v.notas}</p>}
            </li>
          ))}
        </ol>
        <p className="text-xs text-gray-500 mt-3">
          Más adelante (entrega 3) cada cohorte quedará ligada a una versión habilitada: los procesos en curso conservan las reglas con las que empezaron.
        </p>
      </section>
    </div>
  );
}
