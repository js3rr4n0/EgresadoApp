import Link from "next/link";
import Paginacion from "@/components/Paginacion";
import { formatearFechaLarga } from "@/lib/periodosPasantia";
import { ACTORES, FILTROS_BITACORA, TIPOS_EVENTO, type FiltroBitacora } from "@/lib/bitacoraEventos";

export interface EventoBitacoraVista {
  id: number;
  propuestaId: number;
  actorRol: string;
  actorNombre: string | null;
  tipo: string;
  descripcion: string;
  detalle: string | null;
  dia: string;
  hora: string;
}

const ESTILO_ACTOR: Record<string, { badge: string; punto: string }> = {
  egresado: { badge: "bg-blue-50 text-blue-800 border-blue-200", punto: "bg-blue-500" },
  asesor: { badge: "bg-emerald-50 text-emerald-800 border-emerald-200", punto: "bg-emerald-600" },
  coordinador: { badge: "bg-amber-50 text-amber-900 border-amber-300", punto: "bg-amber-500" },
  admin: { badge: "bg-amber-50 text-amber-900 border-amber-300", punto: "bg-amber-500" },
  sistema: { badge: "bg-slate-100 text-slate-600 border-slate-300", punto: "bg-slate-400" },
};

const TAMANO_PAGINA = 25;

/** Línea de tiempo de la bitácora agrupada por día, con filtro por parte involucrada y paginación. */
export default function BitacoraLista({
  eventos,
  filtro,
  pagina,
  totalPaginas,
  total,
  construirHref,
  egresadoPorPropuesta,
}: {
  eventos: EventoBitacoraVista[];
  filtro: FiltroBitacora;
  pagina: number;
  totalPaginas: number;
  total: number;
  construirHref: (filtro: FiltroBitacora, pagina?: number) => string;
  /** En la vista por asesor, identifica a qué egresado corresponde cada evento. */
  egresadoPorPropuesta?: Record<number, string>;
}) {
  const dias: { dia: string; eventos: EventoBitacoraVista[] }[] = [];
  for (const e of eventos) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.dia === e.dia) ultimo.eventos.push(e);
    else dias.push({ dia: e.dia, eventos: [e] });
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm">
      <div className="flex gap-1 px-5 pt-4 border-b border-slate-200" role="tablist">
        {FILTROS_BITACORA.map((f) => (
          <Link
            key={f.id}
            href={construirHref(f.id)}
            scroll={false}
            role="tab"
            aria-selected={filtro === f.id}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
              filtro === f.id ? "border-brand-red text-brand-red" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="p-5 space-y-6">
        {dias.length === 0 ? (
          <p className="text-xs text-slate-500 font-semibold">No hay eventos registrados{filtro !== "todos" ? " para este filtro" : ""}.</p>
        ) : (
          dias.map((d) => (
            <section key={d.dia} className="space-y-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{formatearFechaLarga(d.dia)}</h3>
              <ol className="relative border-l border-slate-200 ml-1.5 space-y-4">
                {d.eventos.map((e) => {
                  const estilo = ESTILO_ACTOR[e.actorRol] || ESTILO_ACTOR.sistema;
                  return (
                    <li key={e.id} className="pl-5 relative">
                      <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${estilo.punto}`} />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                        <span className="font-mono font-bold text-slate-500">{e.hora}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${estilo.badge}`}>
                          {ACTORES[e.actorRol] || e.actorRol}
                        </span>
                        {e.actorNombre && <span className="font-bold text-slate-700">{e.actorNombre}</span>}
                        <span className="text-slate-400 font-semibold">
                          {TIPOS_EVENTO[e.tipo as keyof typeof TIPOS_EVENTO] || e.tipo}
                        </span>
                        {egresadoPorPropuesta?.[e.propuestaId] && (
                          <span className="text-slate-500 font-semibold">— {egresadoPorPropuesta[e.propuestaId]}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 font-medium mt-1">{e.descripcion}</p>
                      {e.detalle && (
                        <p className="mt-1.5 p-2.5 bg-slate-50 border-l-2 border-slate-300 rounded-r-lg text-[11px] text-slate-600 font-medium whitespace-pre-wrap">
                          {e.detalle}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}

        <Paginacion
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          totalElementos={total}
          tamanoPagina={TAMANO_PAGINA}
          construirHref={(p) => construirHref(filtro, p)}
        />
      </div>
    </div>
  );
}
