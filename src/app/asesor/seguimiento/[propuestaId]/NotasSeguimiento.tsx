"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarNotaSeguimiento } from "@/app/actions/comentariosAsesor";
import { CATEGORIAS_COMENTARIO, type CategoriaComentario, type NotaSemanal } from "@/lib/comentariosAsesor";

const area =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none";

/**
 * Notas de seguimiento semanal del asesor (opcionales), con las mismas preguntas de los comentarios del período.
 * Lo que se guarda semana a semana se acumula, en orden, en los comentarios oficiales del informe mensual.
 */
export default function NotasSeguimiento({
  propuestaId,
  semanaActual,
  notas,
}: {
  propuestaId: number;
  semanaActual: { periodo: number; semana: number } | null;
  notas: (NotaSemanal & { periodo: number })[];
}) {
  const router = useRouter();
  const notaActual = semanaActual ? notas.find((n) => n.periodo === semanaActual.periodo && n.semana === semanaActual.semana) : undefined;
  const [respuestas, setRespuestas] = useState<Partial<Record<CategoriaComentario, string>>>(notaActual?.respuestas ?? {});
  const [general, setGeneral] = useState(notaActual?.general ?? "");
  const [abierta, setAbierta] = useState<CategoriaComentario | "general" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const respondidas = CATEGORIAS_COMENTARIO.filter((c) => (respuestas[c.id] || "").trim()).length + (general.trim() ? 1 : 0);

  const guardar = async () => {
    if (!semanaActual) return;
    setMensaje(null);
    setGuardando(true);
    const res = await guardarNotaSeguimiento(propuestaId, semanaActual.periodo, semanaActual.semana, { respuestas, general });
    setGuardando(false);
    setMensaje(
      res.success
        ? "Nota guardada. Se sumará a los comentarios del informe de este período."
        : res.error || "No se pudo guardar la nota."
    );
    if (res.success) router.refresh();
  };

  const anteriores = notas
    .filter((n) => !semanaActual || n.periodo !== semanaActual.periodo || n.semana !== semanaActual.semana)
    .sort((a, b) => b.periodo - a.periodo || b.semana - a.semana);

  const pregunta = (id: CategoriaComentario | "general", indice: number | null, texto: string, valor: string, onChange: (v: string) => void) => {
    const lleno = valor.trim().length > 0;
    const expandida = abierta === id || lleno;
    return (
      <li key={id} className={`rounded-lg border ${lleno ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}>
        <button
          type="button"
          onClick={() => setAbierta(abierta === id ? null : id)}
          aria-expanded={expandida}
          className="w-full flex items-start justify-between gap-3 px-3 py-2 text-left"
        >
          <span className="text-[11px] font-bold text-slate-700">
            {indice !== null && `${indice}. `}
            {texto}
          </span>
          <span className={`text-[10px] font-extrabold shrink-0 ${lleno ? "text-emerald-700" : "text-slate-400"}`}>
            {lleno ? "Con nota" : "Agregar"}
          </span>
        </button>
        {expandida && (
          <div className="px-3 pb-3">
            <textarea
              rows={2}
              value={valor}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Lo que observó o conversó con el egresado esta semana."
              lang="es"
              spellCheck
              className={area}
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
      <div>
        <h2 className="text-sm font-extrabold text-card-dark">Notas de seguimiento semanal (opcional)</h2>
        <p className="text-[11px] text-muted font-semibold mt-0.5">
          Responda, si lo desea, las mismas preguntas de los comentarios del asesor con lo que observó en la semana. Las notas se van
          acumulando en orden en los comentarios del informe mensual, que son obligatorios: al cierre del período solo tendrá que
          revisarlos y completarlos.
        </p>
      </div>

      {semanaActual ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-slate-400">
            Período {semanaActual.periodo}, Semana {semanaActual.semana} · {respondidas} de {CATEGORIAS_COMENTARIO.length + 1} preguntas con nota
          </p>
          <ul className="space-y-1.5">
            {CATEGORIAS_COMENTARIO.map((c, i) =>
              pregunta(c.id, i + 1, c.pregunta, respuestas[c.id] || "", (v) => setRespuestas((prev) => ({ ...prev, [c.id]: v })))
            )}
            {pregunta("general", null, "Otras observaciones de la semana", general, setGeneral)}
          </ul>
          <div className="flex items-center justify-end gap-3">
            {mensaje && <span className="text-[11px] font-semibold text-slate-500">{mensaje}</span>}
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-bold disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar nota"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted font-semibold">El estudiante ya completó su cronograma.</p>
      )}

      {anteriores.length > 0 && (
        <details className="text-[11px]">
          <summary className="cursor-pointer select-none font-bold text-slate-600">Notas anteriores ({anteriores.length})</summary>
          <ul className="mt-2 space-y-2 text-slate-600 font-medium">
            {anteriores.map((n) => (
              <li key={`${n.periodo}-${n.semana}`} className="space-y-0.5">
                <p className="font-bold text-slate-700">
                  Período {n.periodo}, Semana {n.semana}
                </p>
                {CATEGORIAS_COMENTARIO.filter((c) => n.respuestas[c.id]).map((c) => (
                  <p key={c.id}>
                    <span className="font-semibold text-slate-700">{c.titulo}:</span> {n.respuestas[c.id]}
                  </p>
                ))}
                {n.general && (
                  <p>
                    <span className="font-semibold text-slate-700">Otras observaciones:</span> {n.general}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
