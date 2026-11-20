"use client";

// Campos de un elemento propio del catálogo (catálogo editable, entrega C3): dibuja cada campo según su tipo y devuelve
// los valores al formulario que lo usa (propuesta, protocolo o capítulo del informe final). Los archivos e imágenes se
// leen en el navegador como data URL; el servidor vuelve a revisar su formato y tamaño al guardar.
import { useState } from "react";
import type { CampoPropio, DefinicionElementoPropio } from "@/lib/fichas/elementosPropios";
import { reglasCampo } from "@/lib/fichas/elementosPropios";
import { FORMATOS_CAMPO, type ArchivoPropio, type EnlacePropio, type ValorCampo, type Valores } from "@/lib/fichas/respuestasPropias";
import { openDocument } from "@/lib/pdfViewer";

const campoCss = "w-full p-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75";
const contar = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export default function CamposPropios({ def, valores, onChange, disabled, prefijo }: {
  def: DefinicionElementoPropio;
  valores: Valores;
  onChange: (v: Valores) => void;
  disabled: boolean;
  /** Para ids únicos cuando hay varios formularios en la página (por ejemplo, uno por integrante). */
  prefijo: string;
}) {
  const set = (id: string, v: ValorCampo | undefined) => {
    const nuevo = { ...valores };
    if (v === undefined || (Array.isArray(v) && v.length === 0) || v === "") delete nuevo[id];
    else nuevo[id] = v;
    onChange(nuevo);
  };
  return (
    <div className="space-y-5">
      {def.campos.map((c) => (
        <div key={c.id}>
          <label htmlFor={`${prefijo}-${c.id}`} className="block text-sm font-bold text-card-dark mb-1">
            {c.etiqueta} {c.obligatorio ? <span className="text-red-500">*</span> : <span className="text-xs font-medium text-muted">(opcional)</span>}
          </label>
          {c.ayuda && <p className="text-xs text-muted mb-1.5">{c.ayuda}</p>}
          <Campo campo={c} valor={valores[c.id]} onChange={(v) => set(c.id, v)} disabled={disabled} id={`${prefijo}-${c.id}`} />
          <p className="text-[11px] text-muted mt-1">{reglasCampo(c)}{c.tipo === "archivo" || c.tipo === "imagen" ? ` · ${FORMATOS_CAMPO[c.tipo].map((f) => f.etiqueta).join(", ")}` : ""}</p>
        </div>
      ))}
    </div>
  );
}

