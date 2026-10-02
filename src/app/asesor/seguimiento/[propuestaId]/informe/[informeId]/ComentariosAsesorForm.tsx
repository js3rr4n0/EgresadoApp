"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarComentariosInforme } from "@/app/actions/comentariosAsesor";
import { contarPalabras } from "@/lib/reglasRegistroActividad";
import {
  CATEGORIAS_COMENTARIO,
  COMENTARIO_MIN_PALABRAS,
  COMENTARIO_MAX_PALABRAS,
  COMENTARIO_GENERAL_MAX_PALABRAS,
  EJEMPLO_COMENTARIOS,
  PROPOSITO_COMENTARIOS,
  validarComentariosCompletos,
  type ComentariosDecanato,
} from "@/lib/comentariosAsesor";
import AyudaEjemplo from "@/components/AyudaEjemplo";

const areaTexto =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none disabled:bg-slate-50 disabled:text-slate-600";

/** Comentarios del asesor para el decanato: una respuesta por categoría del documento institucional y un comentario general opcional. */
export default function ComentariosAsesorForm({
  informeId,
  inicial,
  editable,
  notasSemanales,
}: {
  informeId: number;
  inicial: ComentariosDecanato;
  editable: boolean;
  notasSemanales: { semana: number; nota: string }[];
}) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() =>
    Object.fromEntries(CATEGORIAS_COMENTARIO.map((c) => [c.id, inicial.respuestas[c.id] || ""]))
  );
  const [general, setGeneral] = useState(inicial.general || "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const pendientes = validarComentariosCompletos({ respuestas, general });
  const completos = pendientes.length === 0;

  const guardar = async () => {
    setMensaje(null);
    setGuardando(true);
    const res = await guardarComentariosInforme(informeId, { respuestas, general });
    setGuardando(false);
    if (res.success) {
      setMensaje({ tipo: "ok", texto: completos ? "Comentarios guardados y completos." : "Borrador de comentarios guardado." });
      router.refresh();
    } else {
      setMensaje({ tipo: "error", texto: res.error || "No se pudieron guardar los comentarios." });
    }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-card-dark">Comentarios del asesor para el decanato</h2>
          <p className="text-[11px] text-muted font-semibold mt-0.5">{PROPOSITO_COMENTARIOS}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 ${
            completos ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-300"
          }`}
        >
          {completos ? "Completos" : "Pendientes"}
        </span>
      </div>

      <AyudaEjemplo ejemplo={EJEMPLO_COMENTARIOS} />

      {notasSemanales.length > 0 && (
        <details className="bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
          <summary className="cursor-pointer select-none px-4 py-2.5 font-extrabold text-slate-700">
            Sus notas de seguimiento semanal de este período ({notasSemanales.length})
          </summary>
          <ul className="px-4 pb-3 space-y-1.5 text-slate-600 font-medium">
            {notasSemanales.map((n) => (
              <li key={n.semana}>
                <span className="font-bold text-slate-700">Semana {n.semana}:</span> {n.nota}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-4">
        {CATEGORIAS_COMENTARIO.map((c, i) => {
          const n = contarPalabras(respuestas[c.id] || "");
          const ok = n >= COMENTARIO_MIN_PALABRAS && n <= COMENTARIO_MAX_PALABRAS;
          return (
            <div key={c.id} className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <label htmlFor={`cat-${c.id}`} className="text-xs font-bold text-slate-800">
                  {i + 1}. {c.pregunta}
                </label>
                <span className={`text-[11px] font-extrabold shrink-0 ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                  {n} / {COMENTARIO_MAX_PALABRAS}
                </span>
              </div>
              <textarea
                id={`cat-${c.id}`}
                rows={3}
                value={respuestas[c.id] || ""}
                disabled={!editable}
                onChange={(e) => setRespuestas((prev) => ({ ...prev, [c.id]: e.target.value }))}
                lang="es"
                spellCheck
                className={areaTexto}
              />
            </div>
          );
        })}

        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <label htmlFor="cat-general" className="text-xs font-bold text-slate-800">
              Comentario general (opcional): información importante adicional que desee comunicar
            </label>
            <span className="text-[11px] font-extrabold shrink-0 text-slate-500">
              {contarPalabras(general)} / {COMENTARIO_GENERAL_MAX_PALABRAS}
            </span>
          </div>
          <textarea
            id="cat-general"
            rows={5}
            value={general}
            disabled={!editable}
            onChange={(e) => setGeneral(e.target.value)}
            lang="es"
            spellCheck
            className={areaTexto}
          />
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold ${
            mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {editable && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <p className="text-[11px] text-muted font-semibold">
            {completos
              ? "Los comentarios están completos. Guárdelos antes de aprobar el informe."
              : `Para aprobar el informe, cada categoría debe tener entre ${COMENTARIO_MIN_PALABRAS} y ${COMENTARIO_MAX_PALABRAS} palabras.`}
          </p>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs disabled:opacity-50 shrink-0"
          >
            {guardando ? "Guardando..." : "Guardar comentarios"}
          </button>
        </div>
      )}
    </div>
  );
}
