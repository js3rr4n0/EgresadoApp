"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarNotaSeguimiento } from "@/app/actions/comentariosAsesor";

/**
 * Notas de seguimiento semanal del asesor (opcionales): contacto con el egresado durante la semana y su opinión.
 * Se muestran como referencia al redactar los comentarios del informe al cierre del período.
 */
export default function NotasSeguimiento({
  propuestaId,
  semanaActual,
  notas,
}: {
  propuestaId: number;
  semanaActual: { periodo: number; semana: number } | null;
  notas: { periodo: number; semana: number; nota: string }[];
}) {
  const router = useRouter();
  const notaActual = semanaActual
    ? notas.find((n) => n.periodo === semanaActual.periodo && n.semana === semanaActual.semana)?.nota || ""
    : "";
  const [texto, setTexto] = useState(notaActual);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = async () => {
    if (!semanaActual) return;
    setMensaje(null);
    setGuardando(true);
    const res = await guardarNotaSeguimiento(propuestaId, semanaActual.periodo, semanaActual.semana, texto);
    setGuardando(false);
    setMensaje(res.success ? "Nota guardada." : res.error || "No se pudo guardar la nota.");
    if (res.success) router.refresh();
  };

  const anteriores = notas
    .filter((n) => !semanaActual || n.periodo !== semanaActual.periodo || n.semana !== semanaActual.semana)
    .sort((a, b) => b.periodo - a.periodo || b.semana - a.semana);

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
      <div>
        <h2 className="text-sm font-extrabold text-card-dark">Notas de seguimiento semanal (opcional)</h2>
        <p className="text-[11px] text-muted font-semibold mt-0.5">
          Registre los contactos que tuvo con el egresado durante la semana y su opinión. Le servirán de base para los comentarios
          del informe, que son obligatorios al cierre de cada período.
        </p>
      </div>

      {semanaActual ? (
        <div className="space-y-2">
          <label htmlFor="nota-semanal" className="block text-[10px] font-bold uppercase text-slate-400">
            Mes {semanaActual.periodo}, Semana {semanaActual.semana}
          </label>
          <textarea
            id="nota-semanal"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ejemplo: reunión virtual con el egresado; comenta avances en la documentación y dificultades con..."
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-brand-red outline-none resize-none"
          />
          <div className="flex items-center justify-end gap-3">
            {mensaje && <span className="text-[11px] font-semibold text-slate-500">{mensaje}</span>}
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold disabled:opacity-50"
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
          <ul className="mt-2 space-y-1.5 text-slate-600 font-medium">
            {anteriores.map((n) => (
              <li key={`${n.periodo}-${n.semana}`}>
                <span className="font-bold text-slate-700">
                  Mes {n.periodo}, Semana {n.semana}:
                </span>{" "}
                {n.nota}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
