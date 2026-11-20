"use client";
// Pestañas de diseño del constructor: Presentación de revisión, Presentación pública y Roles. (La pestaña «Cierre» se
// quitó el 20-nov-2026: el informe final ya es su propia pestaña y el informe del último período es como los demás.)
// Se pueden explorar y modificar en pantalla, pero todavía no se guardan en la ficha (entregas posteriores).

import { useState } from "react";
import {
  ACCIONES_PROCESO,
  presentacionPorDefecto,
  ROLES_FICHA,
} from "@/lib/fichas/disenoFuturo";
import type { Modalidad } from "@/lib/fichas/tipos";
import { AvisoDiseno, ETIQUETA_MODALIDAD } from "./comunes";
import { campoCompacto, Interruptor, Tarjeta } from "./EditorPropuesta";

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
