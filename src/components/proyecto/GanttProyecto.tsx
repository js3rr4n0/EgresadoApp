// Cronograma planificado frente al real (reunión 6-nov-2026), como un diagrama de Gantt por período: la barra gris es
// lo planificado, el número es el avance acumulado al cierre del período y el borde ámbar marca lo que viene
// incompleto de un período anterior. Sin estado ni efectos: sirve en la pantalla de ejecución y en el informe.
import type { FilaGantt } from "@/lib/fichas/planTrabajo";

const colorAvance = (a: number) => (a >= 100 ? "bg-emerald-600 text-white" : a > 0 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-500");

export default function GanttProyecto({
  filas,
  periodos,
  periodoActual,
  hastaNivel = 4,
  impreso = false,
}: {
  filas: FilaGantt[];
  periodos: number;
  periodoActual: number;
  /** Último nivel que se muestra (4 = actividades; 5 incluye subactividades). */
  hastaNivel?: number;
  /** Versión para el documento: bordes simples, sin colores de fondo intensos. */
  impreso?: boolean;
}) {
  const visibles = filas.filter((f) => f.nivel <= hastaNivel);
  const borde = impreso ? "border border-gray-300" : "border border-slate-200";
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-[11px] ${borde} border-collapse`}>
        <thead className={impreso ? "bg-gray-100" : "bg-slate-50"}>
          <tr>
            <th className={`text-left px-2 py-1 ${borde} w-20`}>ID</th>
            <th className={`text-left px-2 py-1 ${borde} min-w-48`}>Nivel del plan</th>
            {Array.from({ length: periodos }, (_, i) => (
              <th key={i} className={`px-1 py-1 ${borde} w-14 text-center ${i + 1 === periodoActual ? "text-unicaes" : ""}`}>P{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => (
            <tr key={f.id} className={f.nivel <= 2 ? "font-bold" : ""}>
              <td className={`px-2 py-0.5 font-mono ${borde}`}>{f.codigo}</td>
              <td className={`px-2 py-0.5 ${borde}`} style={{ paddingLeft: `${(f.nivel - 1) * 0.75 + 0.5}rem` }}>{f.titulo || "Sin título"}</td>
              {f.celdas.map((c, i) => {
                const real = c.avance !== null && (c.planificado || c.arrastre || c.avance > 0);
                return (
                  <td key={i} className={`p-0.5 ${borde} text-center align-middle`}
                    title={`${c.planificado ? "Planificado" : "No planificado"}${c.arrastre ? " · viene de un período anterior" : ""}${c.avance !== null ? ` · ${c.avance}% al cierre` : ""}`}>
                    <div className={`h-5 rounded flex items-center justify-center ${c.planificado ? (impreso ? "bg-gray-200" : "bg-slate-200") : ""} ${c.arrastre ? "ring-2 ring-amber-400 ring-inset" : ""}`}>
                      {real && (
                        <span className={`px-1 rounded text-[10px] font-bold tabular-nums ${impreso ? "" : colorAvance(c.avance!)}`}>{c.avance}%</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-slate-500 font-semibold">
        Gris: planificado en el período · número: avance acumulado al cierre · borde ámbar: viene incompleta de un período anterior.
      </p>
    </div>
  );
}
