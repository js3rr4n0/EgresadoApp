"use client";
// Pestañas de diseño del constructor: Cierre, Presentación de revisión, Presentación pública y Roles.
// Se pueden explorar y modificar en pantalla, pero todavía no se guardan en la ficha (entregas posteriores).

import { useState } from "react";
import {
  ACCIONES_PROCESO,
  APARTADOS_INFORME_FINAL,
  PORTADAS,
  presentacionPorDefecto,
  ROLES_FICHA,
} from "@/lib/fichas/disenoFuturo";
import type { Modalidad } from "@/lib/fichas/tipos";
import { AvisoDiseno, ETIQUETA_MODALIDAD } from "./comunes";
import { campoCompacto, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";

export function EditorCierre({ modalidad }: { modalidad: Modalidad }) {
  const [apartados, setApartados] = useState(() =>
    APARTADOS_INFORME_FINAL.map((a) => ({
      ...a,
      nombre: modalidad !== "pasantia" && a.nombre === "Descripción de la empresa" ? "Descripción de la institución" : a.nombre,
      activo: true,
    }))
  );
  const [portada, setPortada] = useState(0);
  const [paginas, setPaginas] = useState(20);
  const [requisitos, setRequisitos] = useState([
    { nombre: "Todas las actividades del último período aprobadas", activo: true },
    { nombre: "Carta de finalización verificada por el asesor", activo: true },
    { nombre: "Comentarios del asesor para el decanato", activo: true },
  ]);

  function mover(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= apartados.length) return;
    const lista = [...apartados];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    setApartados(lista);
  }

  return (
    <div className="space-y-4">
      <AvisoDiseno entrega="Entrega 6" />
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4">
        <Tarjeta titulo="Estructura del informe final" extra={<span className="text-[11px] text-gray-500">{apartados.filter((a) => a.activo).length} de {apartados.length} apartados</span>}>
          <ol className="space-y-1">
            {apartados.map((a, i) => (
              <li key={a.nombre} className={`flex items-center gap-2 rounded-md px-2 py-1.5 border ${a.activo ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-60"}`}>
                <span className="w-5 text-[11px] font-bold text-gray-400 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{a.nombre}</div>
                  <div className="text-[11px] text-gray-500 truncate">{a.nota}</div>
                </div>
                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${a.origen === "sistema" ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"}`}>
                  {a.origen === "sistema" ? "Lo genera el sistema" : "Lo redacta el egresado"}
                </span>
                <span className="flex flex-col">
                  <button type="button" aria-label={`Subir ${a.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30">▲</button>
                  <button type="button" aria-label={`Bajar ${a.nombre}`} disabled={i === apartados.length - 1} onClick={() => mover(i, 1)} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30">▼</button>
                </span>
                <Interruptor etiqueta={`Incluir ${a.nombre}`} activo={a.activo} onChange={(v) => setApartados(apartados.map((x, k) => (k === i ? { ...x, activo: v } : x)))} />
              </li>
            ))}
          </ol>
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta titulo="Requisitos del informe final">
            <div className="space-y-2.5 text-sm text-gray-700">
              <div>
                <label htmlFor="cie-pag" className={etiquetaCompacta}>Páginas mínimas</label>
                <input id="cie-pag" type="number" className={`${campoCompacto} w-20`} value={paginas} onChange={(e) => setPaginas(Number(e.target.value))} />
              </div>
              {requisitos.map((r, i) => (
                <div key={r.nombre} className="flex items-center justify-between gap-3">
                  <span>{r.nombre}</span>
                  <Interruptor etiqueta={r.nombre} activo={r.activo} onChange={(v) => setRequisitos(requisitos.map((x, k) => (k === i ? { ...x, activo: v } : x)))} />
                </div>
              ))}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Portadas de los documentos">
            <div className="flex gap-1 mb-3" role="tablist">
              {PORTADAS.map((p, i) => (
                <button key={p.documento} type="button" role="tab" aria-selected={portada === i} onClick={() => setPortada(i)}
                  className={`text-xs font-bold rounded-md px-2 py-1 ${portada === i ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}>{p.documento}</button>
              ))}
            </div>
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 items-start">
              <div className="aspect-[3/4] border border-gray-300 rounded bg-white flex flex-col items-center justify-start pt-2 gap-1 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[8px] font-bold text-brand-red">LOGO</div>
                {PORTADAS[portada].textos.map((t) => <div key={t} className="h-1 bg-gray-200 rounded w-3/4" />)}
              </div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="cie-logo" className={etiquetaCompacta}>Logotipo</label>
                  <select id="cie-logo" className={campoCompacto} defaultValue={PORTADAS[portada].logotipo} key={portada}>
                    <option>Logotipo institucional</option>
                    <option>Logotipo de la facultad</option>
                    <option>Logotipo de la carrera</option>
                    <option>Subir otro logotipo…</option>
                  </select>
                </div>
                <div>
                  <span className={etiquetaCompacta}>Textos de la portada</span>
                  <div className="flex flex-wrap gap-1">
                    {PORTADAS[portada].textos.map((t) => <span key={t} className="text-[11px] bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">{t}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

export function EditorPresentacion({ tipo, modalidad }: { tipo: "revision" | "publica"; modalidad: Modalidad }) {
  const [p, setP] = useState(() => presentacionPorDefecto(tipo, modalidad));
  const [activa, setActiva] = useState(true);
  const [nuevo, setNuevo] = useState({ requisitos: "", documentos: "" });
  const titulo = tipo === "revision" ? "Presentación de revisión" : "Presentación pública";

  const lista = (clave: "requisitos" | "documentos", etiqueta: string) => (
      <Tarjeta titulo={etiqueta}>
        <ul className="space-y-1">
          {p[clave].map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-100 rounded-md px-2 py-1">
              <span className="text-gray-400" aria-hidden="true">•</span>
              <span className="flex-1">{r}</span>
              <button type="button" className="text-xs font-bold text-gray-400 hover:text-red-700" onClick={() => setP({ ...p, [clave]: p[clave].filter((_, k) => k !== i) })}>Quitar</button>
            </li>
          ))}
        </ul>
        <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (!nuevo[clave].trim()) return; setP({ ...p, [clave]: [...p[clave], nuevo[clave].trim()] }); setNuevo({ ...nuevo, [clave]: "" }); }}>
          <label className="sr-only" htmlFor={`pres-${tipo}-${clave}`}>Agregar</label>
          <input id={`pres-${tipo}-${clave}`} className={campoCompacto} value={nuevo[clave]} onChange={(e) => setNuevo({ ...nuevo, [clave]: e.target.value })} placeholder="Agregar…" />
          <button type="submit" className="text-xs font-bold text-brand-red border border-gray-200 rounded-md px-2.5 hover:border-brand-red">Agregar</button>
        </form>
      </Tarjeta>
  );

  return (
    <div className="space-y-4">
      <AvisoDiseno entrega="Entrega posterior">
        Diseño de referencia de la {titulo.toLowerCase()} para {ETIQUETA_MODALIDAD[modalidad].toLowerCase()}. Los valores son un ejemplo para definir con el asesor; cada modalidad tendrá los suyos. No se guardan todavía.
      </AvisoDiseno>
      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
        <div>
          <div className="font-bold text-gray-800 text-sm">{titulo}</div>
          <div className="text-xs text-gray-500">{tipo === "revision" ? "Revisión interna del trabajo antes de la presentación pública." : "Defensa ante jurado al finalizar el proceso."}</div>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
          Esta ficha la incluye
          <Interruptor etiqueta={`Incluir ${titulo}`} activo={activa} onChange={setActiva} />
        </label>
      </div>
      {activa && (
        <div className="grid lg:grid-cols-2 gap-4">
          {lista("requisitos", "Requisitos para solicitarla")}
          {lista("documentos", "Documentos que se presentan")}
          <Tarjeta titulo="Participantes">
            <div className="flex flex-wrap gap-1.5">
              {p.participantes.map((x) => <span key={x} className="text-xs font-bold bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">{x}</span>)}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Desarrollo y evaluación">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor={`pres-${tipo}-dur`} className="text-sm text-gray-700">Duración</label>
                <input id={`pres-${tipo}-dur`} type="number" className={`${campoCompacto} w-20`} value={p.duracionMinutos} onChange={(e) => setP({ ...p, duracionMinutos: Number(e.target.value) })} />
                <span className="text-xs text-gray-500">minutos</span>
              </div>
              <p className="text-sm text-gray-700">{p.evaluacion}</p>
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  );
}

export function EditorRoles() {
  const [asignacion, setAsignacion] = useState(() => Object.fromEntries(ACCIONES_PROCESO.map((a) => [a.clave, a.rol as string])));
  const [conCoordinadores, setConCoordinadores] = useState(true);
  const etapas = [...new Set(ACCIONES_PROCESO.map((a) => a.etapa))];

  return (
    <div className="space-y-4">
      <AvisoDiseno entrega="Entrega 7">
        Quién realiza cada acción del proceso. Los valores marcados son los de hoy; la ficha permitirá cambiarlos. No se guardan todavía.
      </AvisoDiseno>
      <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm">
        <span className="text-gray-700">El decanato trabaja con coordinadores (si no, el admin de decanato asigna al asesor directamente).</span>
        <Interruptor etiqueta="Trabaja con coordinadores" activo={conCoordinadores} onChange={setConCoordinadores} />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[40rem]">
          <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Acción</th>
              {ROLES_FICHA.filter((r) => conCoordinadores || r.clave !== "coord").map((r) => <th key={r.clave} className="px-3 py-2.5 text-center">{r.nombre}</th>)}
            </tr>
          </thead>
          {etapas.map((etapa) => (
            <tbody key={etapa} className="divide-y divide-gray-100">
              <tr><td colSpan={5} className="px-4 pt-3 pb-1 text-[11px] font-bold text-brand-red uppercase tracking-wide">{etapa}</td></tr>
              {ACCIONES_PROCESO.filter((a) => a.etapa === etapa).map((a) => (
                <tr key={a.clave}>
                  <td className="px-4 py-2 text-gray-700">{a.nombre}</td>
                  {ROLES_FICHA.filter((r) => conCoordinadores || r.clave !== "coord").map((r) => (
                    <td key={r.clave} className="px-3 py-2 text-center">
                      <input type="radio" name={`rol-${a.clave}`} aria-label={`${a.nombre}: ${r.nombre}`} className="accent-brand-red"
                        checked={asignacion[a.clave] === r.clave || (!conCoordinadores && asignacion[a.clave] === "coord" && r.clave === "admin_dec")}
                        onChange={() => setAsignacion({ ...asignacion, [a.clave]: r.clave })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
