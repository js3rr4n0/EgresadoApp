"use client";

// Problema, justificación o alcance en 4 partes con indicador de fortaleza (specs/REDACTAR_PROPUESTA_AJUSTES.md, R3).
// Formulario de problema, justificación y alcance en la redacción de la propuesta (reemplazó a los de un solo texto).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarPartesElemento } from "@/app/actions/partesPropuesta";
import { PARTES, UMBRAL_FORTALEZA, contarPalabras, fortalezaElemento, type ElementoConPartes, type Partes } from "@/lib/fortaleza";
import BarraFortaleza from "@/components/fortaleza/BarraFortaleza";

const INTRO: Record<ElementoConPartes, string> = {
  problema: "Justifica o agrega los datos correspondientes en cada parte. Un problema solo descriptivo es más débil que uno respaldado con datos, proyecciones y conclusiones.",
  justificacion: "Justifica la propuesta desde cuatro ópticas. Si el problema está bien definido, la justificación de atenderlo debe ser igual de clara.",
  alcance: "Delimita el trabajo: qué incluye y qué no, qué se entregará y bajo qué condiciones. Un alcance claro muestra cómo se abordará la problemática.",
};

export default function PartesElementoForm({
  propuestaId,
  elemento,
  titulo,
  descripcion,
  initialPartes,
  minPalabras,
  maxPalabras,
  pasoSiguiente,
  pasoAnterior,
  isLocked,
  isReadOnly = false,
}: {
  propuestaId: number;
  elemento: ElementoConPartes;
  titulo: string;
  descripcion?: string;
  initialPartes: Partes;
  /** «Palabras mínimas» del elemento en la ficha (se reparte entre las 4 partes). */
  minPalabras: number;
  /** «Palabras máximas» del elemento en la ficha (para las 4 partes juntas; 0 = sin máximo). */
  maxPalabras: number;
  pasoSiguiente: number;
  pasoAnterior: number | null;
  isLocked: boolean;
  isReadOnly?: boolean;
}) {
  const router = useRouter();
  const [partes, setPartes] = useState<Partes>(initialPartes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const disabled = isLocked || isReadOnly;

  const f = useMemo(() => fortalezaElemento(elemento, partes, minPalabras), [elemento, partes, minPalabras]);
  const total = PARTES[elemento].reduce((s, p) => s + contarPalabras(partes[p.clave]), 0);
  const excede = maxPalabras > 0 && total > maxPalabras;
  const puedeAvanzar = f.porcentaje >= UMBRAL_FORTALEZA && !excede;

  const guardar = async (avanzar: boolean) => {
    if (disabled) return;
    setPending(true);
    setError(null);
    setAviso(null);
    const res = await guardarPartesElemento(propuestaId, elemento, partes);
    setPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    if (avanzar) {
      router.push(`?id=${propuestaId}&step=${pasoSiguiente}`);
      router.refresh();
    } else {
      setAviso("Borrador guardado.");
      router.refresh();
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">{titulo}</h2>
        <p className="text-sm text-muted mt-1">{descripcion ? `${descripcion}. ` : ""}{INTRO[elemento]}</p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-gray-50 p-4 space-y-2">
        <BarraFortaleza porcentaje={f.porcentaje} titulo="Fortaleza de este apartado" />
        <p className="text-xs text-muted">
          Cada parte vale 25 % y cuenta cuando tiene al menos {f.minimoPorParte} {f.minimoPorParte === 1 ? "palabra" : "palabras"}. Para continuar necesitas
          {" "}{UMBRAL_FORTALEZA} %; con menos de 100 % puedes seguir, pero el asesor podría pedirte ajustes.
          {maxPalabras > 0 && ` Máximo ${maxPalabras} palabras en total (llevas ${total}).`}
        </p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}

      <div className="space-y-5">
        {PARTES[elemento].map((p, i) => {
          const n = contarPalabras(partes[p.clave]);
          const ok = f.cumplidas.includes(p.clave);
          return (
            <div key={p.clave} className={`rounded-xl border p-4 ${ok ? "border-green-200 bg-green-50/30" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <label htmlFor={`parte-${p.clave}`} className="font-bold text-gray-800 text-sm">
                  {i + 1}. {p.titulo}
                </label>
                <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold ${ok ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {ok ? "25 % · completa" : `${n} de ${f.minimoPorParte} palabras`}
                </span>
              </div>
              <p className="text-xs text-muted mb-2">{p.ayuda}</p>
              <textarea
                id={`parte-${p.clave}`}
                rows={5}
                value={partes[p.clave] ?? ""}
                onChange={(e) => setPartes((x) => ({ ...x, [p.clave]: e.target.value }))}
                disabled={disabled}
                className="w-full p-3 rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red text-sm leading-relaxed disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
        {pasoAnterior ? (
          <button type="button" onClick={() => router.push(`?id=${propuestaId}&step=${pasoAnterior}`)} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors">
            Paso anterior
          </button>
        ) : <span />}
        {!disabled && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => guardar(false)}
                className="px-5 py-2.5 rounded-lg border border-border bg-white text-gray-700 font-bold text-sm hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                type="button"
                disabled={pending || !puedeAvanzar}
                onClick={() => guardar(true)}
                className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {pending ? "Guardando..." : "Guardar y continuar"}
              </button>
            </div>
            {aviso && <p className="text-xs text-green-700">{aviso}</p>}
            {!puedeAvanzar && (
              <p className="text-xs text-brand-red">
                {excede ? `Reduce el texto a ${maxPalabras} palabras.` : `Completa al menos ${UMBRAL_FORTALEZA} % (3 de las 4 partes) para continuar.`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
