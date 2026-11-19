"use client";

// Metodología de un objetivo en el cronograma de investigación (notas del 19-nov-2026, entrega E2). Va debajo del
// elemento "Metodología" de cada objetivo: el procedimiento en párrafos citados con el registro de fuentes del trabajo
// y, si es una metodología propia, su fundamentación. El asesor la lee al revisar el plan.
import type { ParteApartado } from "@/lib/fichas/apartadosAcademicos";
import { guardarParrafos, leerParrafos, parrafoConCita, type Fuente } from "@/lib/fichas/fuentes";
import { leerMetodologia, metodologiaVacia, problemasMetodologia, type MetodologiaObjetivo as Metodologia } from "@/lib/fichas/metodologiaPlan";
import type { NodoPlan } from "@/lib/fichas/planTrabajo";
import { ParrafosCitados, ProveedorFuentes } from "./FuentesCitas";

const PARTE_PROCEDIMIENTO: ParteApartado = {
  id: "procedimiento",
  titulo: "Metodología del objetivo",
  ayuda: "",
  formato: "citado",
  citaPorParrafo: false,
};
const PARTE_FUNDAMENTACION: ParteApartado = {
  id: "fundamentacion",
  titulo: "Fundamentación de la metodología propia",
  ayuda: "",
  formato: "citado",
  citaPorParrafo: false,
};

export default function MetodologiaObjetivo({
  nodo, objetivo, editable, propuestaId, fuentes, citadas, registroEditable, protocolo, onChange,
}: {
  nodo: NodoPlan;
  /** Título del objetivo específico, para el encabezado. */
  objetivo: string;
  editable: boolean;
  propuestaId: number;
  fuentes: Fuente[];
  citadas: number[];
  /** Quien puede agregar fuentes al registro (el líder, con el plan en redacción). */
  registroEditable: boolean;
  /** Metodología del protocolo, un párrafo por subapartado, para partir de ella. */
  protocolo: string[];
  onChange: (m: Metodologia) => void;
}) {
  const m = leerMetodologia(nodo);
  const vacia = metodologiaVacia(m);
  const pendientes = problemasMetodologia(nodo.codigo, m);
  const set = (cambios: Partial<Metodologia>) => onChange({ ...m, ...cambios });
  const conTexto = (ps: Metodologia["parrafos"]) => ps.filter((p) => p.texto.trim());

  return (
    <details open={editable || !vacia} className="group rounded-lg border border-sky-200 bg-sky-50/40 text-xs font-normal">
      <summary className="cursor-pointer px-3 py-2 flex flex-wrap items-center gap-2 text-sky-950">
        <span className="font-bold">Metodología del objetivo {objetivo ? `«${objetivo}»` : nodo.codigo.split(".").slice(0, 2).join(".")}</span>
        {m.propia && <span className="rounded-md bg-amber-100 text-amber-800 px-1.5 py-0.5 font-bold">Metodología propia</span>}
        {pendientes.length === 0
          ? <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-bold">Con sus referencias</span>
          : <span className="rounded-md bg-amber-100 text-amber-800 px-1.5 py-0.5 font-bold">Pendiente</span>}
      </summary>
      <div className="px-3 pb-3 space-y-3">
        <p className="text-gray-600">
          Describe el procedimiento con el que se cumplirá el objetivo: qué se hará, con qué técnicas e instrumentos y con quiénes. Respáldalo con
          literatura, estudios o metodologías existentes: cada párrafo puede llevar sus fuentes del registro y la cita se agrega sola.
        </p>
        {editable ? (
          <ProveedorFuentes value={{ propuestaId, fuentes, citadas, editable: registroEditable }}>
            {vacia && protocolo.length > 0 && (
              <button type="button" onClick={() => set({ parrafos: protocolo.map((texto) => ({ texto, fuentes: [] })) })}
                className="px-2.5 py-1.5 rounded-md border border-sky-300 bg-white font-bold text-sky-800 hover:bg-sky-50">
                Traer de la metodología del protocolo
              </button>
            )}
            <ParrafosCitados parte={PARTE_PROCEDIMIENTO} valor={guardarParrafos(m.parrafos)} disabled={false} onChange={(v) => set({ parrafos: leerParrafos(v) })}
              placeholder="Qué se hará para cumplir el objetivo, con qué técnicas e instrumentos y con quiénes; según qué autor o método." />
            <label className="flex items-start gap-2 text-gray-700">
              <input type="checkbox" aria-label={`Es una metodología propia (${nodo.codigo})`} checked={m.propia} onChange={(e) => set({ propia: e.target.checked })} className="mt-0.5" />
              <span>
                <strong>Es una metodología propia.</strong> Si el equipo propone su propio procedimiento, debe fundamentarlo en conocimientos, métodos o
                investigaciones anteriores.
              </span>
            </label>
            {m.propia && (
              <div className="space-y-1">
                <p className="font-bold text-gray-700">Fundamentación de la metodología propia</p>
                <ParrafosCitados parte={PARTE_FUNDAMENTACION} valor={guardarParrafos(m.fundamentacion)} disabled={false} onChange={(v) => set({ fundamentacion: leerParrafos(v) })}
                  placeholder="En qué métodos, conocimientos o investigaciones anteriores se basa el procedimiento propio." />
              </div>
            )}
          </ProveedorFuentes>
        ) : vacia ? (
          <p className="text-gray-500 italic">Todavía no se describe la metodología de este objetivo.</p>
        ) : (
          <div className="space-y-2 text-gray-800 text-[13px] leading-relaxed">
            {conTexto(m.parrafos).map((p, i) => <p key={i}>{parrafoConCita(p)}</p>)}
            {m.propia && (
              <div className="border-t border-sky-200 pt-2 space-y-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Fundamentación de la metodología propia</p>
                {conTexto(m.fundamentacion).length ? conTexto(m.fundamentacion).map((p, i) => <p key={i}>{parrafoConCita(p)}</p>) : <p className="text-gray-500 italic">Sin fundamentación.</p>}
              </div>
            )}
          </div>
        )}
        {pendientes.length > 0 && (editable || !vacia) && (
          <ul className="list-disc pl-5 text-amber-800">{pendientes.map((p) => <li key={p}>{p.replace(/^[\d.]+: /, "")}</li>)}</ul>
        )}
      </div>
    </details>
  );
}
