"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarIntroduccion } from "@/app/actions/informeFinal";
import { contarPalabras, normalizarTexto } from "@/lib/reglasRegistroActividad";
import {
  AVISO_INTRODUCCION,
  MAX_PALABRAS_PARRAFO_INTRODUCCION,
  MIN_PALABRAS_PARRAFO_INTRODUCCION,
  PARRAFOS_INTRODUCCION,
  validarParrafoIntroduccion,
} from "@/lib/informeFinal";

/** Introducción del informe final: cuatro párrafos, cada uno con su indicación y su límite de cinco renglones. */
export default function IntroduccionInformeFinal({
  informeId,
  editable,
  parrafos: iniciales,
}: {
  informeId: number;
  editable: boolean;
  parrafos: string[];
}) {
  const router = useRouter();
  const [parrafos, setParrafos] = useState(iniciales);
  const [guardados, setGuardados] = useState(iniciales);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const sinCambios = parrafos.every((p, i) => normalizarTexto(p) === normalizarTexto(guardados[i] ?? ""));
  const completos = parrafos.filter((p, i) => validarParrafoIntroduccion(p, i).length === 0).length;

  const cambiar = (i: number, valor: string) => setParrafos((prev) => prev.map((p, k) => (k === i ? valor : p)));

  const guardar = async () => {
    setMensaje(null);
    setGuardando(true);
    const res = await guardarIntroduccion(informeId, parrafos);
    setGuardando(false);
    if (res.success && res.parrafos) {
      setParrafos(res.parrafos);
      setGuardados(res.parrafos);
      setMensaje({ tipo: "ok", texto: "Introducción guardada." });
      router.refresh();
    } else setMensaje({ tipo: "error", texto: res.error || "No se pudo guardar la introducción." });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Introducción</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{AVISO_INTRODUCCION}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 ${
            completos === PARRAFOS_INTRODUCCION.length
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-900 border-amber-300"
          }`}
        >
          {completos} de {PARRAFOS_INTRODUCCION.length} párrafos completos
        </span>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold ${
            mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {PARRAFOS_INTRODUCCION.map((p, i) => {
        const texto = parrafos[i] ?? "";
        const palabras = normalizarTexto(texto) ? contarPalabras(normalizarTexto(texto)) : 0;
        const problemas = texto.trim() ? validarParrafoIntroduccion(texto, i) : [];
        return (
          <div key={p.titulo} className="space-y-1.5 pt-3 border-t border-slate-100 first-of-type:pt-0 first-of-type:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor={`introduccion-${i}`} className="text-xs font-extrabold text-slate-800">
                {p.titulo}
              </label>
              <span
                className={`text-[11px] font-bold ${
                  palabras > MAX_PALABRAS_PARRAFO_INTRODUCCION ? "text-red-700" : palabras >= MIN_PALABRAS_PARRAFO_INTRODUCCION ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {palabras} palabras · entre {MIN_PALABRAS_PARRAFO_INTRODUCCION} y {MAX_PALABRAS_PARRAFO_INTRODUCCION} (unos cinco renglones)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{p.indicacion}</p>
            <textarea
              id={`introduccion-${i}`}
              rows={4}
              value={texto}
              disabled={!editable}
              onChange={(e) => cambiar(i, e.target.value.replace(/\n/g, " "))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium leading-relaxed focus:ring-1 focus:ring-unicaes outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600"
            />
            {problemas.length > 0 && (
              <ul className="list-disc pl-5 text-[11px] text-amber-800 font-semibold">
                {problemas.map((x) => (
                  <li key={x}>{x.replace(/^Párrafo \d+ de la introducción: /, "")}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {editable && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || sinCambios}
            className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar introducción"}
          </button>
        </div>
      )}
    </div>
  );
}
