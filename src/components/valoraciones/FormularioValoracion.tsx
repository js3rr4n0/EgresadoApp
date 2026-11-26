"use client";

// Formulario corto de valoración (entrega V3): cuatro aspectos de 1 a 10 y un comentario opcional.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarValoracion } from "@/app/actions/valoraciones";
import {
  ASPECTOS,
  LARGO_MAXIMO_COMENTARIO,
  PUNTAJE_MAXIMO,
  PUNTAJE_MINIMO,
  formatoNota,
  promedio,
  type Objetivo,
  type TipoValoracion,
} from "@/lib/valoraciones";

const ESCALA = Array.from({ length: PUNTAJE_MAXIMO - PUNTAJE_MINIMO + 1 }, (_, i) => i + PUNTAJE_MINIMO);

export default function FormularioValoracion({
  propuestaId,
  tipo,
  objetivo,
  evaluadoId,
  titulo,
  subtitulo,
  enviada,
}: {
  propuestaId: number;
  tipo: TipoValoracion;
  objetivo: Objetivo;
  evaluadoId: number;
  titulo: string;
  subtitulo: string;
  /** Si ya se envió: lo que el usuario calificó (solo lectura). */
  enviada: { puntajes: Record<string, number>; comentario: string | null; promedio: number } | null;
}) {
  const aspectos = ASPECTOS[tipo];
  const [puntajes, setPuntajes] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const completos = aspectos.every((a) => puntajes[a.clave] != null);
  const valores = enviada ? enviada.puntajes : puntajes;
  const prom = enviada ? enviada.promedio : promedio(aspectos.map((a) => puntajes[a.clave]).filter((x): x is number => x != null));

  const enviar = async () => {
    setGuardando(true);
    setError(null);
    const res = await guardarValoracion(propuestaId, objetivo, evaluadoId, puntajes, comentario);
    setGuardando(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <section className={`bg-white rounded-xl border shadow-sm overflow-hidden ${enviada ? "border-border" : "border-brand-red/30"}`}>
      <header className="px-5 py-3 border-b border-border bg-gray-50 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-card-dark">{titulo}</h2>
          <p className="text-xs text-muted">{subtitulo}</p>
        </div>
        <div className="text-right shrink-0">
          {enviada ? (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-green-100 text-green-700">Enviada</span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-red-50 text-brand-red">Pendiente</span>
          )}
          {prom != null && <p className="text-xs text-muted mt-1">Promedio: <span className="font-bold text-gray-800">{formatoNota(prom)}</span></p>}
        </div>
      </header>

      <div className="p-5 space-y-5">
        {aspectos.map((a) => (
          <div key={a.clave}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-bold text-gray-800">{a.nombre}</p>
              <span className="text-sm font-bold text-brand-red w-8 text-right">{valores[a.clave] ?? ""}</span>
            </div>
            <p className="text-xs text-muted mb-2">{a.ayuda}</p>
            <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={a.nombre}>
              {ESCALA.map((n) => {
                const elegido = valores[a.clave] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    disabled={!!enviada}
                    onClick={() => setPuntajes((p) => ({ ...p, [a.clave]: n }))}
                    className={`h-9 rounded-lg text-sm font-bold border transition-colors ${
                      elegido
                        ? "bg-brand-red border-brand-red text-white"
                        : enviada
                          ? "border-border text-gray-300 bg-white"
                          : "border-border text-gray-600 bg-white hover:border-brand-red hover:text-brand-red"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-1"><span>Muy deficiente</span><span>Excelente</span></div>
          </div>
        ))}

        {enviada ? (
          enviada.comentario && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1">Comentario</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3 whitespace-pre-line">{enviada.comentario}</p>
            </div>
          )
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Comentario (opcional)</label>
              <textarea
                rows={3}
                maxLength={LARGO_MAXIMO_COMENTARIO}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full border border-border p-3 rounded-lg text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
                placeholder="Algo que quieras destacar o que se deba mejorar"
              />
            </div>
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">Una vez enviada, la valoración no se puede cambiar.</p>
              <button
                type="button"
                onClick={enviar}
                disabled={!completos || guardando}
                className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {guardando ? "Enviando..." : "Enviar valoración"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
