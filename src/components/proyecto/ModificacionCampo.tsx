"use client";

// Bitácora o reporte de modificaciones (notas del 13-nov-2026): campo opcional de una actividad o de un objetivo para
// dejar registrado un cambio frente a lo planificado (tiempo, recursos y costos, alcance u otro acontecimiento).
import { TIPOS_MODIFICACION } from "@/lib/fichas/bitacora";

const tarjeta = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3";
const tituloTarjeta = "text-sm font-extrabold text-slate-900 uppercase tracking-wide";

export default function ModificacionCampo({
  idBase,
  tipo,
  texto,
  onTipo,
  onTexto,
  editable,
  de,
}: {
  idBase: string;
  tipo: string | null;
  texto: string;
  onTipo: (v: string | null) => void;
  onTexto: (v: string) => void;
  editable: boolean;
  /** "la actividad" o "el objetivo". */
  de: string;
}) {
  if (!editable && !texto.trim()) return null;
  return (
    <div className={tarjeta}>
      <div className="border-b border-slate-100 pb-2">
        <h2 className={tituloTarjeta}>
          ¿Hubo algún cambio o acontecimiento? <span className="normal-case font-semibold text-slate-400">(opcional)</span>
        </h2>
        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
          Reporte lo que cambió frente a lo planificado en {de}: una reprogramación, un cambio de precio, hacer más o menos de lo previsto o un problema.
          Pasa a la bitácora (reporte de modificaciones), que se anexa a los informes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Tipo de cambio en ${de}`}>
        {TIPOS_MODIFICACION.map((t) => (
          <button key={t.valor} type="button" role="radio" aria-checked={tipo === t.valor} disabled={!editable} title={t.ayuda}
            onClick={() => onTipo(tipo === t.valor ? null : t.valor)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-60 ${tipo === t.valor ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}>
            {t.etiqueta}
          </button>
        ))}
      </div>
      {tipo && <p className="text-[11px] text-slate-500 font-semibold">{TIPOS_MODIFICACION.find((t) => t.valor === tipo)?.ayuda}</p>}
      <textarea id={`${idBase}-modificacion`} rows={3} value={texto} disabled={!editable} maxLength={3000} onChange={(e) => onTexto(e.target.value)}
        aria-label={`Cambio o acontecimiento en ${de}`}
        placeholder="Ejemplo: se esperaba pintar 2 puertas, pero se pintaron 4 porque…; la actividad se reprogramó para el 20/11 porque…"
        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-y disabled:bg-slate-100 disabled:text-slate-600" />
    </div>
  );
}
