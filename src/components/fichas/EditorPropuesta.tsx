"use client";

import { useState } from "react";
import { CATALOGO, parametrosPorDefecto, type DefinicionParametro } from "@/lib/fichas/catalogo";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import type { ClaveElemento, DefinicionFicha, Espacio, EtapaPropuesta, ValorParametro } from "@/lib/fichas/tipos";
import { nuevoId } from "./ids";

const GRUPOS = ["Generales", "Institución", "Planificación", "Proyecto", "Documentos"] as const;
const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red disabled:bg-gray-50 disabled:text-gray-500";
const etiqueta = "block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5";

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

  return (
    <div className="space-y-5">
      <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <span className={etiqueta}>Participantes por trabajo</span>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <label className="sr-only" htmlFor="part-min">Mínimo</label>
            <input id="part-min" type="number" min={1} max={10} className={`${campo} w-20`} disabled={!editable}
              value={definicion.participantes.min}
              onChange={(e) => onChange({ ...definicion, participantes: { ...definicion.participantes, min: Number(e.target.value) } })} />
            <span>a</span>
            <label className="sr-only" htmlFor="part-max">Máximo</label>
            <input id="part-max" type="number" min={1} max={10} className={`${campo} w-20`} disabled={!editable}
              value={definicion.participantes.max}
              onChange={(e) => onChange({ ...definicion, participantes: { ...definicion.participantes, max: Number(e.target.value) } })} />
            <span>egresado(s)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 max-w-md">Con más de un participante, la portada permite invitar integrantes y algunos elementos ofrecen reglas por integrante.</p>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-5">
        <section className="space-y-3 min-w-0">
          <h2 className="text-sm font-bold text-gray-700">Espacios de la propuesta <span className="text-gray-400 font-medium">({etapa.espacios.length})</span></h2>
          <ol className="space-y-2">
            {etapa.espacios.map((e, i) => {
              const malos = problemasDe(e.id).length;
              return (
                <li key={e.id}
                  draggable={editable}
                  onDragStart={() => setArrastrando(i)}
                  onDragOver={(ev) => { if (arrastrando !== null) ev.preventDefault(); }}
                  onDrop={() => { if (arrastrando !== null) mover(arrastrando, i); setArrastrando(null); }}
                  onDragEnd={() => setArrastrando(null)}
                  className={`group flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${seleccion === e.id ? "border-brand-red ring-1 ring-brand-red/30" : "border-gray-200 hover:border-gray-300"} ${arrastrando === i ? "opacity-50" : ""}`}
                  onClick={() => setSeleccion(e.id)}
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-gray-800 truncate">{e.titulo || "(sin título)"}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {CATALOGO[e.elemento]?.nombre ?? e.elemento}
                      {!e.obligatorio && " · opcional"}
                      {e.origenFase1 && " · paso actual"}
                    </div>
                  </div>
                  {malos > 0 && <span className="text-xs font-bold text-red-700 bg-red-50 rounded px-1.5 py-0.5" title="Problemas en este espacio">{malos}</span>}
                  {editable && (
                    <span className="flex flex-col">
                      <button type="button" aria-label={`Subir ${e.titulo}`} className="text-gray-400 hover:text-gray-800 leading-none px-1 disabled:opacity-30" disabled={i === 0}
                        onClick={(ev) => { ev.stopPropagation(); mover(i, i - 1); }}>▲</button>
                      <button type="button" aria-label={`Bajar ${e.titulo}`} className="text-gray-400 hover:text-gray-800 leading-none px-1 disabled:opacity-30" disabled={i === etapa.espacios.length - 1}
                        onClick={(ev) => { ev.stopPropagation(); mover(i, i + 1); }}>▼</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {editable && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Agregar espacio</h3>
              <div className="space-y-2">
                {GRUPOS.map((g) => {
                  const elementos = Object.values(CATALOGO).filter((el) => el.grupo === g);
                  return (
                    <div key={g} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500 w-24 shrink-0">{g}</span>
                      {elementos.map((el) => {
                        const fueraDeModalidad = !el.modalidades.includes(definicion.modalidad);
                        const yaEsta = !el.repetible && presentes.has(el.clave);
                        const motivo = fueraDeModalidad ? "Todavía no disponible en esta modalidad" : yaEsta ? "Ya está en la propuesta" : el.descripcion;
                        return (
                          <button key={el.clave} type="button" title={motivo} disabled={fueraDeModalidad || yaEsta} onClick={() => agregar(el.clave)}
                            className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-brand-red hover:text-brand-red disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 disabled:cursor-not-allowed">
                            + {el.nombre}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 min-w-0 self-start">
          {!espacio ? (
            <p className="text-sm text-gray-500">Selecciona un espacio para ver su configuración.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-brand-red uppercase tracking-wide">{CATALOGO[espacio.elemento]?.nombre}</div>
                  <p className="text-xs text-gray-500 mt-0.5">{CATALOGO[espacio.elemento]?.descripcion}</p>
                </div>
                {editable && (
                  <button type="button" onClick={quitar} className="text-xs font-bold text-gray-500 hover:text-red-700 shrink-0">Quitar</button>
                )}
              </div>

              {problemasDe(espacio.id).length > 0 && (
                <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                  {problemasDe(espacio.id).map((p, i) => <li key={i}>{p.mensaje}</li>)}
                </ul>
              )}

              <div>
                <label htmlFor="esp-titulo" className={etiqueta}>Título del paso</label>
                <input id="esp-titulo" className={campo} disabled={!editable} value={espacio.titulo} onChange={(e) => actualizar({ titulo: e.target.value })} maxLength={80} />
              </div>
              <div>
                <label htmlFor="esp-desc" className={etiqueta}>Descripción corta</label>
                <input id="esp-desc" className={campo} disabled={!editable} value={espacio.descripcion} onChange={(e) => actualizar({ descripcion: e.target.value })} maxLength={120} placeholder="Se muestra debajo del título en la lista de pasos" />
              </div>
              <div>
                <label htmlFor="esp-ayuda" className={etiqueta}>Ayuda para el egresado</label>
                <textarea id="esp-ayuda" rows={3} className={campo} disabled={!editable} value={espacio.ayuda} onChange={(e) => actualizar({ ayuda: e.target.value })} maxLength={600} placeholder="Instrucciones que verá al completar este paso" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" disabled={!editable} checked={espacio.obligatorio} onChange={(e) => actualizar({ obligatorio: e.target.checked })} className="accent-brand-red" />
                Es obligatorio para enviar la propuesta
              </label>

              {(CATALOGO[espacio.elemento]?.parametros.length ?? 0) > 0 && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Reglas</h3>
                  {CATALOGO[espacio.elemento].parametros.map((p) => (
                    <CampoParametro key={p.clave} parametro={p} valor={espacio.parametros[p.clave]} editable={editable}
                      equipo={definicion.participantes.max > 1} onChange={(v) => actualizarParametro(p.clave, v)} />
                  ))}
                </div>
              )}

              {espacio.origenFase1 && (
                <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                  Este espacio corresponde a un paso del asistente actual; sus respuestas se guardan en <code className="text-gray-700">{espacio.origenFase1}</code>.
                </p>
              )}
            </div>
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
        <label htmlFor={id} className="block text-sm text-gray-700 mb-1">{p.etiqueta}</label>
        <div className="flex items-center gap-2">
          <input id={id} type="number" min={p.min} max={p.max} className={`${campo} w-28`} disabled={!editable}
            value={typeof valor === "number" ? valor : p.porDefecto} onChange={(e) => onChange(Number(e.target.value))} />
          {p.sufijo && <span className="text-sm text-gray-500">{p.sufijo}</span>}
        </div>
        {p.ayuda && <p className="text-xs text-gray-500 mt-1">{p.ayuda}</p>}
      </div>
    );
  }
  if (p.tipo === "booleano") {
    const bloqueado = Boolean(p.soloEquipo && !equipo);
    return (
      <label className={`flex items-start gap-2 text-sm ${bloqueado ? "text-gray-400" : "text-gray-700"}`}>
        <input type="checkbox" className="accent-brand-red mt-0.5" disabled={!editable || (bloqueado && valor !== true)}
          checked={valor === true} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {p.etiqueta}
          {bloqueado && <span className="block text-xs">Solo aplica a trabajos en equipo.</span>}
        </span>
      </label>
    );
  }
  const seleccion = Array.isArray(valor) ? valor : p.porDefecto;
  return (
    <fieldset>
      <legend className="text-sm text-gray-700 mb-1">{p.etiqueta}</legend>
      <div className="space-y-1">
        {p.opciones.map((o) => (
          <label key={o.valor} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="accent-brand-red" disabled={!editable} checked={seleccion.includes(o.valor)}
              onChange={(e) => onChange(e.target.checked ? [...seleccion, o.valor] : seleccion.filter((x) => x !== o.valor))} />
            {o.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
