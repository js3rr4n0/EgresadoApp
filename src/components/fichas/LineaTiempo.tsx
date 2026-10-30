// Resumen visual de una etapa de ejecución: períodos, subperíodos, informes, hitos y requisitos previos.
// Se recalcula con cada cambio del editor. Sin estado.
import { diasSubperiodos, type EtapaEjecucion } from "@/lib/fichas/tipos";

const COLORES_HITO = ["bg-amber-400", "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-pink-500"];

export default function LineaTiempo({ etapa }: { etapa: EtapaEjecucion }) {
  const total = Math.max(1, etapa.periodos * etapa.duracionPeriodo);
  const unidad = etapa.unidad === "dias" ? "días" : "meses";
  const subs =
    etapa.unidad === "dias" && etapa.subperiodos > 0 && etapa.duracionPeriodo >= etapa.subperiodos
      ? diasSubperiodos(etapa.duracionPeriodo, etapa.subperiodos)
      : null;
  const antes = etapa.hitos.filter((h) => h.momento === "antes");
  const durante = etapa.hitos.filter((h) => (h.momento ?? "durante") === "durante");
  const periodos = Math.max(0, Math.min(etapa.periodos, 36));
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / total) * 100))}%`;

  const datos = [
    `${total} ${unidad}`,
    `${periodos} informe${periodos === 1 ? "" : "s"}`,
    `${periodos * etapa.subperiodos} subperíodos${subs ? ` (${subs.join("/")} días)` : ""}`,
    `${etapa.registro.descripcion.min}–${etapa.registro.descripcion.max} palabras por actividad`,
    `${etapa.registro.imagenes} imágenes`,
    `${etapa.informe.paginasMinimas} págs. por informe`,
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {datos.map((d) => <span key={d} className="text-[11px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">{d}</span>)}
      </div>

      <div className="flex items-stretch gap-2">
        {antes.length > 0 && (
          <div className="shrink-0 flex flex-col justify-center gap-1 pr-2 border-r-2 border-dashed border-gray-300" aria-label="Requisitos antes de iniciar">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Antes</span>
            {antes.map((h) => (
              <span key={h.id} title={h.nombre} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 max-w-[9rem] truncate">
                ✓ {h.nombre.replace("Dictamen de aprobación ", "Dictamen ")}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Bandas de los hitos que ocurren durante la ejecución */}
          <div className="relative h-5 mb-1">
            {etapa.diasPrimerContacto !== null && etapa.unidad === "dias" && (
              <span className="absolute top-0 h-3 rounded-sm bg-teal-400" style={{ left: 0, width: pct(Math.max(etapa.diasPrimerContacto, 1)) }} title={`Primer contacto: ${etapa.diasPrimerContacto} días`} />
            )}
            {durante.map((h, i) => (
              <span key={h.id} title={`${h.nombre}: ${h.desde}–${h.hasta}`}
                className={`absolute top-0 h-3 rounded-sm ${COLORES_HITO[i % COLORES_HITO.length]}`}
                style={{ left: pct(h.desde), width: `max(6px, ${pct(Math.max(0, h.hasta - h.desde))})` }} />
            ))}
          </div>

          {/* Pista de períodos con sus subperíodos */}
          <div className="flex h-10 rounded-md overflow-hidden border border-gray-300">
            {Array.from({ length: periodos }, (_, i) => (
              <div key={i} className={`relative flex-1 min-w-0 ${i % 2 ? "bg-red-50" : "bg-red-100/70"} ${i > 0 ? "border-l-2 border-brand-red/60" : ""}`}>
                {subs && subs.slice(0, -1).map((_, k) => {
                  const acumulado = subs.slice(0, k + 1).reduce((a, b) => a + b, 0);
                  return <span key={k} className="absolute top-2 bottom-2 border-l border-dashed border-red-300" style={{ left: `${(acumulado / etapa.duracionPeriodo) * 100}%` }} />;
                })}
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-700">P{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Entregas de informe al final de cada período */}
          <div className="flex mt-1">
            {Array.from({ length: periodos }, (_, i) => (
              <div key={i} className="flex-1 min-w-0 text-right text-[10px] text-gray-500 pr-0.5 truncate">
                I{i + 1} · {etapa.unidad === "dias" ? `día ${(i + 1) * etapa.duracionPeriodo}` : `mes ${(i + 1) * etapa.duracionPeriodo}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(durante.length > 0 || etapa.diasPrimerContacto !== null) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
          {etapa.diasPrimerContacto !== null && (
            <li className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-teal-400" />Primer contacto (plazo {etapa.diasPrimerContacto} días)</li>
          )}
          {durante.map((h, i) => (
            <li key={h.id} className="flex items-center gap-1.5">
              <span className={`w-3 h-2 rounded-sm ${COLORES_HITO[i % COLORES_HITO.length]}`} />
              {h.nombre} ({h.desde}–{h.hasta}{h.requisitoDeInforme ? `, requisito del informe ${h.requisitoDeInforme}` : ""})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
