"use client";

import { useRef, useState } from "react";
import { diffPalabras, hayCambios } from "@/lib/diffTexto";
import type { MarcaTexto } from "@/lib/comentariosRevision";

const unirEspacios = (s: string) => s.replace(/\s+/g, " ").trim();

/** Divide un párrafo en tramos normales y resaltados según las frases comentadas que contiene. */
function tramos(parrafo: string, marcas: { numero: number; fragmento: string }[]) {
  const rangos = marcas
    .map((m) => ({ ...m, inicio: parrafo.indexOf(m.fragmento) }))
    .filter((m) => m.inicio >= 0)
    .sort((a, b) => a.inicio - b.inicio);
  const resultado: { texto: string; numero?: number }[] = [];
  let pos = 0;
  for (const r of rangos) {
    if (r.inicio < pos) continue; // se superpone con un resaltado anterior
    if (r.inicio > pos) resultado.push({ texto: parrafo.slice(pos, r.inicio) });
    resultado.push({ texto: parrafo.slice(r.inicio, r.inicio + r.fragmento.length), numero: r.numero });
    pos = r.inicio + r.fragmento.length;
  }
  if (pos < parrafo.length) resultado.push({ texto: parrafo.slice(pos) });
  return resultado;
}

/**
 * Texto de un apartado durante la revisión: resalta las frases comentadas (numeradas), permite seleccionar una frase
 * para comentarla (como en Word) y, si la semana se reenvió, muestra los cambios frente a la versión revisada.
 */
export default function TextoRevisable({
  texto,
  anterior,
  mostrarCambios,
  marcas,
  editable,
  onComentarSeleccion,
}: {
  texto: string | null;
  /** Versión revisada anteriormente; undefined si no hay revisión previa. */
  anterior?: string | null;
  mostrarCambios: boolean;
  marcas: (MarcaTexto & { numero: number })[];
  editable: boolean;
  onComentarSeleccion: (fragmento: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [seleccion, setSeleccion] = useState<{ fragmento: string; top: number; left: number } | null>(null);

  const actual = texto ?? "";
  const verCambios = mostrarCambios && anterior !== undefined && hayCambios(anterior, actual);

  const alSoltar = () => {
    if (!editable || verCambios) return;
    const sel = window.getSelection();
    const raiz = contenedor.current;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !raiz) return setSeleccion(null);
    const rango = sel.getRangeAt(0);
    if (!raiz.contains(rango.commonAncestorContainer)) return setSeleccion(null);
    const fragmento = unirEspacios(sel.toString());
    if (fragmento.length < 3 || !unirEspacios(actual).includes(fragmento)) return setSeleccion(null);
    const r = rango.getBoundingClientRect();
    const c = raiz.getBoundingClientRect();
    setSeleccion({ fragmento: fragmento.slice(0, 500), top: r.bottom - c.top + 6, left: Math.max(0, r.left - c.left + r.width / 2 - 70) });
  };

  if (!actual.trim() && !verCambios) return <p className="text-xs text-slate-400 font-semibold">Sin contenido.</p>;

  if (verCambios) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-slate-500">
          Cambios respecto de la versión revisada:{" "}
          <span className="px-1 rounded bg-emerald-100 text-emerald-900">texto agregado</span>{" "}
          <span className="px-1 rounded bg-red-100 text-red-800 line-through">texto eliminado</span>
        </p>
        <div className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line text-justify">
          {/* Los saltos de línea se duplican para conservar la separación entre párrafos */}
          {diffPalabras(anterior ?? "", actual)
            .map((p) => ({ ...p, texto: p.texto.replace(/\n/g, "\n\n") }))
            .map((p, i) =>
            p.tipo === "igual" ? (
              <span key={i}>{p.texto}</span>
            ) : p.tipo === "agregado" ? (
              <ins key={i} className="no-underline bg-emerald-100 text-emerald-900 rounded-sm">
                {p.texto}
              </ins>
            ) : (
              <del key={i} className="bg-red-100 text-red-800 rounded-sm">
                {p.texto}
              </del>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative" onMouseUp={alSoltar}>
      <div className={`space-y-2 ${editable ? "selection:bg-amber-200" : ""}`}>
        {actual.split("\n").map((parrafo, i) =>
          parrafo.trim() ? (
            <p key={i} className="text-xs text-slate-700 font-medium leading-relaxed text-justify">
              {tramos(parrafo, marcas).map((t, j) =>
                t.numero ? (
                  <mark key={j} className="bg-amber-200/80 text-slate-900 rounded-sm px-0.5">
                    {t.texto}
                    <sup className="ml-0.5 text-[9px] font-extrabold text-amber-900">{t.numero}</sup>
                  </mark>
                ) : (
                  <span key={j}>{t.texto}</span>
                )
              )}
            </p>
          ) : null
        )}
      </div>
      {editable && seleccion && (
        <button
          type="button"
          // Evita que el clic borre la selección antes de registrarla.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onComentarSeleccion(seleccion.fragmento);
            setSeleccion(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="absolute z-10 px-3 py-1.5 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-extrabold shadow-lg"
          style={{ top: seleccion.top, left: seleccion.left }}
        >
          Comentar selección
        </button>
      )}
    </div>
  );
}