function Campo({ campo: c, valor, onChange, disabled, id }: { campo: CampoPropio; valor: ValorCampo | undefined; onChange: (v: ValorCampo | undefined) => void; disabled: boolean; id: string }) {
  switch (c.tipo) {
    case "texto":
      return <input id={id} className={campoCss} disabled={disabled} value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value)} />;
    case "texto_largo": {
      const t = typeof valor === "string" ? valor : "";
      const n = contar(t);
      const fuera = (!!c.minPalabras && n > 0 && n < c.minPalabras) || (!!c.maxPalabras && n > c.maxPalabras);
      return (
        <>
          <textarea id={id} rows={6} className={`${campoCss} leading-relaxed`} disabled={disabled} value={t} onChange={(e) => onChange(e.target.value)} />
          <div className={`text-right text-xs ${fuera ? "text-red-600 font-bold" : "text-muted"}`}>{n} palabra{n === 1 ? "" : "s"}</div>
        </>
      );
    }
    case "numero":
      return <input id={id} type="number" className={`${campoCss} max-w-xs`} disabled={disabled} min={c.minimo} max={c.maximo}
        value={typeof valor === "number" ? valor : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
    case "fecha":
      return <input id={id} type="date" className={`${campoCss} max-w-xs`} disabled={disabled} value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value || undefined)} />;
    case "seleccion": {
      const elegidas = Array.isArray(valor) ? (valor as string[]) : [];
      const opciones = (c.opciones ?? []).map((o) => o.trim()).filter(Boolean);
      return (
        <div id={id} role={c.multiple ? "group" : "radiogroup"} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {opciones.map((o) => (
            <label key={o} className="inline-flex items-center gap-2">
              <input type={c.multiple ? "checkbox" : "radio"} name={id} disabled={disabled} checked={elegidas.includes(o)}
                onChange={(e) => onChange(c.multiple ? (e.target.checked ? [...elegidas, o] : elegidas.filter((x) => x !== o)) : [o])} />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case "lista":
      return <ListaTexto id={id} valor={Array.isArray(valor) ? (valor as string[]) : []} disabled={disabled} onChange={onChange} />;
    case "enlace":
      return <Enlaces id={id} valor={Array.isArray(valor) ? (valor as EnlacePropio[]) : []} disabled={disabled} onChange={onChange} max={c.maximo} />;
    case "archivo":
    case "imagen":
      return <Archivos id={id} campo={c} valor={Array.isArray(valor) ? (valor as ArchivoPropio[]) : []} disabled={disabled} onChange={onChange} />;
  }
}

/** Una línea por elemento; se guarda como lista sin líneas vacías. */
function ListaTexto({ id, valor, disabled, onChange }: { id: string; valor: string[]; disabled: boolean; onChange: (v: string[]) => void }) {
  const [texto, setTexto] = useState(valor.join("\n"));
  return (
    <textarea id={id} rows={4} className={campoCss} disabled={disabled} value={texto} placeholder="Un elemento por línea"
      onChange={(e) => { setTexto(e.target.value); onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean)); }} />
  );
}

function Enlaces({ id, valor, disabled, onChange, max }: { id: string; valor: EnlacePropio[]; disabled: boolean; onChange: (v: EnlacePropio[]) => void; max?: number }) {
  const filas = valor.length ? valor : disabled ? [] : [{ url: "", descripcion: "" }];
  const cambiar = (i: number, cambios: Partial<EnlacePropio>) => onChange(filas.map((f, k) => (k === i ? { ...f, ...cambios } : f)));
  return (
    <div id={id} className="space-y-2">
      {filas.map((f, i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-2">
          <input aria-label={`Dirección ${i + 1}`} className={campoCss} placeholder="https://…" disabled={disabled} value={f.url} onChange={(e) => cambiar(i, { url: e.target.value })} />
          <input aria-label={`Descripción del enlace ${i + 1}`} className={campoCss} placeholder="Qué es (video, repositorio…)" disabled={disabled} value={f.descripcion} onChange={(e) => cambiar(i, { descripcion: e.target.value })} />
          {!disabled && <button type="button" aria-label={`Quitar el enlace ${i + 1}`} onClick={() => onChange(filas.filter((_, k) => k !== i))} className="px-3 rounded-lg border border-red-200 text-red-600 text-sm">✕</button>}
        </div>
      ))}
      {!disabled && (!max || filas.length < max) && (
        <button type="button" onClick={() => onChange([...filas, { url: "", descripcion: "" }])} className="text-xs font-bold text-brand-red hover:underline">+ Enlace</button>
      )}
      {disabled && filas.length === 0 && <p className="text-sm text-muted italic">Sin enlaces.</p>}
    </div>
  );
}

function Archivos({ id, campo: c, valor, disabled, onChange }: { id: string; campo: CampoPropio; valor: ArchivoPropio[]; disabled: boolean; onChange: (v: ArchivoPropio[]) => void }) {
  const [error, setError] = useState<string | null>(null);
  const tipo = c.tipo === "imagen" ? "imagen" : "archivo";
  const formatos = FORMATOS_CAMPO[tipo];
  const maxMB = Math.min(Math.max(c.maxMB ?? 5, 1), 10);
  const lleno = !!c.maximo && valor.length >= c.maximo;
  const agregar = (archivo: File | undefined) => {
    setError(null);
    if (!archivo) return;
    if (!formatos.some((f) => f.mime === archivo.type)) return setError(`Formato no permitido. Se aceptan: ${formatos.map((f) => f.etiqueta).join(", ")}.`);
    if (archivo.size > maxMB * 1024 * 1024) return setError(`El archivo pasa de ${maxMB} MB.`);
    const lector = new FileReader();
    lector.onload = () => onChange([...valor, { url: String(lector.result), nombre: archivo.name.slice(0, 255), tipo: archivo.type }]);
    lector.onerror = () => setError("No se pudo leer el archivo.");
    lector.readAsDataURL(archivo);
  };
  return (
    <div id={id} className="space-y-2">
      {valor.length > 0 && (
        <ul className="space-y-1.5">
          {valor.map((a, i) => (
            <li key={i} className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 text-sm bg-white">
              {tipo === "imagen" && /^data:image\//.test(a.url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.nombre} className="w-12 h-12 object-cover rounded" />
              )}
              <span className="flex-1 min-w-0 truncate">{a.nombre}</span>
              <button type="button" onClick={() => openDocument(a.url)} className="text-xs font-bold text-blue-700 hover:underline">Ver</button>
              {!disabled && <button type="button" aria-label={`Quitar ${a.nombre}`} onClick={() => onChange(valor.filter((_, k) => k !== i))} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
            </li>
          ))}
        </ul>
      )}
      {!disabled && !lleno && (
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-400 text-sm font-bold text-card-dark cursor-pointer hover:bg-slate-50">
          <input type="file" className="sr-only" accept={formatos.map((f) => f.mime).join(",")} onChange={(e) => { agregar(e.target.files?.[0]); e.target.value = ""; }} />
          {tipo === "imagen" ? "+ Agregar imagen" : "+ Agregar archivo"}
        </label>
      )}
      {disabled && valor.length === 0 && <p className="text-sm text-muted italic">Sin {tipo === "imagen" ? "imágenes" : "archivos"}.</p>}
      {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
    </div>
  );
}
