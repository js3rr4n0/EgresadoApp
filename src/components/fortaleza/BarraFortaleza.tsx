// Barra del indicador de fortaleza (R3): verde al 100 %, ámbar desde el 75 % y rojo por debajo. Sin estado: sirve en
// servidor y cliente.

import { UMBRAL_FORTALEZA, nivelFortaleza } from "@/lib/fortaleza";

const ESTILO = {
  fuerte: { barra: "bg-green-600", texto: "text-green-800", etiqueta: "Fuerte" },
  suficiente: { barra: "bg-amber-500", texto: "text-amber-800", etiqueta: "Suficiente" },
  debil: { barra: "bg-brand-red", texto: "text-brand-red", etiqueta: "Débil" },
  ninguno: { barra: "bg-gray-300", texto: "text-gray-500", etiqueta: "Sin datos" },
} as const;

export default function BarraFortaleza({
  porcentaje,
  titulo,
  compacta = false,
  apilada = false,
}: {
  porcentaje: number | null;
  titulo?: string;
  compacta?: boolean;
  /** Columna angosta: título arriba y la barra con el porcentaje en una sola línea. */
  apilada?: boolean;
}) {
  const e = ESTILO[nivelFortaleza(porcentaje)];
  if (apilada) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-700 leading-tight">{titulo ?? "Fortaleza"}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${e.barra}`} style={{ width: `${porcentaje ?? 0}%` }} />
            <div className="absolute top-0 bottom-0 w-px bg-gray-500/60" style={{ left: `${UMBRAL_FORTALEZA}%` }} />
          </div>
          <span className={`shrink-0 text-xs font-bold tabular-nums ${e.texto}`}>{porcentaje == null ? "—" : `${porcentaje} %`}</span>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-bold ${compacta ? "text-xs text-gray-700" : "text-sm text-gray-800"}`}>{titulo ?? "Fortaleza"}</span>
        <span className={`font-bold tabular-nums ${compacta ? "text-xs" : "text-sm"} ${e.texto}`}>
          {porcentaje == null ? "—" : `${porcentaje} %`} <span className="font-semibold">· {e.etiqueta}</span>
        </span>
      </div>
      <div className={`relative rounded-full bg-gray-100 overflow-hidden mt-1 ${compacta ? "h-1.5" : "h-2.5"}`}>
        <div className={`h-full rounded-full transition-all ${e.barra}`} style={{ width: `${porcentaje ?? 0}%` }} />
        {/* Marca del mínimo */}
        <div className="absolute top-0 bottom-0 w-px bg-gray-500/60" style={{ left: `${UMBRAL_FORTALEZA}%` }} title={`Mínimo: ${UMBRAL_FORTALEZA} %`} />
      </div>
    </div>
  );
}
