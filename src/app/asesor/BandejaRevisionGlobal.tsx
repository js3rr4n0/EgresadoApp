"use client";

import { useState } from "react";
import Link from "next/link";
import type { EntradaBandejaAsesor } from "@/app/actions/registrosActividad";

type Filtro = "todo" | "semana" | "informe" | "atrasado";

function fechaCorta(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", day: "numeric", month: "short", year: "numeric" });
}

/**
 * Bandeja global del asesor: semanas enviadas e informes por aprobar de todos sus estudiantes, ordenados por días de
 * espera, para atender primero lo más urgente sin abrir a cada estudiante.
 */
export default function BandejaRevisionGlobal({ entradas, diasPlazo }: { entradas: EntradaBandejaAsesor[]; diasPlazo: number }) {
  const [filtro, setFiltro] = useState<Filtro>("todo");

  const semanas = entradas.filter((e) => e.tipo === "semana");
  const informes = entradas.filter((e) => e.tipo === "informe");
  const atrasadas = entradas.filter((e) => e.fueraDePlazo);
  const visibles =
    filtro === "semana" ? semanas : filtro === "informe" ? informes : filtro === "atrasado" ? atrasadas : entradas;

  const filtros: { id: Filtro; label: string; total: number }[] = [
    { id: "todo", label: "Todo", total: entradas.length },
    { id: "semana", label: "Semanas", total: semanas.length },
    { id: "informe", label: "Informes", total: informes.length },
    { id: "atrasado", label: "Fuera de plazo", total: atrasadas.length },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-card-dark">Bandeja de revisión</h2>
          <p className="text-xs text-muted mt-0.5">
            Entregas de todos sus estudiantes que esperan su revisión, de la más antigua a la más reciente. Se recomienda revisarlas en
            un máximo de {diasPlazo} días.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-red-50 text-unicaes border-red-200">
            {semanas.length} semana{semanas.length === 1 ? "" : "s"}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-slate-50 text-slate-700 border-slate-200">
            {informes.length} informe{informes.length === 1 ? "" : "s"}
          </span>
          {atrasadas.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-red-100 text-red-800 border-red-300">
              {atrasadas.length} fuera de plazo
            </span>
          )}
        </div>
      </div>

      {entradas.length === 0 ? (
        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
          Está al día: no hay semanas ni informes pendientes de revisión.
        </div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-slate-200" role="tablist">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${
                  filtro === f.id ? "border-unicaes text-unicaes" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {f.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                    filtro === f.id ? "bg-red-50 text-unicaes" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.total}
                </span>
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className="text-xs text-muted font-semibold">No hay entregas en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {visibles.map((e) => {
                const proxima = !e.fueraDePlazo && e.diasEsperando >= diasPlazo - 1 && e.diasEsperando > 0;
                return (
                  <li key={e.clave} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 relative">
                    <span
                      aria-hidden
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        e.fueraDePlazo ? "bg-red-600" : proxima ? "bg-amber-500" : "bg-slate-200"
                      }`}
                    />
                    <div className="flex-1 min-w-0 pl-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            e.tipo === "semana" ? "bg-red-50 text-unicaes" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {e.tipo === "semana" ? "Semana" : "Informe"}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">{e.titulo}</span>
                        <span className="text-[11px] text-slate-500 font-semibold">· {e.detalle}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-1 truncate">
                        {e.egresado.nombreCompleto}
                        <span className="font-mono font-semibold text-slate-400"> {e.egresado.carnet}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-1">
                      <div className="text-right">
                        <p
                          className={`text-xs font-extrabold ${
                            e.fueraDePlazo ? "text-red-700" : proxima ? "text-amber-700" : "text-slate-700"
                          }`}
                        >
                          {e.diasEsperando === 0 ? "Enviada hoy" : `${e.diasEsperando} día${e.diasEsperando === 1 ? "" : "s"} esperando`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">Enviada el {fechaCorta(e.enviadoEn)}</p>
                      </div>
                      <Link
                        href={e.href}
                        className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors whitespace-nowrap"
                      >
                        {e.tipo === "semana" ? "Revisar semana" : "Revisar informe"}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
