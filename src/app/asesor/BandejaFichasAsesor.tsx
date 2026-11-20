// Bandeja del asesor para proyecto e investigación (recorrido integral, H21): lo que espera su revisión en todas sus
// propuestas con ficha, de lo más antiguo a lo más reciente.
import Link from "next/link";
import type { EntradaBandejaFicha, TipoBandejaFicha } from "@/app/actions/bandejaFichas";

const TIPO: Record<TipoBandejaFicha, { etiqueta: string; boton: string; clase: string }> = {
  plan: { etiqueta: "Plan", boton: "Revisar", clase: "bg-indigo-50 text-indigo-800" },
  registro: { etiqueta: "Registro", boton: "Revisar", clase: "bg-red-50 text-unicaes" },
  informe: { etiqueta: "Informe", boton: "Revisar informe", clase: "bg-slate-100 text-slate-700" },
  objetivo: { etiqueta: "Objetivo", boton: "Revisar", clase: "bg-sky-50 text-sky-800" },
  informe_final: { etiqueta: "Informe final", boton: "Revisar", clase: "bg-emerald-50 text-emerald-800" },
};

const fechaCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", day: "numeric", month: "short", year: "numeric" }) : "—";

export default function BandejaFichasAsesor({ entradas, diasPlazo }: { entradas: EntradaBandejaFicha[]; diasPlazo: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-card-dark">Por revisar: proyectos e investigaciones</h2>
          <p className="text-xs text-muted mt-0.5">
            Planes y protocolos enviados, registros de la ejecución, informes del período, productos por objetivo y capítulos del informe final que
            esperan su revisión, de lo más antiguo a lo más reciente.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-slate-50 text-slate-700 border-slate-200 shrink-0">
          {entradas.length} pendiente{entradas.length === 1 ? "" : "s"}
        </span>
      </div>
      {entradas.length === 0 ? (
        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold">
          Está al día: no hay nada pendiente de revisión en sus proyectos e investigaciones.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {entradas.map((e) => {
            const atrasada = e.diasEsperando > diasPlazo;
            const t = TIPO[e.tipo];
            return (
              <li key={e.clave} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 relative">
                <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${atrasada ? "bg-red-600" : "bg-slate-200"}`} />
                <div className="flex-1 min-w-0 pl-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${t.clase}`}>{t.etiqueta}</span>
                    <span className="text-sm font-extrabold text-slate-900">{e.titulo}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">· {e.detalle}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1 truncate">
                    {e.modalidad === "investigacion" ? "Investigación" : "Proyecto"} · {e.egresado.nombreCompleto}
                    <span className="font-mono font-semibold text-slate-400"> {e.egresado.carnet}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-1">
                  <div className="text-right">
                    <p className={`text-xs font-extrabold ${atrasada ? "text-red-700" : "text-slate-700"}`}>
                      {e.diasEsperando === 0 ? "Enviado hoy" : `${e.diasEsperando} día${e.diasEsperando === 1 ? "" : "s"} esperando`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">Enviado el {fechaCorta(e.enviadoEn)}</p>
                  </div>
                  <Link href={e.href} className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors whitespace-nowrap">
                    {t.boton}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
