// Mapa del estado de la propuesta (T2): línea de pasos vertical como el seguimiento de un pedido. Hechos con marca y
// fecha, el actual resaltado (rojo si le toca al egresado) y los pendientes en gris. Componente de servidor.

import Link from "next/link";
import { fechaCortaSV, horaSV } from "@/lib/fechasTexto";
import type { PasoMapa } from "@/lib/mapaPropuestaServidor";

function Marca({ estado, numero }: { estado: PasoMapa["estado"]; numero: number }) {
  if (estado === "hecho") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (estado === "accion") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white ring-4 ring-red-100">{numero}</span>;
  }
  if (estado === "actual") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-red bg-white text-sm font-bold text-brand-red ring-4 ring-red-50">{numero}</span>;
  }
  return <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-sm font-bold text-gray-400">{numero}</span>;
}

const fechaHora = (iso: string) => `${fechaCortaSV(iso)}, ${horaSV(iso)}`;

export default function MapaPropuesta({ pasos, esLider }: { pasos: PasoMapa[]; esLider: boolean }) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-muted">Seguimiento de la propuesta</p>
      <ol>
        {pasos.map((p, i) => {
          const ultimo = i === pasos.length - 1;
          const resaltado = p.estado === "actual" || p.estado === "accion";
          return (
            <li key={p.clave} className="relative flex gap-4 pb-6 last:pb-0">
              {!ultimo && (
                <span className={`absolute left-4 top-8 -ml-px h-[calc(100%-2rem)] w-0.5 ${p.estado === "hecho" ? "bg-green-600" : "bg-gray-200"}`} aria-hidden="true" />
              )}
              <div className="relative z-10 shrink-0">
                <Marca estado={p.estado} numero={i + 1} />
              </div>
              <div
                className={`min-w-0 flex-1 ${resaltado ? `rounded-xl border p-4 -mt-1 ${p.estado === "accion" ? "border-brand-red/30 bg-red-50" : "border-border bg-gray-50"}` : "pt-1"}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className={`font-bold ${p.estado === "pendiente" ? "text-gray-400" : "text-card-dark"}`}>{p.titulo}</p>
                  {p.fecha && <span className="text-xs text-muted">{fechaHora(p.fecha)}</span>}
                  {resaltado && !p.fecha && (
                    <span className={`text-xs font-bold ${p.estado === "accion" ? "text-brand-red" : "text-gray-600"}`}>
                      {p.estado === "accion" ? "Te toca a ti" : "En curso"}
                    </span>
                  )}
                </div>
                {p.detalle && <p className={`mt-0.5 text-sm ${p.estado === "pendiente" ? "text-gray-400" : "text-gray-700"}`}>{p.detalle}</p>}
                {p.eventos.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                    {p.eventos.map((e, j) => (
                      <li key={j} className="text-xs">
                        <span className="text-muted">{fechaCortaSV(e.fecha)}</span>
                        <span className={`ml-2 ${e.alerta ? "font-semibold text-brand-red" : "text-gray-700"}`}>{e.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {p.accion && (esLider || p.accion.todos) && (
                  <Link href={p.accion.href} className="mt-3 inline-flex rounded-lg bg-brand-red px-4 py-2 text-xs font-bold text-white hover:bg-brand-red-hover">
                    {p.accion.texto}
                  </Link>
                )}
                {p.accion && !esLider && !p.accion.todos && <p className="mt-2 text-xs text-gray-600">Lo hace el líder del equipo.</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
