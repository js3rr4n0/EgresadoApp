"use client";

import { useState } from "react";
import { CATALOGO, parametrosPorDefecto, type DefinicionParametro } from "@/lib/fichas/catalogo";
import { CAMPOS_ELEMENTO } from "@/lib/fichas/disenoFuturo";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import type { ClaveElemento, DefinicionFicha, Espacio, EtapaPropuesta, ValorParametro } from "@/lib/fichas/tipos";
import { Proximamente } from "./comunes";
import { nuevoId } from "./ids";

const GRUPOS = ["Generales", "Institución", "Planificación", "Proyecto", "Documentos"] as const;
export const campoCompacto =
  "w-full h-9 border border-gray-300 rounded-md px-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/25 focus:border-brand-red disabled:bg-gray-50 disabled:text-gray-500";
export const etiquetaCompacta = "block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1";

export function Tarjeta({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/70 rounded-t-lg">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{titulo}</h3>
        {extra}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function Interruptor({ activo, onChange, deshabilitado, etiqueta }: { activo: boolean; onChange?: (v: boolean) => void; deshabilitado?: boolean; etiqueta: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado} onClick={() => onChange?.(!activo)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activo ? "bg-brand-red" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${activo ? "left-[1.125rem]" : "left-0.5"}`} />
    </button>
  );
}

export default function EditorPropuesta({
  definicion,
  editable,
  problemas,
  onChange,
}: {
  definicion: DefinicionFicha;
  editable: boolean;
  problemas: ProblemaFicha[];
  onChange: (d: DefinicionFicha) => void;
}) {
  const indiceEtapa = definicion.etapas.findIndex((e) => e.tipo === "propuesta");
  const etapa = definicion.etapas[indiceEtapa] as EtapaPropuesta;
  const [seleccion, setSeleccion] = useState<string | null>(etapa.espacios[0]?.id ?? null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const espacio = etapa.espacios.find((e) => e.id === seleccion) ?? null;

  function cambiarEspacios(espacios: Espacio[]) {
    const etapas = [...definicion.etapas];
    etapas[indiceEtapa] = { ...etapa, espacios };
    onChange({ ...definicion, etapas });
  }

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= etapa.espacios.length || desde === hasta) return;
    const lista = [...etapa.espacios];
    const [item] = lista.splice(desde, 1);
    lista.splice(hasta, 0, item);
    cambiarEspacios(lista);
  }

  function agregar(clave: ClaveElemento) {
    const el = CATALOGO[clave];
    const nuevo: Espacio = {
      id: nuevoId(clave),
      elemento: clave,
      titulo: el.nombre,
      descripcion: "",
      ayuda: "",
      obligatorio: true,
      parametros: parametrosPorDefecto(clave),
    };
    cambiarEspacios([...etapa.espacios, nuevo]);
    setSeleccion(nuevo.id);
  }

  function actualizar(cambios: Partial<Espacio>) {
    if (!espacio) return;
    cambiarEspacios(etapa.espacios.map((e) => (e.id === espacio.id ? { ...e, ...cambios } : e)));
  }

  function actualizarParametro(clave: string, valor: ValorParametro) {
    if (!espacio) return;
    actualizar({ parametros: { ...espacio.parametros, [clave]: valor } });
  }

  function quitar() {
    if (!espacio) return;
    const aviso = espacio.origenFase1
      ? `"${espacio.titulo}" corresponde a un paso del asistente actual. ¿Quitarlo de esta ficha?`
      : `¿Quitar "${espacio.titulo}" de esta ficha?`;
    if (!window.confirm(aviso)) return;
    const resto = etapa.espacios.filter((e) => e.id !== espacio.id);
    cambiarEspacios(resto);
    setSeleccion(resto[0]?.id ?? null);
  }

  const presentes = new Set(etapa.espacios.map((e) => e.elemento));
  const problemasDe = (id: string) => problemas.filter((p) => p.ubicacion === `${etapa.id}/${id}`);
  const elemento = espacio ? CATALOGO[espacio.elemento] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Participantes por trabajo</span>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label className="sr-only" htmlFor="part-min">Mínimo</label>
          <input id="part-min" type="number" min={1} max={10} className={`${campoCompacto} w-16`} disabled={!editable}
            value={definicion.participantes.min}
            onChange={(e) => onChange({ ...definicion, participantes: { ...definicion.participantes, min: Number(e.target.value) } })} />
          <span>a</span>
          <label className="sr-only" htmlFor="part-max">Máximo</label>
          <input id="part-max" type="number" min={1} max={10} className={`${campoCompacto} w-16`} disabled={!editable}
            value={definicion.participantes.max}
            onChange={(e) => onChange({ ...definicion, participantes: { ...definicion.participantes, max: Number(e.target.value) } })} />
          <span>egresado(s)</span>
        </div>
        <span className="text-xs text-gray-500">{definicion.participantes.max > 1 ? "Trabajo en equipo: la portada permite invitar integrantes." : "Trabajo individual."}</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
        <section className="space-y-3 min-w-0">
          <h2 className="text-sm font-bold text-gray-700">Espacios de la propuesta <span className="text-gray-400 font-medium">({etapa.espacios.length})</span></h2>
          <ol className="space-y-1.5">
            {etapa.espacios.map((e, i) => {
              const malos = problemasDe(e.id).length;
              return (
                <li key={e.id}
                  draggable={editable}
                  onDragStart={() => setArrastrando(i)}
                  onDragOver={(ev) => { if (arrastrando !== null) ev.preventDefault(); }}
                  onDrop={() => { if (arrastrando !== null) mover(arrastrando, i); setArrastrando(null); }}
                  onDragEnd={() => setArrastrando(null)}
                  className={`group flex items-center gap-2.5 bg-white border rounded-lg pl-2 pr-1.5 py-2 cursor-pointer transition-colors ${seleccion === e.id ? "border-brand-red ring-1 ring-brand-red/30 bg-red-50/30" : "border-gray-200 hover:border-gray-300"} ${arrastrando === i ? "opacity-50" : ""}`}
                  onClick={() => setSeleccion(e.id)}
                >
                  {editable && <span className="text-gray-300 cursor-grab select-none" aria-hidden="true">⋮⋮</span>}
                  <span className="w-6 h-6 shrink-0 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-gray-800 truncate">{e.titulo || "(sin título)"}</div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {CATALOGO[e.elemento]?.nombre ?? e.elemento}
                      {!e.obligatorio && " · opcional"}
                    </div>
                  </div>
                  {malos > 0 && <span className="text-xs font-bold text-red-700 bg-red-50 rounded px-1.5 py-0.5" title="Problemas en este espacio">{malos}</span>}
                  {editable && (
                    <span className="flex flex-col">
                      <button type="button" aria-label={`Subir ${e.titulo}`} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30" disabled={i === 0}
                        onClick={(ev) => { ev.stopPropagation(); mover(i, i - 1); }}>▲</button>
                      <button type="button" aria-label={`Bajar ${e.titulo}`} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30" disabled={i === etapa.espacios.length - 1}
                        onClick={(ev) => { ev.stopPropagation(); mover(i, i + 1); }}>▼</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {editable && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-3">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Agregar espacio desde el catálogo</h3>
              <div className="space-y-1.5">
                {GRUPOS.map((g) => (
                  <div key={g} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-500 w-20 shrink-0">{g}</span>
                    {Object.values(CATALOGO).filter((el) => el.grupo === g).map((el) => {
                      const fueraDeModalidad = !el.modalidades.includes(definicion.modalidad);
                      const yaEsta = !el.repetible && presentes.has(el.clave);
                      const motivo = fueraDeModalidad ? "Todavía no disponible en esta modalidad" : yaEsta ? "Ya está en la propuesta" : el.descripcion;
                      return (
                        <button key={el.clave} type="button" title={motivo} disabled={fueraDeModalidad || yaEsta} onClick={() => agregar(el.clave)}
                          className="text-xs font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:border-brand-red hover:text-brand-red disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 disabled:cursor-not-allowed">
                          + {el.nombre}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl min-w-0 self-start">
          {!espacio || !elemento ? (
            <p className="text-sm text-gray-500 p-5">Selecciona un espacio para ver su configuración.</p>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 py-3 border-b border-gray-100">
                <div className="min-w-0">
                  <span className="inline-block text-[11px] font-bold text-brand-red bg-red-50 rounded px-1.5 py-0.5 uppercase tracking-wide">{elemento.nombre}</span>
                  <p className="text-xs text-gray-500 mt-1">{elemento.descripcion}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    Obligatorio
                    <Interruptor etiqueta="Obligatorio" activo={espacio.obligatorio} deshabilitado={!editable} onChange={(v) => actualizar({ obligatorio: v })} />
                  </label>
                  {editable && <button type="button" onClick={quitar} className="text-xs font-bold text-gray-400 hover:text-red-700">Quitar</button>}
                </div>
              </header>

              <div className="p-4 space-y-3">
                {problemasDe(espacio.id).length > 0 && (
                  <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                    {problemasDe(espacio.id).map((p, i) => <li key={i}>{p.mensaje}</li>)}
                  </ul>
                )}

                <Tarjeta titulo="Contenido del paso">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="esp-titulo" className={etiquetaCompacta}>Título</label>
                      <input id="esp-titulo" className={campoCompacto} disabled={!editable} value={espacio.titulo} onChange={(e) => actualizar({ titulo: e.target.value })} maxLength={80} />
                    </div>
                    <div>
                      <label htmlFor="esp-desc" className={etiquetaCompacta}>Descripción corta</label>
                      <input id="esp-desc" className={campoCompacto} disabled={!editable} value={espacio.descripcion} onChange={(e) => actualizar({ descripcion: e.target.value })} maxLength={120} placeholder="Debajo del título" />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="esp-ayuda" className={etiquetaCompacta}>Ayuda para el egresado</label>
                      <textarea id="esp-ayuda" rows={2} disabled={!editable} value={espacio.ayuda} onChange={(e) => actualizar({ ayuda: e.target.value })} maxLength={600}
                        placeholder="Instrucciones que verá al completar este paso"
                        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-red/25 focus:border-brand-red disabled:bg-gray-50 disabled:text-gray-500" />
                    </div>
                  </div>
                </Tarjeta>

                {elemento.parametros.length > 0 && (
                  <Tarjeta titulo="Reglas">
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
                      {elemento.parametros.map((p) => (
                        <CampoParametro key={p.clave} parametro={p} valor={espacio.parametros[p.clave]} editable={editable}
                          equipo={definicion.participantes.max > 1} onChange={(v) => actualizarParametro(p.clave, v)} />
                      ))}
                    </div>
                  </Tarjeta>
                )}

                <Tarjeta titulo="Campos que se piden" extra={<Proximamente texto="Configurable más adelante" />}>
                  <ul className="divide-y divide-gray-100">
                    {CAMPOS_ELEMENTO[espacio.elemento].map((c) => (
                      <li key={c.nombre} className="flex items-center gap-2 py-1.5 text-sm">
                        <span className="text-gray-300" aria-hidden="true">⋮⋮</span>
                        <span className="flex-1 text-gray-700">{c.nombre}</span>
                        <span className="text-[11px] text-gray-400 w-20">{c.tipo}</span>
                        <Interruptor etiqueta={`Pedir ${c.nombre}`} activo deshabilitado />
                      </li>
                    ))}
                  </ul>
                  <button type="button" disabled className="mt-2 text-xs font-bold text-gray-400 border border-dashed border-gray-300 rounded-md px-2 py-1 cursor-not-allowed">
                    + Agregar campo
                  </button>
                </Tarjeta>

                {espacio.origenFase1 && (
                  <p className="text-[11px] text-gray-400">
                    Paso del asistente actual; sus respuestas se guardan en <code>{espacio.origenFase1}</code>.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function CampoParametro({
  parametro: p,
  valor,
  editable,
  equipo,
  onChange,
}: {
  parametro: DefinicionParametro;
  valor: ValorParametro | undefined;
  editable: boolean;
  equipo: boolean;
  onChange: (v: ValorParametro) => void;
}) {
  const id = `par-${p.clave}`;
  if (p.tipo === "numero") {
    return (
      <div>
        <label htmlFor={id} className="block text-xs text-gray-600 mb-1">{p.etiqueta}</label>
        <div className="flex items-center gap-2">
          <input id={id} type="number" min={p.min} max={p.max} className={`${campoCompacto} w-24`} disabled={!editable}
            value={typeof valor === "number" ? valor : p.porDefecto} onChange={(e) => onChange(Number(e.target.value))} />
          {p.sufijo && <span className="text-xs text-gray-500">{p.sufijo}</span>}
          {p.ayuda && <span className="text-[11px] text-gray-400">{p.ayuda}</span>}
        </div>
      </div>
    );
  }
  if (p.tipo === "booleano") {
    const bloqueado = Boolean(p.soloEquipo && !equipo);
    return (
      <div className={`flex items-start justify-between gap-3 sm:col-span-2 text-sm ${bloqueado ? "text-gray-400" : "text-gray-700"}`}>
        <span>
          {p.etiqueta}
          {bloqueado && <span className="block text-[11px]">Solo aplica a trabajos en equipo.</span>}
        </span>
        <Interruptor etiqueta={p.etiqueta} activo={valor === true} deshabilitado={!editable || (bloqueado && valor !== true)} onChange={onChange} />
      </div>
    );
  }
  const seleccion = Array.isArray(valor) ? valor : p.porDefecto;
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-xs text-gray-600 mb-1">{p.etiqueta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {p.opciones.map((o) => {
          const activo = seleccion.includes(o.valor);
          return (
            <button key={o.valor} type="button" disabled={!editable} aria-pressed={activo}
              onClick={() => onChange(activo ? seleccion.filter((x) => x !== o.valor) : [...seleccion, o.valor])}
              className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-colors disabled:cursor-not-allowed ${activo ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-gray-200 text-gray-500"}`}>
              {activo ? "✓ " : ""}{o.etiqueta}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
