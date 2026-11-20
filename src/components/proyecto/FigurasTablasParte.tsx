"use client";

// Subapartados de figuras y de tablas (informe final de investigación, entrega F2). Las figuras se suben aparte
// (figuras_documento) y el subapartado guarda su id, su leyenda y su fuente; las tablas guardan título, columnas y filas.
// El documento las numera (Figura N, Tabla N) y arma el índice de figuras.
import { createContext, useContext, useState } from "react";
import { subirFigura } from "@/app/actions/figurasDocumento";
import { leerFiguras, leerTablas, type FiguraParte, type TablaLibre } from "@/lib/fichas/apartadosAcademicos";

/** Propuesta del apartado, para subir figuras (la ponen el formulario del protocolo y el capítulo del informe final). */
export const PropuestaApartado = createContext<number | null>(null);

const campo = "w-full p-2 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-xs disabled:opacity-75";

export function FigurasParte({ valor, disabled, onChange }: { valor: string; disabled: boolean; onChange: (v: string) => void }) {
  const propuestaId = useContext(PropuestaApartado);
  const figuras = leerFiguras(valor);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardar = (nuevas: FiguraParte[]) => onChange(JSON.stringify(nuevas));
  const cambiar = (i: number, cambios: Partial<FiguraParte>) => guardar(figuras.map((f, k) => (k === i ? { ...f, ...cambios } : f)));

  const subir = async (archivo: File | undefined) => {
    if (!archivo || !propuestaId) return;
    setError(null);
    setSubiendo(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    const r = await subirFigura(propuestaId, fd);
    setSubiendo(false);
    if (!r.success) return setError(r.error);
    guardar([...figuras, { id: r.id, leyenda: "", fuente: "Elaboración propia." }]);
  };

  return (
    <div className="space-y-3">
      {figuras.map((f, i) => (
        <div key={f.id} className="flex flex-col sm:flex-row gap-3 border border-border rounded-lg p-3 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/figuras/${f.id}`} alt={f.leyenda || `Figura ${i + 1}`} className="w-full sm:w-40 h-28 object-contain bg-slate-50 rounded border border-border" />
          <div className="flex-1 space-y-2">
            <label className="block text-[11px] font-bold text-muted">Leyenda de la figura {i + 1}
              <input className={campo} value={f.leyenda} disabled={disabled} placeholder="Qué muestra la figura" onChange={(e) => cambiar(i, { leyenda: e.target.value })} />
            </label>
            <label className="block text-[11px] font-bold text-muted">Fuente
              <input className={campo} value={f.fuente} disabled={disabled} placeholder="Elaboración propia, o el autor y el año" onChange={(e) => cambiar(i, { fuente: e.target.value })} />
            </label>
          </div>
          {!disabled && (
            <div className="flex sm:flex-col gap-1">
              <button type="button" aria-label={`Subir la figura ${i + 1}`} disabled={i === 0} onClick={() => { const n = [...figuras]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; guardar(n); }} className="px-2 rounded border border-border text-xs disabled:opacity-30">↑</button>
              <button type="button" aria-label={`Quitar la figura ${i + 1}`} onClick={() => guardar(figuras.filter((_, k) => k !== i))} className="px-2 rounded border border-red-200 text-red-600 text-xs">✕</button>
            </div>
          )}
        </div>
      ))}
      {!disabled && (
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-400 text-xs font-bold text-card-dark ${subiendo || !propuestaId ? "opacity-50" : "cursor-pointer hover:bg-slate-50"}`}>
          <input type="file" className="sr-only" accept="image/png,image/jpeg" disabled={subiendo || !propuestaId} onChange={(e) => { void subir(e.target.files?.[0]); e.target.value = ""; }} />
          {subiendo ? "Subiendo…" : "+ Agregar figura (PNG o JPG, hasta 5 MB)"}
        </label>
      )}
      {figuras.length === 0 && disabled && <p className="text-xs text-muted italic">Sin figuras.</p>}
      {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
    </div>
  );
}

export function TablasParte({ valor, disabled, onChange }: { valor: string; disabled: boolean; onChange: (v: string) => void }) {
  const tablas = leerTablas(valor);
  const guardar = (nuevas: TablaLibre[]) => onChange(JSON.stringify(nuevas));
  const cambiar = (i: number, t: TablaLibre) => guardar(tablas.map((x, k) => (k === i ? t : x)));
  return (
    <div className="space-y-4">
      {tablas.map((t, i) => (
        <div key={i} className="border border-border rounded-lg p-3 bg-white space-y-2">
          <div className="flex gap-2 items-end">
            <label className="flex-1 block text-[11px] font-bold text-muted">Título de la tabla {i + 1}
              <input className={campo} value={t.titulo} disabled={disabled} placeholder="Qué datos presenta" onChange={(e) => cambiar(i, { ...t, titulo: e.target.value })} />
            </label>
            {!disabled && <button type="button" aria-label={`Quitar la tabla ${i + 1}`} onClick={() => guardar(tablas.filter((_, k) => k !== i))} className="px-2 py-1.5 rounded border border-red-200 text-red-600 text-xs">✕</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border border-border min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  {t.columnas.map((c, j) => (
                    <th key={j} className="p-1 border-b border-border">
                      <input aria-label={`Columna ${j + 1} de la tabla ${i + 1}`} className={`${campo} font-bold min-w-28`} value={c} disabled={disabled}
                        onChange={(e) => cambiar(i, { ...t, columnas: t.columnas.map((x, k) => (k === j ? e.target.value : x)) })} />
                    </th>
                  ))}
                  {!disabled && (
                    <th className="p-1 border-b border-border">
                      <button type="button" disabled={t.columnas.length >= 12} onClick={() => cambiar(i, { ...t, columnas: [...t.columnas, ""], filas: t.filas.map((f) => [...f, ""]) })} className="text-[11px] font-bold text-brand-red whitespace-nowrap">+ Columna</button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {t.filas.map((f, k) => (
                  <tr key={k}>
                    {t.columnas.map((_, j) => (
                      <td key={j} className="p-1 border-b border-border">
                        <input aria-label={`Fila ${k + 1}, columna ${j + 1} de la tabla ${i + 1}`} className={campo} value={f[j] ?? ""} disabled={disabled}
                          onChange={(e) => cambiar(i, { ...t, filas: t.filas.map((x, m) => (m === k ? t.columnas.map((__, n) => (n === j ? e.target.value : x[n] ?? "")) : x)) })} />
                      </td>
                    ))}
                    {!disabled && (
                      <td className="p-1 border-b border-border text-center">
                        <button type="button" aria-label={`Quitar la fila ${k + 1}`} onClick={() => cambiar(i, { ...t, filas: t.filas.filter((_, m) => m !== k) })} className="text-gray-400 hover:text-red-700 font-bold">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!disabled && (
            <div className="flex gap-3">
              <button type="button" onClick={() => cambiar(i, { ...t, filas: [...t.filas, t.columnas.map(() => "")] })} className="text-[11px] font-bold text-brand-red">+ Fila</button>
              {t.columnas.length > 1 && (
                <button type="button" onClick={() => cambiar(i, { ...t, columnas: t.columnas.slice(0, -1), filas: t.filas.map((f) => f.slice(0, -1)) })} className="text-[11px] font-bold text-gray-500">Quitar la última columna</button>
              )}
            </div>
          )}
        </div>
      ))}
      {!disabled && tablas.length < 20 && (
        <button type="button" onClick={() => guardar([...tablas, { titulo: "", columnas: ["", ""], filas: [["", ""]] }])}
          className="px-3 py-2 rounded-lg border border-dashed border-gray-400 text-xs font-bold text-card-dark hover:bg-slate-50">+ Agregar tabla</button>
      )}
      {tablas.length === 0 && disabled && <p className="text-xs text-muted italic">Sin tablas.</p>}
    </div>
  );
}
