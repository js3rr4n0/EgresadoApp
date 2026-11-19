"use client";

// Subapartados de un apartado académico en el constructor (ajustes al protocolo, 19-nov-2026): activar o desactivar
// cada uno, renombrarlo, cambiar su ayuda y sus reglas (obligatorio, palabras, elementos o filas), ordenarlos y agregar
// subapartados propios. Lo que no se cambia toma el valor del tipo. La metodología ofrece plantillas por enfoque.
import { useState } from "react";
import { configInicial, configMetodologia, ENFOQUES_METODOLOGIA, partesConfiguradas } from "@/lib/fichas/apartadosAcademicos";
import type { ConfigParte, Espacio } from "@/lib/fichas/tipos";
import { campoCompacto, Interruptor } from "./EditorPropuesta";

const FORMATO: Record<string, string> = { texto: "Texto", pregunta: "Pregunta", seleccion: "Selección", lista: "Lista", tabla: "Tabla", referencias: "Referencias", citado: "Párrafos citados" };

export default function EditorSubapartados({ espacio, editable, onChange }: { espacio: Espacio; editable: boolean; onChange: (partes: ConfigParte[] | undefined) => void }) {
  const filas = partesConfiguradas(espacio);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ titulo: string; formato: "texto" | "lista" | "tabla"; columnas: string }>({ titulo: "", formato: "texto", columnas: "" });

  // La configuración completa, en el orden de la tabla: parte de la guardada o de la inicial del tipo.
  const config = (): ConfigParte[] => {
    const guardada = espacio.partes ?? configInicial(String(espacio.parametros.tipo));
    const ids = new Set(guardada.map((c) => c.id));
    return [...guardada, ...filas.filter((f) => !ids.has(f.id)).map((f) => ({ id: f.id, activa: true }))];
  };
  const cambiar = (id: string, cambios: Partial<ConfigParte>) => onChange(config().map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  const mover = (id: string, delta: number) => {
    const lista = config();
    const i = lista.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onChange(lista);
  };
  const numero = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Math.min(10000, Math.round(Number(v) || 0))));
  const agregar = () => {
    const titulo = nueva.titulo.trim();
    if (!titulo) return;
    const base = `x_${titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "parte"}`;
    let id = base;
    for (let k = 2; config().some((c) => c.id === id); k++) id = `${base}_${k}`;
    const columnas = nueva.columnas.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8);
    onChange([...config(), {
      id, activa: true, titulo, ayuda: "",
      propia: nueva.formato === "tabla" ? { formato: "tabla", columnas: columnas.length ? columnas : ["Columna 1"] } : { formato: nueva.formato },
      ...(nueva.formato === "texto" ? { min: 30, max: 300 } : { minItems: 1 }),
    }]);
    setNueva({ titulo: "", formato: "texto", columnas: "" });
    setAbierta(id);
  };
  const quitar = (id: string) => onChange(config().filter((c) => c.id !== id));
  const esMetodologia = espacio.parametros.tipo === "metodologia" || espacio.parametros.tipo === "metodologia_realizada";
  const activos = filas.filter((f) => f.activa).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Lo que se pide en este apartado. Desactive lo que la ficha no pide (por ejemplo, «Estado del arte»), cambie títulos y reglas o agregue preguntas propias.
        {espacio.partes ? "" : " Hoy usa los subapartados del tipo, sin cambios."}
      </p>
      {esMetodologia && editable && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-gray-600">Partir de una metodología:</span>
          {ENFOQUES_METODOLOGIA.map((m) => (
            <button key={m.valor} type="button" onClick={() => { if (window.confirm(`¿Reemplazar los subapartados por los de una metodología ${m.etiqueta.toLowerCase()}?`)) onChange(configMetodologia(m.valor)); }}
              className="px-2.5 py-1 rounded-md border border-gray-300 font-bold text-gray-700 hover:bg-gray-50">{m.etiqueta}</button>
          ))}
        </div>
      )}
      <ol className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
        {filas.map((f, i) => {
          const c = config().find((x) => x.id === f.id);
          const texto = f.formato === "texto" || f.formato === "pregunta" || f.formato === "citado";
          const items = f.formato === "lista" || f.formato === "tabla" || f.formato === "referencias";
          return (
            <li key={f.id} className={`px-2.5 py-2 text-sm ${f.activa ? "" : "bg-gray-50"}`}>
              <div className="flex items-center gap-2">
                <Interruptor etiqueta={`Pedir «${f.titulo}»`} activo={f.activa} deshabilitado={!editable || (f.activa && activos === 1)} onChange={(v) => cambiar(f.id, { activa: v })} />
                <button type="button" onClick={() => setAbierta(abierta === f.id ? null : f.id)} className={`flex-1 min-w-0 text-left ${f.activa ? "text-gray-800" : "text-gray-400 line-through"}`}>
                  <span className="font-bold">{f.titulo}</span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {" · "}{FORMATO[f.formato]}{f.propia ? " · propio" : ""}{f.opcional ? " · opcional" : ""}
                    {texto && (f.min || f.max) ? ` · ${f.min ?? 0}–${f.max || "∞"} palabras` : ""}
                    {items && (f.minItems || f.maxItems) ? ` · ${f.minItems ?? 0}–${f.maxItems || "∞"} ${f.formato === "tabla" ? "filas" : "elementos"}` : ""}
                  </span>
                </button>
                {editable && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <button type="button" aria-label={`Subir «${f.titulo}»`} disabled={i === 0} onClick={() => mover(f.id, -1)} className="px-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30">↑</button>
                    <button type="button" aria-label={`Bajar «${f.titulo}»`} disabled={i === filas.length - 1} onClick={() => mover(f.id, 1)} className="px-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30">↓</button>
                  </span>
                )}
              </div>
              {abierta === f.id && (
                <div className="mt-2 pl-11 grid sm:grid-cols-2 gap-2 text-xs">
                  <label className="sm:col-span-2 space-y-0.5">
                    <span className="block font-bold text-gray-600">Título</span>
                    <input className={campoCompacto} disabled={!editable} maxLength={120} value={c?.titulo ?? ""} placeholder={f.titulo} onChange={(e) => cambiar(f.id, { titulo: e.target.value || undefined })} />
                  </label>
                  <label className="sm:col-span-2 space-y-0.5">
                    <span className="block font-bold text-gray-600">Ayuda para el egresado</span>
                    <textarea rows={2} className={`${campoCompacto} h-auto py-1.5 resize-y`} disabled={!editable} maxLength={600} value={c?.ayuda ?? ""} placeholder={f.ayuda} onChange={(e) => cambiar(f.id, { ayuda: e.target.value || undefined })} />
                  </label>
                  <span className="flex items-center gap-2">
                    <Interruptor etiqueta={`«${f.titulo}» es obligatorio`} activo={!f.opcional} deshabilitado={!editable} onChange={(v) => cambiar(f.id, { opcional: !v })} />
                    <span className="text-gray-600 font-bold">Obligatorio</span>
                  </span>
                  {texto && (
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-600">Palabras</span>
                      <input type="number" aria-label={`Mínimo de palabras de «${f.titulo}»`} className={`${campoCompacto} w-20`} disabled={!editable} value={f.min ?? ""} onChange={(e) => cambiar(f.id, { min: numero(e.target.value) })} />
                      <span>a</span>
                      <input type="number" aria-label={`Máximo de palabras de «${f.titulo}»`} className={`${campoCompacto} w-20`} disabled={!editable} value={f.max ?? ""} onChange={(e) => cambiar(f.id, { max: numero(e.target.value) })} />
                    </span>
                  )}
                  {items && (
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-600">{f.formato === "tabla" ? "Filas" : f.formato === "referencias" ? "Referencias" : "Elementos"}</span>
                      <input type="number" aria-label={`Mínimo de ${f.formato === "tabla" ? "filas" : "elementos"} de «${f.titulo}»`} className={`${campoCompacto} w-20`} disabled={!editable} value={f.minItems ?? ""} onChange={(e) => cambiar(f.id, { minItems: numero(e.target.value) })} />
                      <span>a</span>
                      <input type="number" aria-label={`Máximo de ${f.formato === "tabla" ? "filas" : "elementos"} de «${f.titulo}»`} className={`${campoCompacto} w-20`} disabled={!editable} value={f.maxItems ?? ""} onChange={(e) => cambiar(f.id, { maxItems: numero(e.target.value) })} />
                    </span>
                  )}
                  {f.formato === "citado" && (
                    <span className="sm:col-span-2 flex items-center gap-2">
                      <Interruptor etiqueta={`Cada párrafo de «${f.titulo}» con al menos una fuente`} activo={f.citaPorParrafo !== false} deshabilitado={!editable}
                        onChange={(v) => cambiar(f.id, { citaPorParrafo: v })} />
                      <span className="text-gray-600 font-bold">Cada párrafo debe citar al menos una fuente</span>
                    </span>
                  )}
                  {f.formato === "tabla" && f.columnas && <p className="sm:col-span-2 text-gray-500">Columnas: {f.columnas.join(" · ")}</p>}
                  {f.propia && editable && (
                    <button type="button" onClick={() => quitar(f.id)} className="sm:col-span-2 justify-self-start text-red-600 font-bold hover:underline">Quitar este subapartado</button>
                  )}
                  <p className="sm:col-span-2 text-[11px] text-gray-400">0 o vacío = sin límite. Lo que no cambie toma el valor del tipo.</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {editable && (
        <div className="border border-dashed border-gray-300 rounded-lg p-2.5 space-y-2 text-xs">
          <span className="block font-bold text-gray-600">Agregar subapartado propio</span>
          <div className="flex flex-wrap gap-2 items-center">
            <input aria-label="Título del subapartado nuevo" className={`${campoCompacto} flex-1 min-w-[12rem]`} maxLength={120} placeholder="Ejemplo: Viabilidad técnica" value={nueva.titulo}
              onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
            <select aria-label="Formato del subapartado nuevo" className={`${campoCompacto} w-28`} value={nueva.formato} onChange={(e) => setNueva({ ...nueva, formato: e.target.value as "texto" | "lista" | "tabla" })}>
              <option value="texto">Texto</option>
              <option value="lista">Lista</option>
              <option value="tabla">Tabla</option>
            </select>
            {nueva.formato === "tabla" && (
              <input aria-label="Columnas de la tabla nueva" className={`${campoCompacto} flex-1 min-w-[12rem]`} placeholder="Columnas separadas por comas" value={nueva.columnas}
                onChange={(e) => setNueva({ ...nueva, columnas: e.target.value })} />
            )}
            <button type="button" disabled={!nueva.titulo.trim()} onClick={agregar} className="px-3 py-1.5 rounded-md bg-brand-red hover:bg-brand-red-hover text-white font-bold disabled:opacity-50">Agregar</button>
          </div>
        </div>
      )}
      {editable && espacio.partes && (
        <button type="button" onClick={() => { if (window.confirm("¿Volver a los subapartados del tipo, sin cambios?")) onChange(undefined); }} className="text-xs font-bold text-gray-500 hover:underline">
          Volver a los subapartados del tipo
        </button>
      )}
    </div>
  );
}
