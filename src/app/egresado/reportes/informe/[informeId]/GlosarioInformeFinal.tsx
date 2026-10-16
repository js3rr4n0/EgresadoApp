"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarGlosario } from "@/app/actions/informeFinal";
import { contarPalabras, normalizarTexto } from "@/lib/reglasRegistroActividad";
import {
  MAX_CARACTERES_TERMINO,
  MAX_PALABRAS_DEFINICION,
  MAX_TERMINOS_GLOSARIO,
  validarGlosario,
  type TerminoGlosario,
} from "@/lib/informeFinal";

/** Glosario de términos del informe final (opcional): si tiene términos, se agrega como anexo antes de la carta. */
export default function GlosarioInformeFinal({
  informeId,
  editable,
  terminos: iniciales,
}: {
  informeId: number;
  editable: boolean;
  terminos: TerminoGlosario[];
}) {
  const router = useRouter();
  const [terminos, setTerminos] = useState<TerminoGlosario[]>(iniciales);
  const [guardados, setGuardados] = useState(JSON.stringify(iniciales));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const conContenido = terminos.filter((t) => t.termino.trim() || t.definicion.trim());
  const problemas = validarGlosario(conContenido);
  const sinCambios = JSON.stringify(conContenido) === guardados;

  const cambiar = (i: number, campo: keyof TerminoGlosario, valor: string) =>
    setTerminos((prev) => prev.map((t, k) => (k === i ? { ...t, [campo]: valor.replace(/\n/g, " ") } : t)));

  const guardar = async () => {
    setMensaje(null);
    setGuardando(true);
    const res = await guardarGlosario(informeId, conContenido);
    setGuardando(false);
    if (res.success && res.terminos) {
      setTerminos(res.terminos);
      setGuardados(JSON.stringify(res.terminos));
      setMensaje({ tipo: "ok", texto: res.terminos.length ? "Glosario guardado." : "Se quitó el glosario del informe." });
      router.refresh();
    } else setMensaje({ tipo: "error", texto: res.error || "No se pudo guardar el glosario." });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            Glosario de términos <span className="font-semibold text-slate-400">(opcional)</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Términos técnicos o siglas que aparecen en el informe, con su definición. Si registra al menos uno, el glosario se agrega
            como anexo antes de la carta de finalización. Se ordenan alfabéticamente.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 bg-slate-50 text-slate-600 border-slate-200">
          {conContenido.length} de {MAX_TERMINOS_GLOSARIO} términos
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

      {terminos.length > 0 && (
        <ul className="space-y-3">
          {terminos.map((t, i) => {
            const palabras = normalizarTexto(t.definicion) ? contarPalabras(normalizarTexto(t.definicion)) : 0;
            return (
              <li key={i} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 items-start">
                <div className="space-y-1">
                  <label htmlFor={`termino-${i}`} className="block text-[10px] font-bold uppercase text-slate-400">
                    Término
                  </label>
                  <input
                    id={`termino-${i}`}
                    type="text"
                    value={t.termino}
                    maxLength={MAX_CARACTERES_TERMINO}
                    disabled={!editable}
                    onChange={(e) => cambiar(i, "termino", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`definicion-${i}`} className="block text-[10px] font-bold uppercase text-slate-400">
                    Definición{" "}
                    <span className={palabras > MAX_PALABRAS_DEFINICION ? "text-red-700" : ""}>
                      ({palabras}/{MAX_PALABRAS_DEFINICION} palabras)
                    </span>
                  </label>
                  <textarea
                    id={`definicion-${i}`}
                    rows={2}
                    value={t.definicion}
                    disabled={!editable}
                    onChange={(e) => cambiar(i, "definicion", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-y disabled:bg-slate-50"
                  />
                </div>
                {editable && (
                  <button
                    type="button"
                    onClick={() => setTerminos((prev) => prev.filter((_, k) => k !== i))}
                    className="sm:mt-5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-bold"
                  >
                    Quitar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {problemas.length > 0 && conContenido.length > 0 && (
        <ul className="list-disc pl-5 text-[11px] text-amber-800 font-semibold">
          {problemas.slice(0, 5).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            onClick={() => setTerminos((prev) => [...prev, { termino: "", definicion: "" }])}
            disabled={terminos.length >= MAX_TERMINOS_GLOSARIO}
            className="px-4 py-2 rounded-lg border border-unicaes text-unicaes hover:bg-red-50 text-xs font-extrabold disabled:opacity-40"
          >
            Agregar término
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || sinCambios || problemas.length > 0}
            className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar glosario"}
          </button>
        </div>
      )}
    </div>
  );
}
