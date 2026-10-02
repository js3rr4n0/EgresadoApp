"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarSemanaActividades } from "@/app/actions/registrosActividad";

/** Envío de todas las actividades de la semana al asesor: se habilita solo cuando cada actividad está completa. */
export default function EnviarSemana({
  propuestaId,
  etiquetaSemana,
  pendientes,
  cantidad,
}: {
  propuestaId: number;
  etiquetaSemana: string;
  pendientes: string[];
  cantidad: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listo = pendientes.length === 0;

  const handleEnviar = async () => {
    setError(null);
    setEnviando(true);
    const res = await enviarSemanaActividades(propuestaId);
    setEnviando(false);
    setConfirmando(false);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "No se pudo enviar la semana.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="text-[11px] font-semibold text-slate-600">
          {listo ? (
            <span>
              {cantidad === 1 ? "La actividad de la semana está completa" : `Las ${cantidad} actividades de la semana están completas`}. Puede
              enviarla{cantidad === 1 ? "" : "s"} a su asesor designado.
            </span>
          ) : (
            <div className="space-y-1">
              <p className="font-extrabold text-slate-700">Para habilitar el envío de la semana falta completar:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {pendientes.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={!listo}
          className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          Enviar semana al asesor
        </button>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">{error}</div>}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Confirmar envío de la {etiquetaSemana}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se enviarán las actividades de la semana a su asesor designado para su revisión. No podrá editarlas mientras estén en
              revisión, y la semana siguiente se habilitará cuando el asesor las apruebe. La fecha de realización de las actividades
              quedará registrada con la fecha de hoy.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmando(false)}
                disabled={enviando}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                disabled={enviando}
                className="px-5 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
